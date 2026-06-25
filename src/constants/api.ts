export const API_PREFIX = '/api/v1'

export const API_PATHS = {
  auth: {
    login: `${API_PREFIX}/auth/login`,
    me: `${API_PREFIX}/auth/me`,
  },
  workbench: {
    summary: `${API_PREFIX}/workbench/summary`,
  },
  kb: {
    list: `${API_PREFIX}/kb`,
    detail: (kbId: string) => `${API_PREFIX}/kb/${kbId}`,
    documents: (kbId: string) => `${API_PREFIX}/kb/${kbId}/documents`,
  },
  document: {
    remove: (docId: string) => `${API_PREFIX}/documents/${docId}`,
    parseStatus: (docId: string) => `${API_PREFIX}/documents/${docId}/parse-status`,
    reparse: (docId: string) => `${API_PREFIX}/documents/${docId}/reparse`,
    download: (docId: string) => `${API_PREFIX}/documents/${docId}/download`,
  },
  chat: {
    sessions: `${API_PREFIX}/chat/sessions`,
    session: (sessionId: string) => `${API_PREFIX}/chat/sessions/${sessionId}`,
    stream: (sessionId: string) => `${API_PREFIX}/chat/sessions/${sessionId}/stream`,
    feedback: (messageId: string) => `${API_PREFIX}/chat/messages/${messageId}/feedback`,
  },
  review: {
    tasks: `${API_PREFIX}/review/tasks`,
    task: (taskId: string) => `${API_PREFIX}/review/tasks/${taskId}`,
    risks: (taskId: string) => `${API_PREFIX}/review/tasks/${taskId}/risks`,
    disposition: (riskId: string) => `${API_PREFIX}/review/risks/${riskId}/disposition`,
    export: (taskId: string) => `${API_PREFIX}/review/tasks/${taskId}/export`,
  },
  write: {
    tasks: `${API_PREFIX}/write/tasks`,
    task: (taskId: string) => `${API_PREFIX}/write/tasks/${taskId}`,
    outlineStream: (taskId: string) => `${API_PREFIX}/write/tasks/${taskId}/outline/stream`,
    sectionStream: (taskId: string, sectionId: string) =>
      `${API_PREFIX}/write/tasks/${taskId}/sections/${sectionId}/stream`,
    saveSection: (taskId: string, sectionId: string) =>
      `${API_PREFIX}/write/tasks/${taskId}/sections/${sectionId}`,
    checkResponse: (taskId: string) => `${API_PREFIX}/write/tasks/${taskId}/check-response`,
    submitReview: (taskId: string) => `${API_PREFIX}/write/tasks/${taskId}/submit-review`,
    export: (taskId: string) => `${API_PREFIX}/write/tasks/${taskId}/export`,
  },
  task: {
    list: `${API_PREFIX}/tasks`,
  },
  sys: {
    users: `${API_PREFIX}/sys/users`,
    userRole: (userId: string) => `${API_PREFIX}/sys/users/${userId}/role`,
    roles: `${API_PREFIX}/sys/roles`,
    dicts: `${API_PREFIX}/sys/dicts`,
    auditLogs: `${API_PREFIX}/sys/audit-logs`,
  },
} as const
