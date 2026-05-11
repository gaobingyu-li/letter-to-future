const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !FEISHU_WEBHOOK) {
  console.error(
    "Missing required env: SUPABASE_URL, SUPABASE_ANON_KEY, FEISHU_WEBHOOK"
  );
  process.exit(1);
}

const apiBase = `${SUPABASE_URL}/rest/v1`;
const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

function formatBeijingTime(value) {
  return new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...supabaseHeaders,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text}`);
  }

  return payload;
}

async function insertDeliveryLog({ letterId, attemptNo, result, errorMessage }) {
  await supabaseRequest("/delivery_logs", {
    method: "POST",
    body: JSON.stringify([
      {
        letter_id: letterId,
        attempt_no: attemptNo,
        result,
        error_message: errorMessage || null,
      },
    ]),
  });
}

function parseFeishuResult(rawText) {
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    return { ok: false, code: -1, message: `Invalid JSON: ${rawText}` };
  }

  const code = data?.StatusCode ?? data?.code ?? data?.Code ?? -1;
  const message = data?.StatusMessage ?? data?.msg ?? data?.message ?? "";
  return { ok: code === 0, code, message: message || rawText };
}

async function main() {
  const nowIso = new Date().toISOString();
  const nowQuery = encodeURIComponent(nowIso);
  const letters = await supabaseRequest(
    `/letters?select=id,content,created_at,retry_count,status,target_time&status=eq.pending&target_time=lte.${nowQuery}`
  );

  let processed = 0;
  let failed = 0;

  for (const letter of letters || []) {
    const retryCount = Number(letter.retry_count || 0);
    const attemptNo = retryCount + 1;
    const message = `📬 收到一封来自过去的信：\n\n${letter.content}\n\n---\n写于: ${formatBeijingTime(letter.created_at)} (UTC+8)`;

    try {
      const feishuResp = await fetch(FEISHU_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg_type: "text",
          content: { text: message },
        }),
      });

      const feishuText = await feishuResp.text();
      if (!feishuResp.ok) {
        throw new Error(`Feishu HTTP ${feishuResp.status}: ${feishuText}`);
      }

      const feishuResult = parseFeishuResult(feishuText);
      if (!feishuResult.ok) {
        throw new Error(
          `Feishu business error: code=${feishuResult.code}, message=${feishuResult.message}`
        );
      }

      await supabaseRequest(`/letters?id=eq.${letter.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
        }),
      });

      await insertDeliveryLog({
        letterId: letter.id,
        attemptNo,
        result: "success",
        errorMessage: null,
      });

      processed += 1;
    } catch (error) {
      failed += 1;
      const errorMessage = error instanceof Error ? error.message : String(error);

      try {
        await supabaseRequest(`/letters?id=eq.${letter.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            retry_count: retryCount + 1,
            last_error: errorMessage,
          }),
        });
      } catch (updateErr) {
        console.error(`Failed to update retry_count for letter ${letter.id}:`, updateErr);
      }

      try {
        await insertDeliveryLog({
          letterId: letter.id,
          attemptNo,
          result: "failed",
          errorMessage,
        });
      } catch (logErr) {
        console.error(`Failed to write delivery log for letter ${letter.id}:`, logErr);
      }
    }
  }

  console.log(JSON.stringify({ success: true, processed, failed }));
}

main().catch((error) => {
  console.error("Cron execution failed:", error);
  process.exit(1);
});
