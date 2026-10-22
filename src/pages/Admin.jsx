import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  BookOpen,
  AlertTriangle,
  Flag,
  Activity,
  FileText,
  Sliders,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Power,
  Lock,
  Unlock,
  Clock,
  ChevronRight,
  Eye,
  Layers,
  AlertCircle,
} from 'lucide-react';
import {
  getAdminOverview,
  getAdminUsers,
  getAdminUserDetails,
  suspendUser,
  unsuspendUser,
  updateUserRole,
  invalidateUserSessions,
  getAdminContent,
  updateContentStatus,
  getAdminReports,
  assignReport,
  resolveReport,
  rejectReport,
  getAdminFeatureFlags,
  updateFeatureFlag,
  setEmergencyControl,
  getSystemHealth,
  getIncidents,
  createIncident,
  updateIncident,
  getAuditLogs,
} from '../services/admin';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // 1. Overview state
  const [overview, setOverview] = useState(null);

  // 2. Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  // 3. Content state
  const [contentItems, setContentItems] = useState([]);
  const [contentType, setContentType] = useState('course');
  const [contentStatusFilter, setContentStatusFilter] = useState('all');

  // 4. Moderation state
  const [reports, setReports] = useState([]);
  const [reportStatusFilter, setReportStatusFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('none');
  const [resolutionNote, setResolutionNote] = useState('');

  // 5. Feature flags state
  const [flags, setFlags] = useState([]);

  // 6. System & Incidents state
  const [health, setHealth] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [newIncident, setNewIncident] = useState({ title: '', description: '', severity: 'p2_medium', affectedService: 'system' });
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  // 7. Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);

  const showToast = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  // Tab data loaders
  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await getAdminOverview();
      setOverview(data);
    } catch (err) {
      showToast('error', 'Failed to load administrative overview: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAdminUsers({
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
      });
      setUsers(data.users || []);
    } catch (err) {
      showToast('error', 'Failed to load users: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await getAdminContent({
        type: contentType,
        status: contentStatusFilter,
      });
      setContentItems(data.items || []);
    } catch (err) {
      showToast('error', 'Failed to load content items: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await getAdminReports({ status: reportStatusFilter });
      setReports(data.reports || []);
    } catch (err) {
      showToast('error', 'Failed to load moderation reports: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const loadFlags = async () => {
    try {
      setLoading(true);
      const data = await getAdminFeatureFlags();
      setFlags(data || []);
    } catch (err) {
      showToast('error', 'Failed to load feature flags: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const loadSystem = async () => {
    try {
      setLoading(true);
      const [healthData, incData] = await Promise.all([getSystemHealth(), getIncidents()]);
      setHealth(healthData);
      setIncidents(incData.incidents || []);
    } catch (err) {
      showToast('error', 'Failed to load system health: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const loadAudits = async () => {
    try {
      setLoading(true);
      const data = await getAuditLogs();
      setAuditLogs(data.logs || []);
    } catch (err) {
      showToast('error', 'Failed to load audit logs: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') loadOverview();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'content') loadContent();
    else if (activeTab === 'moderation') loadReports();
    else if (activeTab === 'flags') loadFlags();
    else if (activeTab === 'system') loadSystem();
    else if (activeTab === 'audits') loadAudits();
  }, [activeTab, userRoleFilter, userStatusFilter, contentType, contentStatusFilter, reportStatusFilter]);

  // Handler: Inspect User Details
  const handleInspectUser = async (u) => {
    setSelectedUser(u);
    try {
      const details = await getAdminUserDetails(u._id);
      setSelectedUserDetails(details);
    } catch (err) {
      showToast('error', 'Failed to fetch user details: ' + err.message);
    }
  };

  // Handler: Suspend User
  const handleSuspend = async (uid) => {
    if (!window.confirm('Are you sure you want to suspend this user? All active sessions will be terminated.')) return;
    try {
      await suspendUser(uid, 'Administrative suspension');
      showToast('success', 'User suspended and sessions invalidated.');
      loadUsers();
      if (selectedUser?._id === uid) setSelectedUser(null);
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Unsuspend User
  const handleUnsuspend = async (uid) => {
    try {
      await unsuspendUser(uid, 'Reinstated by administrator');
      showToast('success', 'User reinstated.');
      loadUsers();
      if (selectedUser?._id === uid) setSelectedUser(null);
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Invalidate Sessions
  const handleInvalidateSessions = async (uid) => {
    try {
      const res = await invalidateUserSessions(uid);
      showToast('success', res.message || 'Sessions invalidated.');
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Role Change
  const handleRoleChange = async (uid, newRole) => {
    try {
      await updateUserRole(uid, newRole);
      showToast('success', `Role updated to ${newRole}`);
      loadUsers();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Content Status Update
  const handleContentStatus = async (id, status) => {
    try {
      await updateContentStatus(contentType, id, status, 'Admin workflow transition');
      showToast('success', `Content status changed to ${status}`);
      loadContent();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Moderation Claim
  const handleClaimReport = async (reportId) => {
    try {
      await assignReport(reportId);
      showToast('success', 'Report claimed.');
      loadReports();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Moderation Resolve
  const handleResolveReport = async () => {
    if (!selectedReport) return;
    try {
      await resolveReport(selectedReport._id, resolutionNote || 'Resolved', resolutionAction);
      showToast('success', 'Report resolved.');
      setSelectedReport(null);
      setResolutionNote('');
      setResolutionAction('none');
      loadReports();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Moderation Dismiss
  const handleRejectReport = async (reportId) => {
    try {
      await rejectReport(reportId, 'Dismissed as non-violating');
      showToast('success', 'Report dismissed.');
      loadReports();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Emergency Switch
  const handleEmergencyToggle = async (action, currentVal) => {
    const newVal = !currentVal;
    const confirmMsg = `Are you sure you want to ${newVal ? 'ACTIVATE' : 'DEACTIVATE'} ${action}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await setEmergencyControl(action, newVal, 'Admin emergency panel manual toggle');
      showToast('success', `Emergency control ${action} ${newVal ? 'activated' : 'deactivated'}.`);
      loadOverview();
      if (activeTab === 'flags') loadFlags();
      if (activeTab === 'system') loadSystem();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Flag Toggle
  const handleFlagToggle = async (flag) => {
    try {
      await updateFeatureFlag(flag.key, { isEnabled: !flag.isEnabled });
      showToast('success', `Flag ${flag.key} updated.`);
      loadFlags();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Flag Rollout Slider
  const handleFlagRollout = async (flag, newPct) => {
    try {
      await updateFeatureFlag(flag.key, { rolloutPercentage: Number(newPct) });
      setFlags(flags.map((f) => (f.key === flag.key ? { ...f, rolloutPercentage: Number(newPct) } : f)));
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  // Handler: Create Incident
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    try {
      await createIncident(newIncident);
      showToast('success', 'Incident logged successfully.');
      setShowIncidentModal(false);
      setNewIncident({ title: '', description: '', severity: 'p2_medium', affectedService: 'system' });
      loadSystem();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8">
      {/* Toast Notification */}
      {feedback.message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center space-x-2 ${
            feedback.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {feedback.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin & Operations Hub</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Governance, safety, curriculum workflows, and system health
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold uppercase tracking-wider">
            {user?.role || 'ADMIN'}
          </span>
          <button
            onClick={() => {
              if (activeTab === 'overview') loadOverview();
              else if (activeTab === 'users') loadUsers();
              else if (activeTab === 'content') loadContent();
              else if (activeTab === 'moderation') loadReports();
              else if (activeTab === 'flags') loadFlags();
              else if (activeTab === 'system') loadSystem();
              else if (activeTab === 'audits') loadAudits();
            }}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
            title="Refresh current view"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800 mt-4 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'content', label: 'Content Governance', icon: BookOpen },
          { id: 'moderation', label: 'Moderation Queue', icon: Flag },
          { id: 'flags', label: 'Feature Flags', icon: Sliders },
          { id: 'system', label: 'System & Incidents', icon: Activity },
          { id: 'audits', label: 'Audit Logs', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {/* ========================================================= */}
        {/* 1. OVERVIEW TAB */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-xs font-medium text-slate-500">Total Users</span>
                <div className="text-2xl font-bold mt-1">{overview?.stats?.totalUsers ?? '—'}</div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-xs font-medium text-slate-500">Active Learners Today</span>
                <div className="text-2xl font-bold mt-1 text-emerald-600">{overview?.stats?.activeTodayUsers ?? '—'}</div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-xs font-medium text-slate-500">Published Courses</span>
                <div className="text-2xl font-bold mt-1 text-indigo-600">{overview?.stats?.publishedCourses ?? '—'}</div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-xs font-medium text-slate-500">Pending Moderation</span>
                <div className="text-2xl font-bold mt-1 text-amber-500">{overview?.stats?.pendingReports ?? '—'}</div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-xs font-medium text-slate-500">System Health</span>
                <div className="text-xl font-bold mt-1 capitalize text-emerald-600">
                  {overview?.systemHealth?.status ?? 'Online'}
                </div>
              </div>
            </div>

            {/* Emergency Controls Switchboard */}
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-5">
              <div className="flex items-center space-x-2 text-red-700 dark:text-red-400 font-semibold mb-3">
                <AlertTriangle className="w-5 h-5" />
                <h2>Emergency Operational Controls (Kill Switches)</h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                Operational safety switches immediately intervene across services. Every change is logged to immutable audit records.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pause AI */}
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <div>
                    <span className="text-sm font-semibold">Pause AI Generation</span>
                    <p className="text-xs text-slate-500">Disable mentor & course generator</p>
                  </div>
                  <button
                    onClick={() =>
                      handleEmergencyToggle(
                        'emergency_pause_ai',
                        overview?.systemHealth?.emergencyControls?.isAiPaused
                      )
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                      overview?.systemHealth?.emergencyControls?.isAiPaused
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {overview?.systemHealth?.emergencyControls?.isAiPaused ? 'PAUSED' : 'ACTIVE'}
                  </button>
                </div>

                {/* Maintenance Mode */}
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <div>
                    <span className="text-sm font-semibold">Maintenance Mode</span>
                    <p className="text-xs text-slate-500">Restricts user traffic for maintenance</p>
                  </div>
                  <button
                    onClick={() =>
                      handleEmergencyToggle(
                        'emergency_maintenance_mode',
                        overview?.systemHealth?.emergencyControls?.isMaintenanceMode
                      )
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                      overview?.systemHealth?.emergencyControls?.isMaintenanceMode
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {overview?.systemHealth?.emergencyControls?.isMaintenanceMode ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Pause Notifications */}
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <div>
                    <span className="text-sm font-semibold">Pause Notifications</span>
                    <p className="text-xs text-slate-500">Suspends background notification sweeps</p>
                  </div>
                  <button
                    onClick={() =>
                      handleEmergencyToggle(
                        'emergency_pause_notifications',
                        overview?.systemHealth?.emergencyControls?.isNotificationsPaused
                      )
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                      overview?.systemHealth?.emergencyControls?.isNotificationsPaused
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {overview?.systemHealth?.emergencyControls?.isNotificationsPaused ? 'PAUSED' : 'ACTIVE'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. USER MANAGEMENT TAB */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="content_manager">Content Manager</option>
                  <option value="moderator">Moderator</option>
                  <option value="support">Support</option>
                  <option value="analyst">Analyst</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>

                <button
                  onClick={loadUsers}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{u.displayName || u.name || 'Anonymous'}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role || 'user'}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                          <option value="super_admin">SUPER_ADMIN</option>
                          <option value="content_manager">CONTENT_MANAGER</option>
                          <option value="moderator">MODERATOR</option>
                          <option value="support">SUPPORT</option>
                          <option value="analyst">ANALYST</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            u.status === 'suspended'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}
                        >
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleInspectUser(u)}
                          className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                        >
                          Inspect
                        </button>
                        {u.status === 'suspended' ? (
                          <button
                            onClick={() => handleUnsuspend(u._id)}
                            className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspend(u._id)}
                            className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          onClick={() => handleInvalidateSessions(u._id)}
                          className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 text-amber-600 rounded hover:bg-amber-50 dark:hover:bg-amber-950/20 font-medium"
                          title="Invalidate all active sessions"
                        >
                          Kill Sessions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inspect User Drawer / Modal */}
            {selectedUser && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full p-6 overflow-y-auto shadow-2xl border-l border-slate-200 dark:border-slate-800 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="text-lg font-bold">User Investigation</h3>
                      <p className="text-xs text-slate-500">{selectedUser.email}</p>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <XCircle className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase">Account Profile</span>
                      <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1">
                        <div><strong>ID:</strong> {selectedUser._id}</div>
                        <div><strong>Role:</strong> {selectedUser.role}</div>
                        <div><strong>Status:</strong> {selectedUser.status}</div>
                        <div><strong>Timezone:</strong> {selectedUser.timezone || 'UTC'}</div>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase">Monetization & Entitlements</span>
                      <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1">
                        <div><strong>Active Plan:</strong> {selectedUserDetails?.activePlan || 'free'}</div>
                        <div><strong>Wallet:</strong> {selectedUserDetails?.wallet?.coins ?? 0} Coins, {selectedUserDetails?.wallet?.gems ?? 0} Gems</div>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase">Active Enrollments ({selectedUserDetails?.enrollments?.length || 0})</span>
                      <div className="mt-1 space-y-1 max-h-36 overflow-y-auto">
                        {selectedUserDetails?.enrollments?.map((en) => (
                          <div key={en._id} className="p-2 text-xs bg-slate-50 dark:bg-slate-800 rounded flex justify-between">
                            <span>{en.courseId?.title || 'Course'}</span>
                            <span className="text-slate-500">{en.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. CONTENT GOVERNANCE TAB */}
        {/* ========================================================= */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                {['course', 'lesson', 'quiz', 'flashcard'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setContentType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                      contentType === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {type}s
                  </button>
                ))}
              </div>

              <select
                value={contentStatusFilter}
                onChange={(e) => setContentStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {contentItems.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium">{item.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.status === 'published'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : item.status === 'archived'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {item.status !== 'approved' && item.status !== 'published' && (
                          <button
                            onClick={() => handleContentStatus(item._id, 'approved')}
                            className="px-2 py-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded font-medium"
                          >
                            Approve
                          </button>
                        )}
                        {item.status !== 'published' && (
                          <button
                            onClick={() => handleContentStatus(item._id, 'published')}
                            className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                          >
                            Publish
                          </button>
                        )}
                        {item.status !== 'archived' && (
                          <button
                            onClick={() => handleContentStatus(item._id, 'archived')}
                            className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/20 font-medium"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. MODERATION QUEUE TAB */}
        {/* ========================================================= */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                {['pending', 'under_review', 'resolved', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setReportStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                      reportStatusFilter === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3 text-right">Moderator Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {reports.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <span className="font-semibold capitalize text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 mr-2">
                          {r.targetType}
                        </span>
                        <span className="text-xs text-slate-500">ID: {r.targetId}</span>
                        {r.description && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">{r.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize font-medium">{r.reason.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                            r.priority === 'urgent'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                              : r.priority === 'high'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                          }`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.assignedTo ? r.assignedTo.name || r.assignedTo.email : <span className="italic text-slate-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {!r.assignedTo && (
                          <button
                            onClick={() => handleClaimReport(r._id)}
                            className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
                          >
                            Claim
                          </button>
                        )}
                        {r.status !== 'resolved' && (
                          <button
                            onClick={() => setSelectedReport(r)}
                            className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                          >
                            Resolve
                          </button>
                        )}
                        {r.status !== 'rejected' && (
                          <button
                            onClick={() => handleRejectReport(r._id)}
                            className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                          >
                            Dismiss
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resolve Report Modal */}
            {selectedReport && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold">Resolve Moderation Report</h3>
                  <p className="text-xs text-slate-500">Target: {selectedReport.targetType} ({selectedReport.targetId})</p>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Remediation Action</label>
                    <select
                      value={resolutionAction}
                      onChange={(e) => setResolutionAction(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
                    >
                      <option value="none">None (No automatic state change)</option>
                      <option value="content_hidden">Archive / Hide Target Content</option>
                      <option value="user_suspended">Suspend Reported User & Terminate Sessions</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Resolution Notes</label>
                    <textarea
                      rows={3}
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Explain findings and resolution..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResolveReport}
                      className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                    >
                      Submit Resolution
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. FEATURE FLAGS TAB */}
        {/* ========================================================= */}
        {activeTab === 'flags' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Flag Key</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Gradual Rollout</th>
                    <th className="px-4 py-3">Target Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {flags.map((flag) => (
                    <tr key={flag.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{flag.name || flag.key}</div>
                        <div className="text-xs font-mono text-slate-400">{flag.key}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{flag.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleFlagToggle(flag)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            flag.isEnabled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {flag.isEnabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={flag.rolloutPercentage || 0}
                            onChange={(e) => handleFlagRollout(flag, e.target.value)}
                            className="w-28 accent-indigo-600"
                          />
                          <span className="text-xs font-mono font-bold w-10">{flag.rolloutPercentage || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {flag.targetRoles?.length > 0 ? flag.targetRoles.join(', ') : 'All users'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. SYSTEM HEALTH & INCIDENTS TAB */}
        {/* ========================================================= */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* Health Component Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {health?.components &&
                Object.entries(health.components).map(([name, comp]) => (
                  <div
                    key={name}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          comp.status === 'healthy' || comp.status === 'operational'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        }`}
                      >
                        {comp.status}
                      </span>
                    </div>
                    {comp.memoryUsageMb && (
                      <div className="text-xs text-slate-500">Memory: {comp.memoryUsageMb} MB RSS</div>
                    )}
                    {comp.provider && (
                      <div className="text-xs text-slate-500">Provider: {comp.provider}</div>
                    )}
                  </div>
                ))}
            </div>

            {/* Operational Incidents Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Production Incidents</h3>
                  <p className="text-xs text-slate-500">Track outages, degraded features, and timeline resolutions</p>
                </div>
                <button
                  onClick={() => setShowIncidentModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  Log New Incident
                </button>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {incidents.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Zero active production incidents recorded.</p>
                ) : (
                  incidents.map((inc) => (
                    <div key={inc._id} className="py-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                              inc.severity === 'p0_critical'
                                ? 'bg-red-600 text-white'
                                : inc.severity === 'p1_high'
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {inc.severity.replace('_', ' ')}
                          </span>
                          <span className="font-semibold text-sm">{inc.title}</span>
                          <span className="text-xs text-slate-400 capitalize">({inc.status})</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{inc.description}</p>
                      </div>

                      {inc.status !== 'resolved' && (
                        <button
                          onClick={async () => {
                            await updateIncident(inc._id, { status: 'resolved', resolutionNotes: 'Resolved by operator' });
                            loadSystem();
                          }}
                          className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded font-medium"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Create Incident Modal */}
            {showIncidentModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <form
                  onSubmit={handleCreateIncident}
                  className="bg-white dark:bg-slate-900 p-6 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <h3 className="text-lg font-bold">Report Production Incident</h3>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={newIncident.title}
                      onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                      placeholder="e.g. OpenAI rate limit spike"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Description</label>
                    <textarea
                      required
                      rows={3}
                      value={newIncident.description}
                      onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                      placeholder="Details on symptoms and affected operations..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Severity</label>
                      <select
                        value={newIncident.severity}
                        onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
                      >
                        <option value="p0_critical">P0 Critical</option>
                        <option value="p1_high">P1 High</option>
                        <option value="p2_medium">P2 Medium</option>
                        <option value="p3_low">P3 Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Affected Service</label>
                      <select
                        value={newIncident.affectedService}
                        onChange={(e) => setNewIncident({ ...newIncident, affectedService: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg"
                      >
                        <option value="system">System</option>
                        <option value="ai_service">AI Service</option>
                        <option value="database">Database</option>
                        <option value="payment_gateway">Payment Gateway</option>
                        <option value="notifications">Notifications</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowIncidentModal(false)}
                      className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                    >
                      Save Incident
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. AUDIT LOGS TAB */}
        {/* ========================================================= */}
        {activeTab === 'audits' && (
          <div className="space-y-4">
            <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-mono text-xs">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {log.resourceType || log.targetType}: {log.resourceId || log.targetId}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {log.actorId ? log.actorId.email || log.actorId.name : String(log.adminUserId || 'system')}
                      </td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-xs">
                        {JSON.stringify(log.metadata || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
