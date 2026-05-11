import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function - 用于处理信件的查询与保存
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // 处理跨域请求 (CORS)，允许前端本地开发调用
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. 获取所有信件 (倒序)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  } 
  
  // 2. 写一封新信
  if (req.method === 'POST') {
    const { content, target_time } = req.body;
    if (!content || !target_time) {
      return res.status(400).json({ error: '信件内容和目标时间不能为空' });
    }

    const { data, error } = await supabase
      .from('letters')
      .insert([{ content, target_time, status: 'pending' }])
      .select();
      
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data[0]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}