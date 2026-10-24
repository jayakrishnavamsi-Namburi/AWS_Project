import React, { useState, useEffect } from 'react';
import { questionService } from '../../services';
import { Card, Button, Input, Badge, LoadingSkeleton, Modal } from '../../components/common';
import { HelpCircle, Plus, Search, Trash2, Edit2, Filter } from 'lucide-react';

export const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Question State
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    type: 'mcq',
    marks: 1,
    negativeMarks: 0,
    difficulty: 'medium',
    category: 'General',
    options: [
      { id: 'opt_1', text: '', isCorrect: true },
      { id: 'opt_2', text: '', isCorrect: false },
      { id: 'opt_3', text: '', isCorrect: false },
      { id: 'opt_4', text: '', isCorrect: false }
    ],
    shortAnswerAcceptedAnswers: '',
    explanation: ''
  });

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await questionService.getQuestions({
        search,
        type: typeFilter,
        limit: 50
      });
      setQuestions(data.questions || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  
const handleCreateSubmit = async (e) => {
  e.preventDefault();

  try {
    const payload = {
      ...newQuestion,
      shortAnswerAcceptedAnswers:
        newQuestion.type === 'short_answer'
          ? (Array.isArray(newQuestion.shortAnswerAcceptedAnswers)
              ? newQuestion.shortAnswerAcceptedAnswers
              : newQuestion.shortAnswerAcceptedAnswers
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean))
          : []
    };

    if (newQuestion.type === 'short_answer') {
      delete payload.options;
    }

    await questionService.createQuestion(payload);
    setShowCreateModal(false);
    fetchQuestions();
  } catch (err) {
    console.error('Failed to create question:', err.response?.data || err);
    alert(err.response?.data?.message || 'Failed to create question');
  }
};


  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question from question bank?')) return;
    try {
      await questionService.deleteQuestion(id);
      fetchQuestions();
    } catch (err) {
      alert('Failed to delete question');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Central Question Bank</h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain categorized MCQ, Multiple-Select, True/False, and Short Answer items.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Question
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
          <Input
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions by keyword or topic..."
            className="w-full"
          />
          <Button type="submit" variant="secondary" size="md">
            Search
          </Button>
        </form>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500 w-full sm:w-auto"
        >
          <option value="">All Question Types</option>
          <option value="mcq">Single Choice (MCQ)</option>
          <option value="multiple_select">Multiple Select</option>
          <option value="true_false">True / False</option>
          <option value="short_answer">Short Answer</option>
        </select>
      </div>

      {/* Questions List */}
      {loading ? (
        <LoadingSkeleton count={4} className="h-28" />
      ) : questions.length === 0 ? (
        <Card className="text-center p-8">
          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No questions found matching criteria.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <Card key={q._id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" size="sm">
                      {q.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="default" size="sm">
                      {q.difficulty}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono font-medium">
                      {q.marks} Marks {q.negativeMarks > 0 ? `(-${q.negativeMarks})` : ''}
                    </span>
                    <span className="text-xs text-slate-500">• {q.category}</span>
                  </div>

                  <p className="text-sm font-semibold text-slate-100">{q.text}</p>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`text-xs p-2 rounded-lg border flex items-center gap-2 ${
                            opt.isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                              : 'bg-slate-950/40 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-current" />
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="sm" onClick={() => handleDelete(q._id)}>
                  <Trash2 className="w-4 h-4 text-rose-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Question Creation Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Assessment Question"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Question Text
            </label>
            <textarea
              rows={3}
              required
              value={newQuestion.text}
              onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              placeholder="State the problem clearly..."
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
              <select
                value={newQuestion.type}
                onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
              >
                <option value="mcq">MCQ</option>
                <option value="multiple_select">Multiple Select</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>

            <Input
              label="Marks"
              type="number"
              step="0.5"
              min="0.5"
              value={newQuestion.marks}
              onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
            />

            <Input
              label="Neg Marks"
              type="number"
              step="0.25"
              min="0"
              value={newQuestion.negativeMarks}
              onChange={(e) => setNewQuestion({ ...newQuestion, negativeMarks: Number(e.target.value) })}
            />

            <Input
              label="Category"
              value={newQuestion.category}
              onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
            />
          </div>

          {/* Options Configuration */}
          {(newQuestion.type === 'mcq' || newQuestion.type === 'multiple_select') && (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Options & Correct Answer
              </label>
              {newQuestion.options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={(e) => {
                      const updated = [...newQuestion.options];
                      if (newQuestion.type === 'mcq') {
                        updated.forEach((o) => (o.isCorrect = false));
                      }
                      updated[idx].isCorrect = e.target.checked;
                      setNewQuestion({ ...newQuestion, options: updated });
                    }}
                    className="rounded bg-slate-950 border-slate-700 text-brand-500 w-4 h-4"
                  />
                  <Input
                    value={opt.text}
                    required
                    onChange={(e) => {
                      const updated = [...newQuestion.options];
                      updated[idx].text = e.target.value;
                      setNewQuestion({ ...newQuestion, options: updated });
                    }}
                    placeholder={`Option ${idx + 1} text`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          )}

          {newQuestion.type === 'short_answer' && (
            <Input
              label="Accepted Answers (Comma separated)"
              value={newQuestion.shortAnswerAcceptedAnswers}
              onChange={(e) => setNewQuestion({ ...newQuestion, shortAnswerAcceptedAnswers: e.target.value })}
              placeholder="e.g. ICE, Interactive Connectivity Establishment"
              helperText="Grading will match student submission against these keywords (case-insensitive)"
            />
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Question
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
