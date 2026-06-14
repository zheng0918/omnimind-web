import { API_PATHS } from '@/constants/api'
import type { ScorePoint, WriteTask } from '@/types/api'

import { request } from './http'
import { createSSE, type SseEventPayload, type SseHandle } from './sse'

export interface CreateWriteTaskParams {
  kbId: string
  tenderDocId: string
  useHistory: boolean
  projectParams: {
    projectName: string
    client: string
    scale: string
    winDate: string | null
  }
}

export function createWriteTask(params: CreateWriteTaskParams): Promise<WriteTask> {
  return request<WriteTask>({
    method: 'POST',
    url: API_PATHS.write.tasks,
    data: params,
  })
}

export function getWriteTask(taskId: string): Promise<WriteTask & { scorePoints: ScorePoint[] }> {
  return request<WriteTask & { scorePoints: ScorePoint[] }>({
    method: 'GET',
    url: API_PATHS.write.task(taskId),
  })
}

export function openOutlineStream(
  taskId: string,
  params: {
    token?: string
    onEvent: (payload: SseEventPayload) => void
    onError: (message: string) => void
    onDone?: () => void
  },
): SseHandle {
  return createSSE(API_PATHS.write.outlineStream(taskId), params)
}

export function openSectionStream(
  taskId: string,
  sectionId: string,
  params: {
    token?: string
    onEvent: (payload: SseEventPayload) => void
    onError: (message: string) => void
    onDone?: () => void
  },
): SseHandle {
  return createSSE(API_PATHS.write.sectionStream(taskId, sectionId), params)
}

export function saveSection(taskId: string, sectionId: string, contentMd: string): Promise<void> {
  return request<void>({
    method: 'PUT',
    url: API_PATHS.write.saveSection(taskId, sectionId),
    data: { contentMd },
  })
}

export function triggerResponseCheck(taskId: string): Promise<{ scorePoints: ScorePoint[] }> {
  return request<{ scorePoints: ScorePoint[] }>({
    method: 'POST',
    url: API_PATHS.write.checkResponse(taskId),
  })
}

export function submitWriteToReview(
  taskId: string,
): Promise<{ reviewTaskCreated: boolean; reviewTaskId: string; draftDocId: string }> {
  return request<{ reviewTaskCreated: boolean; reviewTaskId: string; draftDocId: string }>({
    method: 'POST',
    url: API_PATHS.write.submitReview(taskId),
    data: {},
  })
}
