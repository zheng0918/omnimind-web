import type { RiskDisposition, Severity, Strictness } from '@/types/api'

export const severityLabel: Record<Severity, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  PASS: '通过',
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
