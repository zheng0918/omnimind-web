import { API_PATHS } from '@/constants/api'
import type { AuditLog, PageResult, SysDictItem, SysRole, SysUser } from '@/types/api'

import { request } from './http'

export function listUsers(): Promise<SysUser[]> {
  return request<SysUser[]>({
    method: 'GET',
    url: API_PATHS.sys.users,
  })
}

export function listRoles(): Promise<SysRole[]> {
  return request<SysRole[]>({
    method: 'GET',
    url: API_PATHS.sys.roles,
  })
}

export function assignRole(userId: string, role: string): Promise<void> {
  return request<void>({
    method: 'POST',
    url: API_PATHS.sys.userRole(userId),
    data: { role },
  })
}

export function listDicts(): Promise<SysDictItem[]> {
  return request<SysDictItem[]>({
    method: 'GET',
    url: API_PATHS.sys.dicts,
  })
}

export function listAuditLogs(params: {
  userId?: string
  module?: string
  from?: string
  to?: string
  page: number
  pageSize: number
}): Promise<PageResult<AuditLog>> {
  return request<PageResult<AuditLog>>({
    method: 'GET',
    url: API_PATHS.sys.auditLogs,
    params,
  })
}
