/**
 * POC 种子数据：第一期在后端联调前用于驱动各页面展示，字段严格遵循 interfaceContract.md。
 * 各 store 在接口不可用时回退到这里，保证演示态页面不空白。联调完成后可整体移除。
 */
import type {
  ChatMessage,
  ChatSession,
  DocumentItem,
  KnowledgeBase,
  OutlineNode,
  ReviewRisk,
  ReviewTask,
  ScorePoint,
  UserProfile,
  WorkbenchSummary,
  WriteSection,
  WriteTask,
} from '@/types/api'

export const seedUser: UserProfile = {
  userId: 'u-001',
  username: 'zhangwei',
  realName: '张华',
  role: 'admin',
  accessibleKbIds: ['kb-1', 'kb-2', 'kb-3'],
  allowedScopes: ['sales', 'bid', 'admin'],
}

export const seedWorkbench: WorkbenchSummary = {
  kpis: {
    todayQuestions: 12,
    weekReviews: 5,
    kbUsagePercent: 68,
    pendingTasks: 7,
  },
  activityTrend: [
    { date: '2026-06-01', questions: 8, reviews: 2 },
    { date: '2026-06-02', questions: 12, reviews: 3 },
    { date: '2026-06-03', questions: 9, reviews: 4 },
    { date: '2026-06-04', questions: 16, reviews: 3 },
    { date: '2026-06-05', questions: 14, reviews: 5 },
    { date: '2026-06-06', questions: 20, reviews: 4 },
    { date: '2026-06-07', questions: 18, reviews: 6 },
    { date: '2026-06-08', questions: 22, reviews: 7 },
    { date: '2026-06-09', questions: 19, reviews: 5 },
    { date: '2026-06-10', questions: 25, reviews: 8 },
    { date: '2026-06-11', questions: 21, reviews: 6 },
    { date: '2026-06-12', questions: 27, reviews: 8 },
    { date: '2026-06-13', questions: 24, reviews: 7 },
    { date: '2026-06-14', questions: 29, reviews: 9 },
  ],
  kbHealth: {
    totalDocs: 487,
    parsedDocs: 480,
    failedDocs: 7,
  },
  hotQuestions: [
    { text: '投标保证金承诺函需要覆盖哪些字段？', count: 18 },
    { text: '施工组织设计评分点如何响应？', count: 14 },
    { text: '类似教学楼项目有哪些历史素材可复用？', count: 12 },
    { text: '合同专用条款的付款节点是否合规？', count: 9 },
  ],
  recentTasks: [
    { taskId: 't-1', type: 'REVIEW', title: '北方机械投标文件审查', status: 'RUNNING' },
    { taskId: 't-2', type: 'WRITE', title: 'XX学校教学楼技术标初稿', status: 'GENERATING' },
    { taskId: 't-3', type: 'KB', title: '建筑规范库新增 12 份文档', status: 'DONE' },
  ],
}

export const seedKbs: KnowledgeBase[] = [
  {
    kbId: 'kb-1',
    name: '建筑规范库',
    description: '建筑工程、招投标、施工组织设计标准文档。',
    ownerId: 'u-001',
    documentCount: 128,
    sizeBytes: 1024 * 1024 * 812,
    updatedAt: '2026-06-14T09:40:00+08:00',
    members: [
      { userId: 'u-001', realName: '张华', permission: 'write' },
      { userId: 'u-002', realName: '李敏', permission: 'read' },
    ],
  },
  {
    kbId: 'kb-2',
    name: '历史标书素材库',
    description: '沉淀过往投标文件、章节素材、评分点响应片段。',
    ownerId: 'u-001',
    documentCount: 246,
    sizeBytes: 1024 * 1024 * 1390,
    updatedAt: '2026-06-13T18:12:00+08:00',
  },
  {
    kbId: 'kb-3',
    name: '企业制度与合同库',
    description: '企业制度、合同模板、风控条款与审批制度。',
    ownerId: 'u-003',
    documentCount: 93,
    sizeBytes: 1024 * 1024 * 286,
    updatedAt: '2026-06-12T16:20:00+08:00',
  },
]

export const seedDocuments: DocumentItem[] = [
  {
    documentId: 'doc-1',
    kbId: 'kb-1',
    name: 'XX学校教学楼招标文件.pdf',
    sizeBytes: 18_874_368,
    pageCount: 180,
    parseStatus: 'PARSED',
    updatedAt: '2026-06-14T09:18:00+08:00',
  },
  {
    documentId: 'doc-2',
    kbId: 'kb-1',
    name: '建筑工程评分清单.xlsx',
    sizeBytes: 3_276_800,
    pageCount: 12,
    parseStatus: 'PARSED',
    updatedAt: '2026-06-13T17:46:00+08:00',
  },
  {
    documentId: 'doc-3',
    kbId: 'kb-1',
    name: '投标文件模板.docx',
    sizeBytes: 8_490_112,
    pageCount: 74,
    parseStatus: 'PARSING',
    updatedAt: '2026-06-14T10:05:00+08:00',
  },
]

export const seedSessions: ChatSession[] = [
  {
    sessionId: 's-1',
    title: '教学楼项目保证金承诺',
    scope: ['kb-1', 'kb-2'],
    mode: 'precise',
    messageCount: 6,
    updatedAt: '2026-06-14T10:20:00+08:00',
  },
  {
    sessionId: 's-2',
    title: '施工组织设计评分点',
    scope: ['kb-2'],
    mode: 'creative',
    messageCount: 12,
    updatedAt: '2026-06-13T16:30:00+08:00',
  },
]

export const seedMessages: Record<string, ChatMessage[]> = {
  's-1': [
    {
      messageId: 'm-1',
      role: 'user',
      content: '投标保证金承诺函需要覆盖哪些字段？',
      citations: [],
      createdAt: '2026-06-14T10:20:00+08:00',
    },
    {
      messageId: 'm-2',
      role: 'assistant',
      content:
        '需要覆盖保证金金额、有效期、递交方式、退还条件、违约不退还情形，以及法定代表人或授权代表签章。建议将有效期与投标有效期保持一致，并在承诺函末尾加盖单位公章。',
      citations: [
        {
          docId: 'doc-1',
          docName: 'XX学校教学楼招标文件.pdf',
          page: 12,
          paragraphId: 'p-31',
          snippet: '投标保证金承诺应载明金额、有效期、递交方式及违约处理。',
          confidence: 0.92,
        },
      ],
      createdAt: '2026-06-14T10:20:40+08:00',
    },
  ],
}

export const seedReviewTask: ReviewTask = {
  taskId: 't-10',
  reviewTaskId: 'rt-10',
  status: 'RUNNING',
  totalItems: 120,
  doneItems: 85,
  summary: { high: 3, medium: 7, pass: 45 },
}

export const seedRisks: ReviewRisk[] = [
  {
    riskId: 'rk-6',
    severity: 'HIGH',
    riskType: 'missing',
    title: '缺投标保证金承诺',
    description: '正文未发现与保证金有效期、退还条件对应的完整承诺描述。',
    originalText: null,
    suggestedText: '建议补充：我单位承诺按招标文件要求提交投标保证金，并遵守保证金退还及不予退还的相关规定。',
    sourcePage: 12,
    sourceParaId: 'p-31',
    confidence: 0.88,
    disposition: 'PENDING',
    relatedCases: ['mat-3'],
  },
  {
    riskId: 'rk-7',
    severity: 'MEDIUM',
    riskType: 'risk',
    title: '项目经理业绩年限描述不一致',
    description: '资格章节写 5 年，人员简历处写 4 年，可能触发一致性扣分。',
    originalText: '项目经理具备 4 年同类项目管理经验。',
    suggestedText: '统一为 5 年同类项目管理经验，并补充对应项目证明。',
    sourcePage: 38,
    sourceParaId: 'p-86',
    confidence: 0.76,
    disposition: 'PENDING',
    relatedCases: ['mat-7'],
  },
  {
    riskId: 'rk-8',
    severity: 'PASS',
    riskType: 'format',
    title: '封面签章检查通过',
    description: '封面、法定代表人授权委托书均检测到签章区域。',
    originalText: '投标人：XX建设集团有限公司',
    suggestedText: null,
    sourcePage: 1,
    sourceParaId: 'p-01',
    confidence: 0.94,
    disposition: 'PENDING',
    relatedCases: [],
  },
]

export const seedWriteTask: WriteTask = {
  taskId: 't-20',
  writeTaskId: 'wt-20',
  status: 'GENERATING',
  completionPercent: 82,
}

export const seedOutline: OutlineNode[] = [
  {
    nodeId: 'n-1',
    parentId: null,
    title: '第1章 施工组织设计',
    orderIdx: 1,
    sectionId: 'sec-1',
    status: 'DONE',
  },
  {
    nodeId: 'n-2',
    parentId: null,
    title: '第2章 质量保证体系',
    orderIdx: 2,
    sectionId: 'sec-2',
    status: 'GENERATING',
  },
  {
    nodeId: 'n-3',
    parentId: null,
    title: '第3章 安全文明施工',
    orderIdx: 3,
    sectionId: 'sec-3',
    status: 'PENDING',
  },
]

export const seedSections: Record<string, WriteSection> = {
  'sec-1': {
    sectionId: 'sec-1',
    outlineNodeId: 'n-1',
    status: 'DONE',
    savedAt: '2026-06-14T10:48:00+08:00',
    contentMd:
      '## 第1章 施工组织设计\n\n本项目施工组织坚持“目标清晰、资源前置、过程受控、风险闭环”的原则，围绕教学楼工程工期、质量、安全、文明施工等关键目标建立项目管理体系。\n\n### 1.1 项目理解\n\n项目位于既有校园区域，施工期间需兼顾教学秩序、人员通行与材料运输组织。施工总平面布置采用分区围挡、错峰运输与封闭管理策略。',
  },
}

export const seedScorePoints: ScorePoint[] = [
  { pointId: 'sp-1', pointText: '施工总平面布置合理，满足校园施工安全要求', weight: 8, responseStatus: 'DONE' },
  { pointId: 'sp-2', pointText: '关键线路清晰，工期保障措施可执行', weight: 10, responseStatus: 'PARTIAL' },
  { pointId: 'sp-3', pointText: '质量控制体系与材料验收流程完整', weight: 12, responseStatus: 'UNANSWERED' },
]
