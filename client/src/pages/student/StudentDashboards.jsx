import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { examService, analyticsService } from '../../services';
import { Card, Button, Badge, LoadingSkeleton } from '../../components/common';
import { FileText, Clock, Award, CheckCircle, ArrowRight, AlertCircle, PlayCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsData, resultsData] = await Promise.all([
          examService.getExams({ limit: 5 }),
          analyticsService.getResults({ limit: 5 })
        ]);
        setExams(examsData.exams || []);
        setResults(resultsData.results || []);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton count={4} className="h-28" />;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-900/60 via-slate-900 to-indigo-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Welcome back, {user?.name}!</h1>
          <p className="text-xs text-slate-300 mt-1">
            Student ID: <span className="font-mono font-semibold text-brand-300">{user?.studentId || 'N/A'}</span> • Department: {user?.department || 'General'}
          </p>
        </div>
        <Link to="/student/exams">
          <Button variant="primary">
            View All Assessments
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Available Examinations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400" />
            Available Assigned Examinations
          </h2>
          <Link to="/student/exams" className="text-xs text-brand-400 hover:underline">
            View all ({exams.length})
          </Link>
        </div>

        {exams.length === 0 ? (
          <Card className="text-center p-8">
            <CheckCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No active examinations assigned at this moment.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <Card key={exam._id} className="hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-slate-100 line-clamp-1">{exam.title}</h3>
                    <Badge variant="success" size="sm">Available</Badge>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {exam.description || 'Proctored examination assessing core competencies.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 font-mono mb-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{exam.durationMinutes} Minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-slate-500" />
                      <span>{exam.totalMarks} Marks</span>
                    </div>
                  </div>
                </div>

                <Link to={`/student/exams/${exam._id}/instructions`} className="w-full block">
                  <Button variant="primary" className="w-full" size="sm">
                    <PlayCircle className="w-4 h-4 mr-1.5" />
                    Start Assessment
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Scores & Submissions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-400" />
          Recent Evaluation Results
        </h2>

        {results.length === 0 ? (
          <Card className="text-center p-6">
            <p className="text-xs text-slate-500">No previous examination results found.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {results.map((res) => (
              <div
                key={res._id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{res.examId?.title || 'Examination'}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                    <span>Score: {res.totalScore} / {res.maxMarks}</span>
                    <span>•</span>
                    <span>Percentage: {res.percentage}%</span>
                    <span>•</span>
                    <span>Evaluated: {new Date(res.evaluatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={res.isPassed ? 'success' : 'danger'}>
                    {res.isPassed ? 'PASSED' : 'FAILED'}
                  </Badge>
                  <Link to={`/student/results/${res._id}`}>
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const AvailableExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await examService.getExams({ limit: 50 });
        setExams(data.exams || []);
      } catch (err) {
        console.error('Failed to fetch exams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  if (loading) return <LoadingSkeleton count={4} className="h-28" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Assigned Online Assessments</h1>
        <p className="text-xs text-slate-400 mt-1">Select an assessment to review instructions and begin pre-check.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <Card key={exam._id} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant="primary" size="sm">
                  {exam.questions?.length || 0} Questions
                </Badge>
                <Badge variant="success" size="sm">
                  Open
                </Badge>
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">{exam.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-3 mb-4">
                {exam.description || 'Enterprise proctored assessment.'}
              </p>

              <div className="space-y-1.5 py-3 border-y border-slate-800 text-xs text-slate-300 font-mono mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span>{exam.durationMinutes} mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Marks:</span>
                  <span>{exam.totalMarks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Passing Score:</span>
                  <span>{exam.passingScore}</span>
                </div>
              </div>
            </div>

            <Link to={`/student/exams/${exam._id}/instructions`} className="w-full">
              <Button variant="primary" className="w-full" size="md">
                <PlayCircle className="w-4 h-4 mr-1.5" />
                Proceed to Exam
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};
