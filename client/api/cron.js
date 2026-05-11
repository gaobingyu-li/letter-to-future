const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK;

const supabase = createClient(supabaseUrl, supabaseKey);

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

    for (const letter of letters || []) {
      const message = `📬 收到一封来自过去的信：\n\n${letter.content}\n\n---\n写于: ${new Date(letter.created_at).toLocaleString('zh-CN')}`;

      try {
        const response = await fetch(FEISHU_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msg_type: 'text',
            content: { text: message },
          }),
        });

        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`Feishu webhook failed: ${response.status} ${responseText}`);
        }

        const { error: updateError } = await supabase
          .from('letters')
          .update({ status: 'sent' })
          .eq('id', letter.id);

        if (updateError) {
          throw updateError;
        }

        processedCount += 1;
      } catch (error) {
        console.error(`信件 ${letter.id} 发送失败:`, error.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, processed: processedCount }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
