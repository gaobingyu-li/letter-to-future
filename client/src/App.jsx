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
  const [logs, setLogs] = useState([]);
  const [logsError, setLogsError] = useState('');
  const [activeTab, setActiveTab] = useState('letters');
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

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
      setLogsError('');
    } catch (error) {
      console.error('获取投递日志失败:', error);
      setLogs([]);
      setLogsError('投递日志表尚未创建，请先执行 Supabase 迁移 SQL。');
    }
  };

  useEffect(() => {
    fetchLetters();
    fetchLogs();
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
      fetchLogs();
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
          <div className="flex items-center gap-2 px-2">
            <button
              type="button"
              onClick={() => setActiveTab('letters')}
              className={`px-3 py-1 rounded-full text-sm ${activeTab === 'letters' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              时光信箱
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded-full text-sm ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              投递日志
            </button>
          </div>

          {activeTab === 'letters' && (
            <div className="space-y-4">
              {letters.length === 0 ? (
                <p className="text-gray-500 text-center py-8">信箱还是空的，快去写第一封信吧！</p>
              ) : (
                letters.map((letter) => (
                  <div key={letter.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 break-words mb-1">{letter.content}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
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
                    <div className="text-xs text-gray-600">
                      <span className="mr-4">失败重试次数: {letter.retry_count || 0}</span>
                      {letter.last_error && <span className="text-red-600">最近错误: {letter.last_error}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              {logsError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{logsError}</p>
              )}
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">还没有投递日志。</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-sm">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <span className="font-medium">信件ID: {log.letter_id}</span>
                      <span>尝试次数: {log.attempt_no}</span>
                      <span className={log.result === 'success' ? 'text-green-700' : 'text-red-700'}>
                        结果: {log.result}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      时间: {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </div>
                    {log.error_message && (
                      <div className="text-xs text-red-600 mt-1 break-words">错误: {log.error_message}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
