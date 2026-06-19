import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import apiCall from '../services/api';
import {
  Users,
  Plus,
  Mail,
  UserPlus,
  FileText,
  CloudLightning,
  Loader2,
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';

const Teams = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const socket = useSocket(true);

  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  // New team modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // New member invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingMember, setInvitingMember] = useState(false);

  // Notes synchronization states
  const [notesText, setNotesText] = useState('');
  const [syncStatus, setSyncStatus] = useState('saved'); // 'saved' | 'syncing' | 'typing'
  const saveTimeoutRef = useRef(null);

  // 1. Load active workspaces on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await apiCall('/api/teams');
        setTeams(data);
      } catch (err) {
        showToast('Failed to load workspaces.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, [showToast]);

  // 2. Connect/Disconnect to Socket rooms on switching active teams
  useEffect(() => {
    if (!socket || !activeTeam) return;

    // Join team socket room
    socket.emit('join-team', { teamId: activeTeam._id });

    // Initial notes state
    setNotesText(activeTeam.sharedNotes || '');
    setSyncStatus('saved');

    // Handle real-time incoming note broadcasts
    socket.on('notes-updated', (updatedNotes) => {
      setNotesText(updatedNotes);
      setSyncStatus('saved');
    });

    return () => {
      socket.off('notes-updated');
    };
  }, [activeTeam, socket]);

  // 3. Debounced Auto-save and broadcast notes editing
  const handleNotesChange = (e) => {
    const text = e.target.value;
    setNotesText(text);
    setSyncStatus('typing');

    if (!socket || !activeTeam) return;

    // Broadcast current text state immediately to other active room members
    socket.emit('edit-notes', { teamId: activeTeam._id, notes: text });

    // Debounce database save operation
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await apiCall(`/api/teams/${activeTeam._id}/notes`, {
          method: 'PUT',
          body: JSON.stringify({ sharedNotes: text }),
        });
        
        // Update local reference array
        setTeams((prev) =>
          prev.map((t) => (t._id === activeTeam._id ? { ...t, sharedNotes: text } : t))
        );
        setSyncStatus('saved');
      } catch (err) {
        console.error('Failed to auto-save notes:', err.message);
        setSyncStatus('saved');
      }
    }, 2000);
  };

  // 4. Create team workspace submit
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setCreatingTeam(true);
    try {
      const data = await apiCall('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: newTeamName, description: newTeamDescription }),
      });
      setTeams((prev) => [data, ...prev]);
      setActiveTeam(data);
      setShowCreateModal(false);
      setNewTeamName('');
      setNewTeamDescription('');
      showToast('Workspace created successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create team.', 'error');
    } finally {
      setCreatingTeam(false);
    }
  };

  // 5. Invite members submit
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTeam) return;

    setInvitingMember(true);
    try {
      const updatedTeam = await apiCall(`/api/teams/${activeTeam._id}/member`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      
      // Update reference state and active pane
      setTeams((prev) => prev.map((t) => (t._id === activeTeam._id ? updatedTeam : t)));
      setActiveTeam(updatedTeam);
      setInviteEmail('');
      showToast('Member added successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Invitation failed.', 'error');
    } finally {
      setInvitingMember(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        <span className="text-sm font-semibold text-slate-500">Retrieving workspaces...</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      
      {/* Workspace Sidebar list */}
      <div className="w-64 md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex-shrink-0 flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            <span className="font-extrabold text-sm uppercase tracking-wider text-slate-650 dark:text-slate-200">
              Workspaces
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/25 transition-all focus:outline-none cursor-pointer"
            title="Create Workspace"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {teams.length === 0 ? (
            <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-10">
              No workspaces found. Click '+' to make one!
            </div>
          ) : (
            teams.map((team) => (
              <button
                key={team._id}
                onClick={() => setActiveTeam(team)}
                className={`w-full text-left p-3.5 rounded-2xl flex items-center justify-between group transition-all cursor-pointer ${
                  activeTeam?._id === team._id
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="font-bold text-sm truncate">{team.name}</div>
                  <div
                    className={`text-xxs truncate mt-0.5 ${
                      activeTeam?._id === team._id ? 'text-brand-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {team.members?.length || 1} members
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                    activeTeam?._id === team._id ? 'text-white' : 'text-slate-450'
                  }`}
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Workspace details panel */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden h-full">
        {activeTeam ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
            
            {/* Editor Sheet */}
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden h-full border-r border-slate-200 dark:border-slate-850">
              {/* Notes bar header */}
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-500" />
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs md:max-w-md">
                    {activeTeam.name} Notes
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {syncStatus === 'typing' && (
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Typing...
                    </span>
                  )}
                  {syncStatus === 'syncing' && (
                    <span className="text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      Syncing...
                    </span>
                  )}
                  {syncStatus === 'saved' && (
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <CloudLightning className="w-3.5 h-3.5" />
                      Synced
                    </span>
                  )}
                </div>
              </div>

              {/* Shared Document textarea */}
              <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                <textarea
                  value={notesText}
                  onChange={handleNotesChange}
                  placeholder="Collaborate in real-time... Notes entered here are synchronized instantly with other members active in this workspace."
                  className="w-full h-full p-5 resize-none bg-transparent text-slate-800 dark:text-slate-200 text-sm focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Sidebar Member Directory list */}
            <div className="w-full md:w-80 p-4 md:p-6 flex-shrink-0 flex flex-col h-fit md:h-full overflow-y-auto space-y-6">
              
              {/* Workspace details info */}
              <div className="p-4.5 rounded-2xl border border-slate-250/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Description
                </h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                  {activeTeam.description || 'No description provided.'}
                </p>
              </div>

              {/* Invite User box */}
              <div className="p-4.5 rounded-2xl border border-slate-250/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-500" />
                  Add Member
                </h3>
                <form onSubmit={handleInviteMember} className="space-y-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="user@workspace.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={invitingMember}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {invitingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Invite'}
                  </button>
                </form>
              </div>

              {/* Active list details */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  Active Directory ({activeTeam.members?.length || 1})
                </h3>
                <div className="space-y-2.5">
                  {activeTeam.members?.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/40 dark:hover:bg-slate-900/20"
                    >
                      <img src={member.avatar} alt="" className="w-7 h-7 rounded-full bg-slate-250 border border-slate-205" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {member.name}
                        </div>
                        <div className="text-xxs text-slate-400 dark:text-slate-500 truncate">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-3xl bg-brand-500/10 text-brand-650 mb-4 animate-bounce-slow">
              <Users className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-bold text-slate-850 dark:text-slate-200">No Active Workspace</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5 max-w-sm">
              Select an existing team workspace from the left drawer or configure a new workspace to start collaboration.
            </p>
          </div>
        )}
      </div>

      {/* Create Team Modal sheet */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl shadow-2xl glass-panel relative border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 pr-6">
              Create New Workspace
            </h3>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Engineering"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Workspace Description
                </label>
                <textarea
                  placeholder="Describe your workspace project goals..."
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm h-24"
                />
              </div>

              <button
                type="submit"
                disabled={creatingTeam}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
              >
                {creatingTeam ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Teams;
