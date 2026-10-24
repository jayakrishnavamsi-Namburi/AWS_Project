import api from './api';

export const authService = {
  async register(data) {
    const res = await api.post('/auth/register', data);
    if (res.data?.token) {
      localStorage.setItem('secureproctor_token', res.data.token);
      localStorage.setItem('secureproctor_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async login(credentials) {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.token) {
      localStorage.setItem('secureproctor_token', res.data.token);
      localStorage.setItem('secureproctor_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('secureproctor_token');
      localStorage.removeItem('secureproctor_user');
    }
  },

  async getMe() {
    const res = await api.get('/auth/me');
    if (res.data?.user) {
      localStorage.setItem('secureproctor_user', JSON.stringify(res.data.user));
    }
    return res.data.user;
  },

  async forgotPassword(email) {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token, newPassword) {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    return res.data;
  }
};

export const examService = {
  async getExams(params) {
    const res = await api.get('/exams', { params });
    return res.data;
  },

  async getExamById(id) {
    const res = await api.get(`/exams/${id}`);
    return res.data.exam;
  },

  async createExam(data) {
    const res = await api.post('/exams', data);
    return res.data.exam;
  },

  async updateExam(id, data) {
    const res = await api.patch(`/exams/${id}`, data);
    return res.data.exam;
  },

  async deleteExam(id) {
    const res = await api.delete(`/exams/${id}`);
    return res.data;
  },

  async publishExam(id) {
    const res = await api.post(`/exams/${id}/publish`);
    return res.data.exam;
  },

  async assignStudents(id, studentIds) {
    const res = await api.post(`/exams/${id}/assign`, { studentIds });
    return res.data.exam;
  }
};

export const questionService = {
  async getQuestions(params) {
    const res = await api.get('/questions', { params });
    return res.data;
  },

  async getQuestionById(id) {
    const res = await api.get(`/questions/${id}`);
    return res.data.question;
  },

  async createQuestion(data) {
    const res = await api.post('/questions', data);
    return res.data.question;
  },

  async updateQuestion(id, data) {
    const res = await api.patch(`/questions/${id}`, data);
    return res.data.question;
  },

  async deleteQuestion(id) {
    const res = await api.delete(`/questions/${id}`);
    return res.data;
  }
};

export const sessionService = {
  async startSession(examId, deviceCheck) {
    const res = await api.post('/exam-sessions', { examId, deviceCheck });
    return res.data;
  },

  async getSession(id) {
    const res = await api.get(`/exam-sessions/${id}`);
    return res.data;
  },

  async saveAnswer(sessionId, questionId, payload) {
    const res = await api.put(`/exam-sessions/${sessionId}/answers/${questionId}`, payload);
    return res.data;
  },

  async heartbeat(sessionId) {
    const res = await api.post(`/exam-sessions/${sessionId}/heartbeat`);
    return res.data;
  },

  async submitSession(sessionId, terminationReason) {
    const res = await api.post(`/exam-sessions/${sessionId}/submit`, { terminationReason });
    return res.data;
  }
};

export const proctorService = {
  async createPairingToken(sessionId) {
    const res = await api.post(`/proctoring/sessions/${sessionId}/pair`);
    return res.data;
  },

  async verifyPairing(pairingToken, deviceInfo) {
    const res = await api.post('/proctoring/pair/verify', { pairingToken, deviceInfo });
    return res.data;
  },

  async recordEvent(sessionId, eventData) {
    const res = await api.post(`/proctoring/sessions/${sessionId}/events`, eventData);
    return res.data;
  },

  async getLiveSessions(examId) {
    const res = await api.get('/proctoring/live', { params: { examId } });
    return res.data.sessions;
  },

  async getSessionEvents(sessionId) {
    const res = await api.get(`/proctoring/sessions/${sessionId}/events`);
    return res.data.events;
  },

  async reviewEvent(eventId, reviewStatus, reviewNotes) {
    const res = await api.patch(`/proctoring/events/${eventId}/review`, { reviewStatus, reviewNotes });
    return res.data.event;
  },

  async terminateSession(sessionId, reason) {
    const res = await api.post(`/proctoring/sessions/${sessionId}/terminate`, { reason });
    return res.data;
  }
};

export const analyticsService = {
  async getAdminStats() {
    const res = await api.get('/analytics/dashboard');
    return res.data.stats;
  },

  async getExamStats(examId) {
    const res = await api.get(`/analytics/exams/${examId}`);
    return res.data.data;
  },

  async getResults(params) {
    const res = await api.get('/results', { params });
    return res.data;
  },

  async getResultById(id) {
    const res = await api.get(`/results/${id}`);
    return res.data.result;
  },

  getExportCSVUrl(examId) {
    return `/api/v1/analytics/exams/${examId}/export`;
  }
};
