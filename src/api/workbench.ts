import { API_PATHS } from '@/constants/api'
import type { WorkbenchSummary } from '@/types/api'

import { request } from './http'

export function fetchWorkbenchSummary(): Promise<WorkbenchSummary> {
  return request<WorkbenchSummary>({
    method: 'GET',
    url: API_PATHS.workbench.summary,
  })
}
