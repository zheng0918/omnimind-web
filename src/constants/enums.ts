import type { RiskDisposition, RiskType, Severity, Strictness } from '@/types/api'

export const severityLabel: Record<Severity, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  PASS: '通过',
}

// 风险类型 → 中文标签（对齐原型 index-v2.html 的风险筛选 chips）。
export const riskTypeLabel: Record<RiskType, string> = {
  missing: '缺失项',
  risk: '风险条款',
  suggestion: '修改建议',
  history: '历史漏项',
  format: '格式问题',
}

export const dispositionLabel: Record<RiskDisposition, string> = {
  PENDING: '待处置',
  ACCEPTED: '已采纳',
  EDITED: '已编辑',
  IGNORED: '已忽略',
}

export const strictnessLabel: Record<Strictness, string> = {
  LOOSE: '宽松',
  BALANCED: '平衡',
  STRICT: '严格',
}
