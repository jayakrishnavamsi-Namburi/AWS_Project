export const ROLES = {
  ADMIN: 'admin',
  PROCTOR: 'proctor',
  STUDENT: 'student'
};

export const EXAM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  CANCELLED: 'cancelled'
};

export const SESSION_STATUS = {
  INITIALIZED: 'initialized',
  DEVICE_CHECK: 'device_check',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  TERMINATED: 'terminated' // by proctor or auto-escalation
};

export const TERMINATION_REASON = {
  STUDENT_SUBMITTED: 'student_submitted',
  TIME_EXPIRED: 'time_expired',
  PROCTOR_TERMINATED: 'proctor_terminated',
  AUTO_ESCALATION: 'auto_escalation',
  SYSTEM_ERROR: 'system_error'
};

export const QUESTION_TYPES = {
  MCQ: 'mcq',
  MULTIPLE_SELECT: 'multiple_select',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer'
};

export const PROCTOR_EVENT_TYPES = {
  FULLSCREEN_EXIT: 'fullscreen_exit',
  TAB_BLUR: 'tab_blur',
  PAGE_HIDDEN: 'page_hidden',
  CLIPBOARD_ACTION: 'clipboard_action',
  DEVTOOLS_OPEN_ATTEMPT: 'devtools_open_attempt',
  KEYBOARD_SHORTCUT: 'keyboard_shortcut',
  FACE_ABSENT: 'face_absent',
  MULTIPLE_FACES: 'multiple_faces',
  HEAD_DEVIATION: 'head_deviation',
  AUDIO_SPIKE: 'audio_spike',
  MOBILE_DISCONNECTED: 'mobile_disconnected',
  SUSPICIOUS_INTERVAL: 'suspicious_interval',
  SCREEN_SHARE_STOPPED: 'screen_share_stopped'
};

export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const AUDIT_ACTIONS = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  EXAM_CREATED: 'exam_created',
  EXAM_UPDATED: 'exam_updated',
  EXAM_PUBLISHED: 'exam_published',
  EXAM_DELETED: 'exam_deleted',
  EXAM_SESSION_STARTED: 'exam_session_started',
  EXAM_SESSION_SUBMITTED: 'exam_session_submitted',
  PROCTOR_WARNING_ISSUED: 'proctor_warning_issued',
  PROCTOR_TERMINATION: 'proctor_termination',
  MOBILE_PAIRED: 'mobile_paired',
  RECORDING_ACCESSED: 'recording_accessed'
};
