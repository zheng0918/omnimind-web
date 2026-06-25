export type Role = 'admin' | 'editor' | 'viewer'
export type Scope = 'sales' | 'bid' | 'admin'
export type Permission = 'read' | 'write'
export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'DONE'
  | 'FAILED'
  | 'PARTIAL'
  | 'ARCHIVED'
  | 'EXTRACTING'
  | 'GENERATING'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  traceId?: string
}

export interface ApiError {
  code: number
  message: string
  traceId?: string
}

export interface PageQuery {
  pageNum: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
}

export interface UserBrief {
  userId: string
  username: string
  realName: string
  role: Role
}

export interface UserProfile extends UserBrief {
  accessibleKbIds: string[]
  allowedScopes: Scope[]
}

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  expireHours: number
  user: UserBrief
}

export interface WorkbenchSummary {
  kpis: {
    todayQuestions: number
    weekReviews: number
    kbUsagePercent: number
    pendingTasks: number
  }
  activityTrend: Array<{
    date: string
    questions: number
    reviews: number
  }>
  kbHealth: {
    totalDocs: number
    parsedDocs: number
    failedDocs: number
  }
  hotQuestions: Array<{
    text: string
    count: number
  }>
  recentTasks: Array<{
    taskId: string
    type: 'REVIEW' | 'WRITE' | 'CHAT' | 'KB'
    title: string
    status: TaskStatus | 'SUCCESS'
  }>
}

export interface KbMember {
  userId: string
  realName?: string
  permission: Permission
}

export interface KnowledgeBase {
  kbId: string
  name: string
  description: string
  ownerId: string
  documentCount: number
  sizeBytes: number
  updatedAt: string
  members?: KbMember[]
}

export type ParseStatus = 'PENDING' | 'PARSING' | 'PARSED' | 'FAILED'

export interface DocumentItem {
  documentId: string
  kbId: string
  name: string
  sizeBytes: number
  mimeType?: string
  pageCount?: number
  parseStatus: ParseStatus
  updatedAt: string
  errorMsg?: string | null
}

export interface UploadDocumentResult {
  documentId: string
  name: string
  sizeBytes: number
  parseStatus: ParseStatus
  parseTaskId: string
}

export interface ParseStatusResult {
  documentId: string
  parseStatus: ParseStatus
  progress: number
  pageCount: number
  errorMsg: string | null
}

export type ChatMode = 'precise' | 'creative'

export interface Citation {
  docId: string
  docName: string
  page: number
  paragraphId: string
  snippet: string
  confidence: number
}

export interface ChatMessage {
  messageId: string
  role: 'user' | 'assistant'
  content: string
  citations: Citation[]
  createdAt: string
  feedback?: 'up' | 'down' | null
  streaming?: boolean
  /** 流式失败时的错误文案（如「未检索到相关资料」），用于在气泡内提示而非留空。 */
  error?: string
}

export interface ChatSession {
  sessionId: string
  title: string | null
  scope: string[]
  mode: ChatMode
  messageCount: number
  updatedAt: string
}

export type Severity = 'HIGH' | 'MEDIUM' | 'PASS'
export type RiskType = 'missing' | 'risk' | 'suggestion' | 'history' | 'format'
export type RiskDisposition = 'PENDING' | 'ACCEPTED' | 'EDITED' | 'IGNORED'
export type Strictness = 'LOOSE' | 'BALANCED' | 'STRICT'

export interface ReviewTask {
  taskId: string
  reviewTaskId: string
  status: TaskStatus
  totalItems: number
  doneItems: number
  summary: {
    high: number
    medium: number
    pass: number
  }
  /** 被审文档 docId，供原文预览与风险定位（后端 getTask 回传，旧任务可能缺省）。 */
  targetDocId?: string
}

export interface ReviewRisk {
  riskId: string
  severity: Severity
  riskType: RiskType
  title: string
  description: string
  originalText: string | null
  suggestedText: string | null
  sourcePage: number
  sourceParaId: string
  confidence: number
  /** 归一化版面包围盒 [x0,y0,x1,y1]（0~1，左上原点），用于在原文 PDF 上画精确高亮框；可空。 */
  bbox: number[] | null
  disposition: RiskDisposition
  relatedCases: string[]
}

export interface RiskPollResult {
  lastId: string
  totalItems: number
  doneItems: number
  status: TaskStatus
  summary: ReviewTask['summary']
  risks: ReviewRisk[]
}

export type WriteSectionStatus = 'PENDING' | 'GENERATING' | 'DONE' | 'USER_EDITED' | 'FAILED'
export type ScoreResponseStatus = 'UNANSWERED' | 'PARTIAL' | 'DONE'

export interface WriteTask {
  taskId: string
  writeTaskId: string
  status: TaskStatus
  completionPercent: number
}

export interface OutlineNode {
  nodeId: string
  parentId: string | null
  title: string
  orderIdx: number
  sectionId: string
  status: WriteSectionStatus
}

export interface WriteSection {
  sectionId: string
  outlineNodeId: string
  contentMd: string
  status: WriteSectionStatus
  savedAt?: string
}

export interface ScorePoint {
  pointId: string
  pointText: string
  weight: number
  responseStatus: ScoreResponseStatus
}

export interface TaskListItem {
  taskId: string
  type: 'REVIEW' | 'WRITE' | 'CHAT' | 'KB'
  title: string
  status: TaskStatus
  updatedAt: string
}

export interface SysUser {
  userId: string
  username: string
  realName: string
  role: Role
  status: 'ENABLED' | 'DISABLED'
  updatedAt: string
}

export interface SysRole {
  role: Role
  name: string
  permissions: string[]
}

export interface SysDictItem {
  dictId: string
  type: string
  label: string
  value: string
  enabled: boolean
}

export interface AuditLog {
  logId: string
  userId: string
  module: string
  action: string
  traceId: string
  createdAt: string
}
