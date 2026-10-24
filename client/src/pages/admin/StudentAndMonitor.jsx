import React, { useState, useEffect } from 'react';
import { api } from '../../services';
import { Card, Button, Input, Badge, LoadingSkeleton } from '../../components/common';
import { Users, Search, UserCheck, UserX, Shield } from 'lucide-react';

export const StudentManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { search, limit: 50 } });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/users/${userId}/status`, { status: nextStatus });
      fetchUsers();
    } catch (err) {
      alert('Failed to update student status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Student & Candidate Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Manage student credentials, departments, and account status.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <Input
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by student name, email, or roll number..."
        />
        <Button variant="secondary" size="md" onClick={fetchUsers}>
          Search
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton count={4} className="h-20" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Candidate</th>
                  <th className="px-6 py-3.5">Student ID</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-100">{u.name}</div>
                      <div className="text-slate-400 text-[11px] font-mono">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{u.studentId || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-300">{u.department || 'General'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'proctor' ? 'warning' : 'primary'} size="sm">
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.status === 'active' ? 'success' : 'danger'} size="sm">
                        {u.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role === 'student' && (
                        <Button
                          variant={u.status === 'active' ? 'outline' : 'success'}
                          size="sm"
                          onClick={() => toggleUserStatus(u._id, u.status)}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export const LiveSessionMonitor = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveSessions = async () => {
    try {
      const res = await api.get('/proctoring/live');
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error('Failed to load live sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
    const interval = setInterval(fetchLiveSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTerminateSession = async (sessionId) => {
    const reason = window.prompt('Specify termination reason for candidate:', 'Exam integrity violation observed by invigilator');
    if (!reason) return;

    try {
      await api.post(`/proctoring/sessions/${sessionId}/terminate`, { reason });
      fetchLiveSessions();
    } catch (err) {
      alert('Failed to terminate session');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Live Examination Oversight Grid</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time candidate telemetry, violation logs, and termination controls.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchLiveSessions}>
          Refresh Sessions
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton count={4} className="h-32" />
      ) : sessions.length === 0 ? (
        <Card className="text-center p-12">
          <p className="text-xs text-slate-400">No active candidate exam sessions currently in progress.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(({ session, mobileState, recentEvents, totalViolations }) => (
            <Card key={session._id} className="p-5 flex flex-col justify-between border-slate-800 space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{session.studentId?.name || 'Candidate'}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">{session.studentId?.email}</span>
                  </div>
                  <Badge variant={session.status === 'active' ? 'success' : 'default'} size="sm">
                    {session.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="text-xs text-slate-400 font-mono py-2 border-y border-slate-800/80 space-y-1">
                  <div className="flex justify-between">
                    <span>Assessment:</span>
                    <span className="text-slate-200 font-semibold line-clamp-1">{session.examId?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobile Third-Eye:</span>
                    <span className={mobileState === 'connected' ? 'text-emerald-400' : 'text-slate-500'}>
                      {mobileState.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Violation Count:</span>
                    <span className={totalViolations > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      {totalViolations} Infractions
                    </span>
                  </div>
                </div>

                {recentEvents && recentEvents.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Recent Alerts:</span>
                    {recentEvents.slice(0, 2).map((ev) => (
                      <div key={ev._id} className="text-[11px] p-1.5 rounded bg-rose-500/10 text-rose-300 flex items-center justify-between">
                        <span>{ev.eventType.replace('_', ' ')}</span>
                        <span className="font-mono text-[10px]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  Started: {new Date(session.startTime).toLocaleTimeString()}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleTerminateSession(session._id)}
                >
                  Force Terminate
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
