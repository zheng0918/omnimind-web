import type { RouteRecordRaw } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routes'
import type { Role } from '@/types/api'

export interface RouteMetaConfig {
  title: string
  requiresAuth?: boolean
  roles?: Role[]
  public?: boolean
}

export const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.login,
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true } satisfies RouteMetaConfig,
  },
  {
    path: ROUTE_PATHS.workbench,
    name: 'workbench',
    component: () => import('@/views/workbench/index.vue'),
    meta: { title: '工作台', requiresAuth: true, roles: ['admin', 'editor', 'viewer'] } satisfies RouteMetaConfig,
  },
  {
    path: ROUTE_PATHS.chat,
    name: 'chat',
    component: () => import('@/views/chat/index.vue'),
    meta: { title: 'AI 问答', requiresAuth: true, roles: ['admin', 'editor', 'viewer'] } satisfies RouteMetaConfig,
  },
  {
    path: ROUTE_PATHS.kb,
    name: 'kb',
    component: () => import('@/views/kb/list.vue'),
    meta: { title: '知识库管理', requiresAuth: true, roles: ['admin', 'editor', 'viewer'] } satisfies RouteMetaConfig,
  },
  {
    path: ROUTE_PATHS.kbDetail,
    name: 'kb-detail',
    component: () => import('@/views/kb/detail.vue'),
    meta: { title: '知识库详情', requiresAuth: true, roles: ['admin', 'editor', 'viewer'] } satisfies RouteMetaConfig,
  },
  {
    // 审查 + 编写双 Tab 合一的工作台（对应原型 ir 视图）。
    path: ROUTE_PATHS.review,
    name: 'review',
    component: () => import('@/views/review/index.vue'),
    meta: { title: '智能审查', requiresAuth: true, roles: ['admin', 'editor'] } satisfies RouteMetaConfig,
  },
  {
    path: ROUTE_PATHS.sys,
    name: 'sys',
    component: () => import('@/views/sys/index.vue'),
    meta: { title: '系统管理', requiresAuth: true, roles: ['admin'] } satisfies RouteMetaConfig,
  },
  {
    path: ROUTE_PATHS.forbidden,
    name: 'forbidden',
    component: () => import('@/views/Forbidden.vue'),
    meta: { title: '无权限', public: true } satisfies RouteMetaConfig,
  },
]
