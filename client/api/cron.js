import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Vercel Serverless Function - 用于 GitHub Actions 定时触发
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 飞书 Webhook（可以配置在 Vercel 环境变量中）
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK || 'https://open.feishu.cn/open-apis/bot/v2/hook/8d331a00-4129-4e61-961e-14384ffb56da';

export default async function handler(req, res) {
  // 安全校验：只允许带有正确 Secret 的请求触发（防止被别人恶意刷接口）
  const CRON_SECRET = process.env.CRON_SECRET;
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();
    
    // 1. 从 Supabase 查询所有待发送且时间已到的信件
    const { data: letters, error: fetchError } = await supabase
      .from('letters')
      .select('*')
      .eq('status', 'pending')
      .lte('target_time', now);

    if (fetchError) throw fetchError;

    let processedCount = 0;

    // 2. 遍历信件并推送到飞书
    for (const letter of letters) {
      const message = `📬 收到一封来自过去的信：\n\n${letter.content}\n\n---\n写于: ${new Date(letter.created_at).toLocaleString('zh-CN')}`;
      
      try {
        await axios.post(FEISHU_WEBHOOK, {
          msg_type: "text",
          content: { text: message }
        });

        // 3. 推送成功后，更新 Supabase 中的状态为 'sent'
        await supabase
          .from('letters')
          .update({ status: 'sent' })
          .eq('id', letter.id);
          
        processedCount++;
      } catch (sendError) {
        console.error(`信件 ${letter.id} 发送失败:`, sendError.message);
        // 如果发送失败，状态依然是 pending，下次 cron 还会继续重试！
      }
    }

    return res.status(200).json({ success: true, processed: processedCount, time: now });
  } catch (err) {
    console.error('Cron Error:', err);
    return res.status(500).json({ error: err.message });
  }
}