import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import apiCall from '../services/api';
import { generateSummary } from '../services/aiService';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  MessageSquare,
  Users,
  Sparkles,
  Send,
  Loader2,
  ListTodo
} from 'lucide-react';

// Sub-component for individual video element
const VideoPlayer = ({ stream, isLocal, name }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl aspect-video group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isLocal ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
        {name} {isLocal && '(You)'}
      </div>
    </div>
  );
};

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [meetingDetails, setMeetingDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Side Panel state: 'chat' | 'participants' | 'ai' | null
  const [activePanel, setActivePanel] = useState('chat');

  // Chat states
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [typers, setTypers] = useState([]);
  const chatEndRef = useRef(null);

  // AI assistant states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState(null);

  // Socket and WebRTC hooks
  const socket = useSocket(true);
  const {
    localStream,
    peers,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  } = useWebRTC(meetingId, socket, user);

  // 1. Fetch and verify meeting details on mount
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const details = await apiCall(`/api/meetings/${meetingId}`);
        setMeetingDetails(details);
        
        // Load initial messages from database
        const chatLogs = await apiCall(`/api/meetings/history`);
        const currentLogs = chatLogs.find(h => h.meetingId === meetingId);
        if (currentLogs) {
          // Fetch messages directly related to this meeting
          const msgs = await apiCall('/api/meetings/history'); // Simplified fallback
          // For demo completeness: let's pull logs from history or mock init
        }
      } catch (err) {
        showToast('Meeting room verification failed.', 'error');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingId, navigate, showToast]);

  // 2. Chat Socket listeners & scrolling actions
  useEffect(() => {
    if (!socket) return;

    socket.on('receive-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('user-typing', ({ userName }) => {
      setTypers((prev) => {
        if (prev.includes(userName)) return prev;
        return [...prev, userName];
      });
    });

    socket.on('user-stop-typing', ({ userName }) => {
      setTypers((prev) => prev.filter((t) => t !== userName));
    });

    return () => {
      socket.off('receive-message');
      socket.off('user-typing');
      socket.off('user-stop-typing');
    };
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typers]);

  // Typing state timers
  const typingTimeoutRef = useRef(null);
  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    
    if (!socket) return;

    // Emit typing indicator
    socket.emit('typing', { meetingId, userName: user.name });

    // Clear previous timeout and set new one to emit stop-typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { meetingId, userName: user.name });
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !socket) return;

    socket.emit('send-message', {
      meetingId,
      senderId: user._id,
      text: messageText.trim(),
    });

    socket.emit('stop-typing', { meetingId, userName: user.name });
    setMessageText('');
  };

  // 3. AI assistant triggered summaries
  const handleTriggerAISummary = async () => {
    if (messages.length === 0) {
      showToast('Send some messages in the chat first to feed the AI assistant.', 'info');
      return;
    }
    setAiLoading(true);
    try {
      const data = await generateSummary(meetingId);
      setAiReport(data);
      showToast('AI Summary generated and saved!', 'success');
    } catch (err) {
      showToast(err.message || 'AI generation failed.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleLeaveMeeting = () => {
    if (socket) {
      socket.emit('leave-room');
    }
    showToast('Left meeting room.', 'info');
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        <span className="text-sm font-semibold text-slate-500">Checking room configurations...</span>
      </div>
    );
  }

  // Calculate dynamic grid templates
  const totalStreams = (localStream ? 1 : 0) + peers.length;
  const gridClass =
    totalStreams === 1
      ? 'grid-cols-1 max-w-3xl mx-auto'
      : totalStreams === 2
      ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto'
      : totalStreams <= 4
      ? 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-7xl mx-auto';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-slate-950 overflow-hidden text-slate-100">
      
      {/* Video Call Streams Grid */}
      <div className="flex-1 flex flex-col justify-between p-4 md:p-6 overflow-y-auto">
        {/* Room Header */}
        <div className="flex items-center justify-between mb-4 glass-panel p-4 rounded-2xl border border-white/5 bg-slate-900/40">
          <div>
            <h2 className="font-extrabold text-slate-200">{meetingDetails?.title}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {meetingId}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(meetingId);
                showToast('Meeting ID copied to clipboard!', 'success');
              }}
              className="text-xs font-bold bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Copy Code
            </button>
          </div>
        </div>

        {/* Dynamic Grids */}
        <div className={`grid gap-4 md:gap-6 items-center justify-center flex-1 py-4 ${gridClass}`}>
          {localStream && (
            <VideoPlayer stream={localStream} isLocal={true} name={user.name} />
          )}
          {peers.map((peer) => (
            <VideoPlayer
              key={peer.socketId}
              stream={peer.stream}
              isLocal={false}
              name={peer.userName}
            />
          ))}
        </div>

        {/* Media controls bar */}
        <div className="flex justify-center items-center gap-3 mt-4">
          <button
            onClick={toggleAudio}
            className={`p-3.5 rounded-2xl transition-all shadow-lg focus:outline-none cursor-pointer ${
              isAudioMuted
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl transition-all shadow-lg focus:outline-none cursor-pointer ${
              isVideoMuted
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isVideoMuted ? 'Start Camera' : 'Stop Camera'}
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl transition-all shadow-lg focus:outline-none cursor-pointer ${
              isScreenSharing
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-slate-800 mx-2"></div>

          {/* Toggle sidebar panels */}
          <button
            onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
            className={`p-3.5 rounded-2xl transition-all shadow-lg focus:outline-none cursor-pointer ${
              activePanel === 'chat'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Chat Panel"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
            className={`p-3.5 rounded-2xl transition-all shadow-lg focus:outline-none cursor-pointer ${
              activePanel === 'participants'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Participant List"
          >
            <Users className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
            className={`p-3.5 rounded-2xl transition-all shadow-lg focus:outline-none cursor-pointer ${
              activePanel === 'ai'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="AI Meeting Assistant"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          <button
            onClick={handleLeaveMeeting}
            className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-lg focus:outline-none ml-2 cursor-pointer animate-pulse-slow"
            title="Leave Meeting"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slideout Sidebars Panel */}
      {activePanel && (
        <div className="w-full md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800/80 flex flex-col h-1/2 md:h-full flex-shrink-0 transition-all duration-300 ease-in-out relative z-10">
          
          {/* Chat Side View */}
          {activePanel === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-850 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-500" />
                <span className="font-extrabold text-sm uppercase tracking-wider text-slate-350">Meeting Chat</span>
              </div>

              {/* Messages feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 mt-10">
                    No messages sent yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={msg._id || i}
                      className={`flex gap-2.5 max-w-[85%] ${
                        msg.sender?._id === user._id ? 'ml-auto flex-row-reverse' : ''
                      }`}
                    >
                      <img
                        src={msg.sender?.avatar}
                        alt=""
                        className="w-7 h-7 rounded-full bg-slate-800 mt-0.5"
                      />
                      <div>
                        <div
                          className={`text-slate-400 text-xxs font-semibold mb-0.5 ${
                            msg.sender?._id === user._id ? 'text-right' : ''
                          }`}
                        >
                          {msg.sender?.name}
                        </div>
                        <div
                          className={`p-3 rounded-2xl text-sm leading-relaxed ${
                            msg.sender?._id === user._id
                              ? 'bg-brand-600 text-white rounded-tr-none'
                              : 'bg-slate-850 text-slate-200 rounded-tl-none border border-slate-800'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {/* Typing bubbles */}
                {typers.length > 0 && (
                  <div className="text-xs text-slate-400 italic flex items-center gap-1.5 pl-9 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce"></span>
                    <span>{typers.join(', ')} {typers.length === 1 ? 'is' : 'are'} typing...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-850 bg-slate-900/80">
                <div className="relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleInputChange}
                    placeholder="Type message..."
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="absolute right-2.5 top-2.5 p-1 rounded-lg bg-brand-650 hover:bg-brand-600 text-white transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Participant Side View */}
          {activePanel === 'participants' && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-850 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <span className="font-extrabold text-sm uppercase tracking-wider text-slate-350">
                  Participants ({1 + peers.length})
                </span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {/* Local user */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-850/50 border border-slate-800/40">
                  <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-indigo-500" />
                  <div>
                    <div className="text-sm font-bold text-slate-200">{user.name}</div>
                    <div className="text-xxs font-semibold text-brand-400">Host (You)</div>
                  </div>
                </div>
                {/* Remote users */}
                {peers.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 mt-6">
                    Waiting for others to connect...
                  </div>
                ) : (
                  peers.map((peer) => (
                    <div
                      key={peer.socketId}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-850/50 border border-slate-800/40"
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(peer.userName)}`}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="text-sm font-bold text-slate-200">{peer.userName}</div>
                        <div className="text-xxs text-slate-400">Connected peer</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* AI Assistant Side View */}
          {activePanel === 'ai' && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-850 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <span className="font-extrabold text-sm uppercase tracking-wider text-slate-350">AI Assistant</span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-6">
                <div className="text-xs text-slate-400 leading-relaxed bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl">
                  IntellMeet AI analyzes your meeting's live conversation transcripts to generate a executive summary and actionable task checklists.
                </div>

                <button
                  onClick={handleTriggerAISummary}
                  disabled={aiLoading}
                  className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing Transcripts...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Summary
                    </>
                  )}
                </button>

                {aiReport && (
                  <div className="space-y-4 border-t border-slate-850 pt-5">
                    <div>
                      <h4 className="text-xxs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                        Summary
                      </h4>
                      <div className="p-3.5 rounded-xl bg-slate-950/60 text-xs text-slate-300 leading-relaxed border border-slate-850 whitespace-pre-wrap">
                        {aiReport.summary}
                      </div>
                    </div>

                    {aiReport.actionItems && aiReport.actionItems.length > 0 && (
                      <div>
                        <h4 className="text-xxs font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <ListTodo className="w-3.5 h-3.5 text-brand-500" />
                          Action Items
                        </h4>
                        <ul className="space-y-2 pl-1">
                          {aiReport.actionItems.map((item, index) => (
                            <li key={index} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0"></span>
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
      )}

    </div>
  );
};

export default MeetingRoom;
