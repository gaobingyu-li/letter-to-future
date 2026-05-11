import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, Clock, Mail, CheckCircle, Clock3 } from 'lucide-react';
import { format } from 'date-fns';

// 前端直连 Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [content, setContent] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLetters = async () => {
    try {
      const { data, error } = await supabase
        .from('letters')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setLetters(data || []);
    } catch (error) {
      console.error('获取信件失败:', error);
    }
  };

  useEffect(() => {
    fetchLetters();
    const defaultTime = new Date(Date.now() + 5 * 60000);
    defaultTime.setMinutes(defaultTime.getMinutes() - defaultTime.getTimezoneOffset());
    setTargetTime(defaultTime.toISOString().slice(0, 16));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !targetTime) {
      alert('请填写信件内容和发送时间！');
      return;
    }

    setLoading(true);
    try {
      const isoTime = new Date(targetTime).toISOString();
      const { error } = await supabase
        .from('letters')
        .insert([{ content, target_time: isoTime, status: 'pending' }]);

      if (error) throw error;
      
      setContent('');
      fetchLetters();
      alert('投递成功！');
    } catch (error) {
      console.error('发送失败:', error);
      alert('发送失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Mail className="w-8 h-8 text-blue-500" />
            给未来的自己一封信
          </h1>
          <p className="mt-2 text-gray-600">写下你想说的话，设定一个时间，到时候见。</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">信件内容</label>
              <textarea
                rows="6"
                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-4 bg-gray-50 border outline-none transition-colors"
                placeholder="亲爱的未来的我..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  送达时间
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-gray-50 border outline-none"
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? '投递中...' : (
                  <><Send className="w-4 h-4" />封好，投递</>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 px-2">时光信箱</h2>
          <div className="space-y-4">
            {letters.length === 0 ? (
              <p className="text-gray-500 text-center py-8">信箱还是空的，快去写第一封信吧！</p>
            ) : (
              letters.map((letter) => (
                <div key={letter.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 truncate mb-1">{letter.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>创建于: {format(new Date(letter.created_at), 'yyyy-MM-dd HH:mm')}</span>
                      <span>预计送达: {format(new Date(letter.target_time), 'yyyy-MM-dd HH:mm')}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {letter.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />已送达
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Clock3 className="w-3 h-3" />等待中
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;