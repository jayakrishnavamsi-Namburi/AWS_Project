import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsService, examService } from '../../services';
import { Card, Button, Badge, LoadingSkeleton } from '../../components/common';
import { ScoreDistributionChart, ViolationDistributionChart } from '../../components/charts';
import {
  Users,
  FileText,
  Video,
  Award,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  Plus
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await analyticsService.getAdminStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingSkeleton count={4} className="h-32" />;

  const overview = stats?.overview || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Assessment Oversight & Governance</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time platform metrics, security telemetry, and evaluation performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/exams/new">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Examination
            </Button>
          </Link>
          <Link to="/admin/live-monitor">
            <Button variant="secondary">
              <Video className="w-4 h-4 mr-1.5" />
              Live Invigilation
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono mt-3">{overview.totalStudents || 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered candidate profiles</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Examinations</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono mt-3">{overview.activeExams || 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">{overview.totalExams || 0} Total Exams Created</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Sessions</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-3">{overview.activeSessions || 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Candidates taking tests right now</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Pass Rate</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono mt-3">{overview.passRate || 0}%</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Avg Score: {overview.avgScore || 0}%</span>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Violation Telemetry by Category" subtitle="Distribution of detected proctoring infractions">
          <ViolationDistributionChart data={stats?.eventDistribution || []} />
        </Card>

        <Card title="Recent Active Exam Attempts" subtitle="Live student session stream" action={
          <Link to="/admin/live-monitor" className="text-xs text-brand-400 hover:underline">
            View Live Grid
          </Link>
        }>
          <div className="space-y-3">
            {(stats?.recentSessions || []).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No recent sessions recorded.</p>
            ) : (
              (stats?.recentSessions || []).map((s) => (
                <div
                  key={s._id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-200 block">{s.studentId?.name || 'Student'}</span>
                    <span className="text-slate-400 font-mono">{s.examId?.title || 'Examination'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === 'active' ? 'success' : 'default'} size="sm">
                      {s.status.toUpperCase()}
                    </Badge>
                    <span className="text-rose-400 font-mono font-semibold">
                      {s.warningsCount || 0} Alerts
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const AnalyticsReport = () => {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      const data = await examService.getExams({ limit: 50 });
      setExams(data.exams || []);
      if (data.exams?.length > 0) {
        setSelectedExamId(data.exams[0]._id);
      }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;
    const fetchExamAnalytics = async () => {
      setLoading(true);
      try {
        const data = await analyticsService.getExamStats(selectedExamId);
        setExamData(data);
      } catch (err) {
        console.error('Failed to load exam analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExamAnalytics();
  }, [selectedExamId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Assessment Analytics & Export</h1>
          <p className="text-xs text-slate-400 mt-1">Detailed performance distributions and audit reports.</p>
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

          {selectedExamId && (
            <a
              href={`/api/v1/analytics/exams/${selectedExamId}/export`}
              download
              className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              Export CSV
            </a>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={3} className="h-40" />
      ) : examData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-400 uppercase">Total Submissions</span>
              <div className="text-2xl font-bold text-slate-100 font-mono mt-1">
                {examData.metrics?.completedAttempts || 0}
              </div>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-400 uppercase">Pass Rate</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {examData.metrics?.passRate || 0}%
              </div>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-400 uppercase">Average Score</span>
              <div className="text-2xl font-bold text-brand-400 font-mono mt-1">
                {examData.metrics?.averagePercentage || 0}%
              </div>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-400 uppercase">Total Infractions</span>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {examData.metrics?.totalProctorEvents || 0}
              </div>
            </Card>
          </div>

          <Card title="Score Distribution Brackets" subtitle="Candidate marks spread">
            <ScoreDistributionChart data={examData.scoreDistribution || []} />
          </Card>
        </div>
      ) : null}
    </div>
  );
};
