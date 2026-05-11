const { createClient } = require('@supabase/supabase-js'); }

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK;

exports.handler = async function(event, context) {}
  const CRON_SECRET = process.env.CRON_SECRET;
  
  // 兼容不同的 Authorization 获取方式
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {}
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }; }) }
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
      const message = `📬 收到一封来自过去的信：\n\n${letter.content}\n\n---\n写于: ${new Date(letter.created_at).toLocaleString('zh-CN')}`;
      
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

    return {  }
      statusCode: 200, 
      body: JSON.stringify({ success: true, processed: processedCount })  })
    };
  } catch (err) {}
    return {  }
      statusCode: 500, 
      body: JSON.stringify({ error: err.message })  })
    };
  }
}
