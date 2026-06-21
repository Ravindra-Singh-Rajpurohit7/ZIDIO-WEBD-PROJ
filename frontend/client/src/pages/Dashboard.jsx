import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiCall from '../services/api';
import { useToast } from '../context/ToastContext';
import { Video, Keyboard, Plus, Calendar, ArrowRight, Loader2, Sparkles, BookOpen } from 'lucide-react';

const Dashboard = () => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingCode, setMeetingCode] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Summary modal state hooks
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [activeSummary, setActiveSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiCall('/api/meetings/history');
        setHistory(data);
      } catch (err) {
        console.error('Failed to load meeting history:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const data = await apiCall('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({ title: meetingTitle || 'Quick Video Meet' }),
      });
      showToast('Meeting created successfully!', 'success');
      navigate(`/room/${data.meetingId}`);
    } catch (err) {
      showToast(err.message || 'Failed to create meeting.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (!meetingCode.trim()) {
      showToast('Please enter a meeting code.', 'error');
      return;
    }
    // Clean code configuration
    const cleanedCode = meetingCode.trim().replace(/\s+/g, '-');
    navigate(`/room/${cleanedCode}`);
  };

  const handleViewSummary = async (meetingId, title) => {
    setSummaryLoading(true);
    setShowSummaryModal(true);
    setActiveSummary({ title, summary: '', actionItems: [] });
    try {
      const data = await apiCall(`/api/ai/summary/${meetingId}`);
      setActiveSummary({ title, ...data });
    } catch (err) {
      setActiveSummary({
        title,
        summary: 'No AI Summary has been generated yet for this session. Summaries can be triggered from inside the video meeting room once chat logs have been created.',
        actionItems: []
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome banner */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center justify-center md:justify-start gap-2 bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">
          Collaborate & Connect
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Instantly launch WebRTC meetings, chat, and generate summaries with AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Create and Join cards + History logs */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Card */}
            <div className="p-6 rounded-3xl shadow-xl glass-panel flex flex-col justify-between">
              <div>
                <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 w-fit mb-4">
                  <Plus className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Start Meeting</h2>
                <p className="text-xs text-slate-400 mt-1 mb-6">Create a meeting code and invite your peers</p>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <input
                  type="text"
                  placeholder="Meeting Title (optional)"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create and Join'}
                </button>
              </form>
            </div>

            {/* Join Card */}
            <div className="p-6 rounded-3xl shadow-xl glass-panel flex flex-col justify-between">
              <div>
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 w-fit mb-4">
                  <Keyboard className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Join Room</h2>
                <p className="text-xs text-slate-400 mt-1 mb-6">Enter an existing invitation room code</p>
              </div>

              <form onSubmit={handleJoinMeeting} className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter code (e.g. abc-defg-hij)"
                  required
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  Join Room <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* History Details */}
          <div className="p-6 rounded-3xl shadow-xl glass-panel">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Meeting History
            </h2>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No meeting history recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Title / Code</th>
                      <th className="pb-3 font-semibold">Host</th>
                      <th className="pb-3 font-semibold">Participants</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                    {history.map((meet) => (
                      <tr key={meet._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-4 pr-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{meet.title}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{meet.meetingId}</div>
                        </td>
                        <td className="py-4 text-slate-600 dark:text-slate-350">{meet.host?.name || 'Unknown'}</td>
                        <td className="py-4 text-slate-500">{meet.participants?.length || 1} joined</td>
                        <td className="py-4 text-xs text-slate-400">
                          {new Date(meet.scheduledAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleViewSummary(meet.meetingId, meet.title)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 py-1.5 px-3 rounded-lg hover:bg-brand-500/10 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Summary
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Info Guides */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl shadow-xl glass-panel bg-gradient-to-b from-brand-500/5 to-indigo-500/5 border border-brand-500/10">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-155 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-500" />
              IntellMeet Guide
            </h3>
            <ul className="space-y-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <li className="flex gap-2">
                <span className="font-black text-brand-500">1.</span>
                <span>Click <strong>Create and Join</strong> to start a video session instantly.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-black text-brand-500">2.</span>
                <span>Copy the generated room code from the URL or screen and share it with peers.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-black text-brand-500">3.</span>
                <span>Use the chat sidebar to send messages. Once chat logs are active, hit the <strong>AI Summary</strong> button inside the meeting.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-black text-brand-500">4.</span>
                <span>Access all logged reports anytime from the history logs below.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* AI Summary Modal details */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl p-6 rounded-3xl shadow-2xl glass-panel relative border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowSummaryModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 pr-6">
              AI Report: {activeSummary?.title}
            </h3>

            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <span className="text-sm text-slate-400">Querying summary logs...</span>
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto pr-1 py-2 flex-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Executive Summary
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {activeSummary?.summary}
                  </div>
                </div>

                {activeSummary?.actionItems && activeSummary.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      Key Action Items
                    </h4>
                    <ul className="space-y-2">
                      {activeSummary.actionItems.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-350"
                        >
                          <span className="inline-block mt-2 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
