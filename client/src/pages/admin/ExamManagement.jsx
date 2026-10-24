import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { examService, questionService } from '../../services';
import { Card, Button, Input, Badge, LoadingSkeleton, Modal } from '../../components/common';
import { FileText, Plus, CheckCircle, Clock, Trash2, Edit, Send, Users } from 'lucide-react';

export const ExamManagement = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    try {
      const data = await examService.getExams({ limit: 50 });
      setExams(data.exams || []);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handlePublish = async (id) => {
    try {
      await examService.publishExam(id);
      fetchExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish exam');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this examination?')) return;
    try {
      await examService.deleteExam(id);
      fetchExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete exam');
    }
  };

  if (loading) return <LoadingSkeleton count={4} className="h-24" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Examination Catalogue</h1>
          <p className="text-xs text-slate-400 mt-1">Configure schedules, proctoring policies, and question pools.</p>
        </div>
        <Link to="/admin/exams/new">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-1.5" />
            Create Exam
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {exams.map((exam) => (
          <Card key={exam._id} className="hover:border-slate-700 transition-all p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-100">{exam.title}</h3>
                  <Badge variant={exam.status === 'published' ? 'success' : 'default'} size="sm">
                    {exam.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{exam.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono pt-1">
                  <span>Duration: {exam.durationMinutes}m</span>
                  <span>•</span>
                  <span>Questions: {exam.questions?.length || 0}</span>
                  <span>•</span>
                  <span>Marks: {exam.totalMarks}</span>
                  <span>•</span>
                  <span>Passing: {exam.passingScore}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {exam.status !== 'published' && (
                  <Button variant="success" size="sm" onClick={() => handlePublish(exam._id)}>
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Publish
                  </Button>
                )}
                <Link to={`/admin/exams/${exam._id}/edit`}>
                  <Button variant="secondary" size="sm">
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(exam._id)}>
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const ExamEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'new';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '1. Maintain a quiet environment.\n2. Do not leave fullscreen mode.\n3. Keep your face centered in the camera.',
    durationMinutes: 45,
    passingScore: 5,
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    questions: [],
    questionRandomization: true,
    optionRandomization: true,
    negativeMarkingEnabled: false,
    warningThreshold: 3,
    autoSubmitThreshold: 5
  });

  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const qData = await questionService.getQuestions({ limit: 100 });
        setAvailableQuestions(qData.questions || []);

        if (isEdit) {
          const exam = await examService.getExamById(id);
          setFormData({
            title: exam.title,
            description: exam.description || '',
            instructions: exam.instructions || '',
            durationMinutes: exam.durationMinutes,
            passingScore: exam.passingScore,
            startTime: new Date(exam.schedule.startTime).toISOString().slice(0, 16),
            endTime: new Date(exam.schedule.endTime).toISOString().slice(0, 16),
            questions: exam.questions?.map((q) => q._id || q) || [],
            questionRandomization: exam.questionRandomization ?? true,
            optionRandomization: exam.optionRandomization ?? true,
            negativeMarkingEnabled: exam.negativeMarkingEnabled ?? false,
            warningThreshold: exam.proctoringPolicy?.warningThreshold || 3,
            autoSubmitThreshold: exam.proctoringPolicy?.autoSubmitThreshold || 5
          });
        }
      } catch (err) {
        console.error('Failed to load editor data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEdit]);

  const toggleQuestionSelection = (qId) => {
    setFormData((prev) => {
      const exists = prev.questions.includes(qId);
      return {
        ...prev,
        questions: exists ? prev.questions.filter((id) => id !== qId) : [...prev.questions, qId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.questions.length === 0) {
      alert('Please select at least one question for the examination.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        durationMinutes: Number(formData.durationMinutes),
        passingScore: Number(formData.passingScore),
        schedule: {
          startTime: new Date(formData.startTime),
          endTime: new Date(formData.endTime)
        },
        questions: formData.questions,
        questionRandomization: formData.questionRandomization,
        optionRandomization: formData.optionRandomization,
        negativeMarkingEnabled: formData.negativeMarkingEnabled,
        proctoringPolicy: {
          webcamRequired: true,
          audioRequired: true,
          mobileCameraRequired: false,
          fullscreenRequired: true,
          warningThreshold: Number(formData.warningThreshold),
          autoSubmitThreshold: Number(formData.autoSubmitThreshold)
        }
      };

      if (isEdit) {
        await examService.updateExam(id, payload);
      } else {
        await examService.createExam(payload);
      }

      navigate('/admin/exams');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save examination.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton count={4} className="h-32" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {isEdit ? 'Configure Examination' : 'New Examination Specification'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Define examination schedule, policies, and questions.</p>
        </div>
        <Button type="submit" variant="primary" size="md" isLoading={saving}>
          {isEdit ? 'Update Examination' : 'Save & Create'}
        </Button>
      </div>

      <Card title="General Details" className="space-y-4">
        <Input
          label="Examination Title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Advanced Algorithms Final Assessment"
        />

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
            Description
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            placeholder="Brief purpose of assessment..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Duration (Minutes)"
            type="number"
            min={1}
            required
            value={formData.durationMinutes}
            onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
          />
          <Input
            label="Passing Marks"
            type="number"
            min={0}
            required
            value={formData.passingScore}
            onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Schedule Start"
            type="datetime-local"
            required
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          />
          <Input
            label="Schedule End Window"
            type="datetime-local"
            required
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          />
        </div>
      </Card>

      <Card title="Proctoring & Integrity Escalation Policies" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Warning Escalation Threshold"
            type="number"
            min={1}
            value={formData.warningThreshold}
            onChange={(e) => setFormData({ ...formData, warningThreshold: e.target.value })}
            helperText="Number of qualifying infractions before severe warning"
          />
          <Input
            label="Auto-Submission Violation Limit"
            type="number"
            min={1}
            value={formData.autoSubmitThreshold}
            onChange={(e) => setFormData({ ...formData, autoSubmitThreshold: e.target.value })}
            helperText="Exam forces auto-submission upon reaching this count"
          />
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={formData.questionRandomization}
              onChange={(e) => setFormData({ ...formData, questionRandomization: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-brand-500"
            />
            <span>Shuffle Questions per Candidate</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={formData.optionRandomization}
              onChange={(e) => setFormData({ ...formData, optionRandomization: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-brand-500"
            />
            <span>Shuffle Options per Question</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={formData.negativeMarkingEnabled}
              onChange={(e) => setFormData({ ...formData, negativeMarkingEnabled: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-brand-500"
            />
            <span>Enable Negative Marking Penalties</span>
          </label>
        </div>
      </Card>

      <Card
        title={`Select Examination Questions (${formData.questions.length} Selected)`}
        subtitle="Check questions to include from the central question bank"
      >
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {availableQuestions.map((q) => {
            const isSelected = formData.questions.includes(q._id);
            return (
              <div
                key={q._id}
                onClick={() => toggleQuestionSelection(q._id)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-brand-600/15 border-brand-500 text-brand-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" size="sm">
                      {q.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-400">{q.marks} Mark(s)</span>
                  </div>
                  <p className="text-xs font-medium line-clamp-1">{q.text}</p>
                </div>
                <div className="text-xs font-semibold">
                  {isSelected ? '✓ Added' : '+ Add'}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </form>
  );
};
