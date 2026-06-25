import { API_PATHS } from '@/constants/api'
import type { PageResult, TaskListItem } from '@/types/api'

import { request } from './http'

export function listTasks(params: {
  type?: string
  status?: string
  pageNum: number
  pageSize: number
}): Promise<PageResult<TaskListItem>> {
  return request<PageResult<TaskListItem>>({
    method: 'GET',
    url: API_PATHS.task.list,
    params,
  })
}
