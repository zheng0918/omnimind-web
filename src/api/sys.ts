import { API_PATHS } from '@/constants/api'
import type { AuditLog, PageResult, Role, SysDictItem, SysRole, SysUser } from '@/types/api'

import { request } from './http'

// 后端原始字典行（sys_dicts 实体）：与前端 SysDictItem 字段命名不同，需语义映射。
interface BackendDict {
  id: number | string
  dictType: string
  dictKey: string
  dictValue: string
}

// 后端角色项：用 label 表示展示名（前端用 name）。
interface BackendRole {
  role: Role
  label: string
  permissions: string[]
}

// 后端返回 PageResult{list,...}，解包出用户数组。
export async function listUsers(): Promise<SysUser[]> {
  const page = await request<PageResult<SysUser>>({
    method: 'GET',
    url: API_PATHS.sys.users,
  })
  return page.list
}

// 一期固定返回三个内置角色；后端 label 即前端 name。
export async function listRoles(): Promise<SysRole[]> {
  const list = await request<BackendRole[]>({
    method: 'GET',
    url: API_PATHS.sys.roles,
  })
  return list.map((r) => ({ role: r.role, name: r.label, permissions: r.permissions }))
}

export function assignRole(userId: string, role: string): Promise<void> {
  return request<void>({
    method: 'POST',
    url: API_PATHS.sys.userRole(userId),
    data: { role },
  })
}

// 后端返回 PageResult{list,...}，解包并按语义映射到 SysDictItem；
// label（展示名）后端无对应字段，置空；enabled 后端无字段，默认启用。
export async function listDicts(): Promise<SysDictItem[]> {
  const page = await request<PageResult<BackendDict>>({
    method: 'GET',
    url: API_PATHS.sys.dicts,
  })
  return page.list.map((d) => ({
    dictId: String(d.id),
    type: d.dictType,
    label: '',
    value: d.dictValue,
    enabled: true,
  }))
}

export function listAuditLogs(params: {
  userId?: string
  module?: string
  from?: string
  to?: string
  pageNum: number
  pageSize: number
}): Promise<PageResult<AuditLog>> {
  return request<PageResult<AuditLog>>({
    method: 'GET',
    url: API_PATHS.sys.auditLogs,
    params,
  })
}
