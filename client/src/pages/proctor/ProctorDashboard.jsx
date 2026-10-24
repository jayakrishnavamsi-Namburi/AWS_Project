import React, { useState, useEffect } from 'react';
import { api, examService } from '../../services';
import { useSocket } from '../../context/SocketContext';
import { Card, Button, Badge, LoadingSkeleton, Modal } from '../../components/common';
import { Video, ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, Smartphone } from 'lucide-react';

export const ProctorDashboard = () => {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState([]);

  const { socket, joinExamRoom, leaveExamRoom } = useSocket();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await examService.getExams({ limit: 50 });
        setExams(data.exams || []);
        if (data.exams?.length > 0) {
          setSelectedExamId(data.exams[0]._id);
        }
      } catch (err) {
        console.error('Failed to load exams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const fetchLiveSessions = async (examId) => {
    if (!examId) return;
    try {
      const res = await api.get('/proctoring/live', { params: { examId } });
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch live sessions:', err);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchLiveSessions(selectedExamId);
      joinExamRoom(selectedExamId, null);
    }

    return () => {
      if (selectedExamId) {
        leaveExamRoom(selectedExamId, null);
      }
    };
  }, [selectedExamId, joinExamRoom, leaveExamRoom]);

  // Real-time socket alerts
  useEffect(() => {
    if (!socket) return;

    const handleProctorEvent = (data) => {
      setLiveAlerts((prev) => [data, ...prev.slice(0, 19)]);
      if (selectedExamId) {
        fetchLiveSessions(selectedExamId);
      }
    };

    socket.on('proctor:event', handleProctorEvent);

    return () => {
      socket.off('proctor:event', handleProctorEvent);
    };
  }, [socket, selectedExamId]);

  const handleForceSubmit = async (sessionId) => {
    const reason = window.prompt('Specify termination reason:', 'Proctor observed multiple integrity violations');
    if (!reason) return;

    try {
      await api.post(`/proctoring/sessions/${sessionId}/terminate`, { reason });
      fetchLiveSessions(selectedExamId);
    } catch (err) {
      alert('Failed to terminate candidate session');
    }
  };

  if (loading) return <LoadingSkeleton count={3} className="h-32" />;

  return (
    <div className="space-y-6">
      {/* Header & Exam Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Live Assessment Invigilation</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time AI telemetry, mobile camera streams, and active candidates.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            {exams.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => fetchLiveSessions(selectedExamId)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Invigilation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Candidate Cards */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Video className="w-4 h-4 text-brand-400" />
            Active Candidate Sessions ({sessions.length})
          </h2>

          {sessions.length === 0 ? (
            <Card className="text-center p-10">
              <p className="text-xs text-slate-400">No candidates actively taking this examination currently.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sessions.map(({ session, mobileState, recentEvents, totalViolations }) => (
                <Card key={session._id} className="p-4 flex flex-col justify-between border-slate-800 space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{session.studentId?.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">{session.studentId?.studentId || session.studentId?.email}</span>
                      </div>
                      <Badge variant={session.status === 'active' ? 'success' : 'default'} size="sm">
                        {session.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 text-[11px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mobile Stream:</span>
                        <span className={mobileState === 'connected' ? 'text-emerald-400' : 'text-slate-500'}>
                          {mobileState.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Violations:</span>
                        <span className={totalViolations > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {totalViolations} logged
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Started {new Date(session.startTime).toLocaleTimeString()}
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleForceSubmit(session._id)}
                    >
                      Terminate
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Real-time Live Alert Stream */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Live Integrity Alert Stream
          </h2>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {liveAlerts.length === 0 ? (
              <Card className="text-center p-8">
                <span className="text-xs text-slate-500">Awaiting real-time telemetry signals...</span>
              </Card>
            ) : (
              liveAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1 animate-fadeIn"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="danger" size="sm">
                      {alert.event?.eventType?.replace('_', ' ').toUpperCase() || 'INFRACTION'}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(alert.event?.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium text-[11px]">
                    Candidate ID: <span className="font-mono text-brand-300">{alert.studentId}</span>
                  </p>
                  {alert.autoSubmitted && (
                    <span className="text-[10px] text-rose-400 font-bold block">
                      ⚠ Auto-submission triggered for session
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
