import { API_PATHS } from '@/constants/api'
import type { RiskDisposition, RiskPollResult, Strictness } from '@/types/api'

import { request } from './http'

export interface CreateReviewTaskParams {
  kbId: string
  tenderDocId: string
  targetDocId: string
  checklistId: string
  strictness: Strictness
  useHistory: boolean
  fromWriteTaskId: string | null
}

export function createReviewTask(
  params: CreateReviewTaskParams,
): Promise<{ taskId: string; reviewTaskId: string; status: 'RUNNING' }> {
  return request<{ taskId: string; reviewTaskId: string; status: 'RUNNING' }>({
    method: 'POST',
    url: API_PATHS.review.tasks,
    data: params,
  })
}

export function getReviewTask(taskId: string): Promise<RiskPollResult> {
  return request<RiskPollResult>({
    method: 'GET',
    url: API_PATHS.review.task(taskId),
  })
}

export function pollRisks(taskId: string, since?: string): Promise<RiskPollResult> {
  return request<RiskPollResult>({
    method: 'GET',
    url: API_PATHS.review.risks(taskId),
    params: { since },
  })
}

export function disposeRisk(
  riskId: string,
  params: {
    disposition: RiskDisposition
    ignoreReason: string | null
    userEditedText: string | null
  },
): Promise<void> {
  return request<void>({
    method: 'POST',
    url: API_PATHS.review.disposition(riskId),
    data: params,
  })
}

export function exportReviewTask(taskId: string, format: 'docx' | 'pdf'): Promise<{ downloadUrl: string; async: boolean }> {
  return request<{ downloadUrl: string; async: boolean }>({
    method: 'POST',
    url: API_PATHS.review.export(taskId),
    data: { format },
  })
}
