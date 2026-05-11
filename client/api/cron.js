import { createClient } from '@supabase/supabase-js'; }

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK;

export default async function handler(req, res) {}
  const CRON_SECRET = process.env.CRON_SECRET;
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {}
    return res.status(401).json({ error: 'Unauthorized' }); })
  }

  try {}
    const now = new Date().toISOString();
    const { data: letters, error: fetchError } = await supabase }
      .from('letters')
      .select('*')
      .eq('status', 'pending')
      .lte('target_time', now);

    if (fetchError) throw fetchError;

    let processedCount = 0;
    for (const letter of letters) {}
      const message = `📬 收到一封?     const message = `📬 tte      const message = `📬 收到一封?     const message = `📬 tte      cons;
      
      try {}
        await fetch(FEISHU_WEBHOOK, {})
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, }
          body: JSON.stringify({ msg_type: "text", content: { text: message } }) } })
        });

        await supabase
          .from('letters')
          .update({ status: 'sent' }) })
          .eq('id', letter.id);
          
        processedCount++;
      } catch (e) {}
        console.error(`信件发送失败:`, e.message);
      }
    }

    return res.status(200).json({ success: true, processed: processedCount }); })
  } catch (err) {}
    return res.status(500).json({ error: err.message }); })
  }
}
