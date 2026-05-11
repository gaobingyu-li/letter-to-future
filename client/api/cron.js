const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK;

const supabase = createClient(supabaseUrl, supabaseKey);

function formatBeijingTime(value) {
  return new Date(value).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  });
}

async function insertDeliveryLog({ letterId, attemptNo, result, errorMessage }) {
  const payload = {
    letter_id: letterId,
    attempt_no: attemptNo,
    result,
    error_message: errorMessage || null,
  };

  const { error } = await supabase.from('delivery_logs').insert([payload]);
  if (error) {
    throw error;
  }
}

exports.handler = async function (event) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization;

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    const now = new Date().toISOString();
    const { data: letters, error: fetchError } = await supabase
      .from('letters')
      .select('*')
      .eq('status', 'pending')
      .lte('target_time', now);

    if (fetchError) {
      throw fetchError;
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const letter of letters || []) {
      const retryCount = Number(letter.retry_count || 0);
      const attemptNo = retryCount + 1;
      const message = `📬 收到一封来自过去的信：\n\n${letter.content}\n\n---\n写于: ${formatBeijingTime(letter.created_at)} (UTC+8)`;

      try {
        const response = await fetch(FEISHU_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msg_type: 'text',
            content: { text: message },
          }),
        });
        const responseText = await response.text();
        let responseJson = null;

        try {
          responseJson = responseText ? JSON.parse(responseText) : null;
        } catch (parseError) {
          // keep raw text for diagnostics
        }

        if (!response.ok) {
          throw new Error(`Feishu webhook failed: ${response.status} ${responseText}`);
        }

        // 飞书机器人常见失败是 HTTP 200 但业务码非 0（如关键词校验失败）
        const statusCode =
          responseJson?.StatusCode ??
          responseJson?.code ??
          responseJson?.Code ??
          0;
        const statusMessage =
          responseJson?.StatusMessage ??
          responseJson?.msg ??
          responseJson?.message ??
          '';

        if (statusCode !== 0) {
          throw new Error(
            `Feishu business error: code=${statusCode}, message=${statusMessage || responseText}`
          );
        }

        const { error: updateError } = await supabase
          .from('letters')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', letter.id);

        if (updateError) {
          throw updateError;
        }

        try {
          await insertDeliveryLog({
            letterId: letter.id,
            attemptNo,
            result: 'success',
            errorMessage: null,
          });
        } catch (logError) {
          console.error(`信件 ${letter.id} 成功日志写入失败:`, logError.message);
        }

        processedCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error(`信件 ${letter.id} 发送失败:`, error.message);

        const { error: updateError } = await supabase
          .from('letters')
          .update({
            retry_count: retryCount + 1,
            last_error: error.message,
          })
          .eq('id', letter.id);

        if (updateError) {
          console.error(`信件 ${letter.id} 更新重试计数失败:`, updateError.message);
        }

        try {
          await insertDeliveryLog({
            letterId: letter.id,
            attemptNo,
            result: 'failed',
            errorMessage: error.message,
          });
        } catch (logError) {
          console.error(`信件 ${letter.id} 失败日志写入失败:`, logError.message);
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processed: processedCount,
        failed: failedCount,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
