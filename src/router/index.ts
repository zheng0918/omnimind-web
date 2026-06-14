import { createRouter, createWebHistory } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routes'
import { useUserStore } from '@/stores/user'
import type { Role } from '@/types/api'

import { routes } from './routes'

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    return {
      path: ROUTE_PATHS.login,
      query: { redirect: to.fullPath },
    }
  }

  const roles = to.meta.roles as Role[] | undefined
  if (roles && !roles.includes(userStore.role)) {
    return ROUTE_PATHS.forbidden
  }

  return true
})

router.afterEach((to) => {
  document.title = `OmniMind · ${String(to.meta.title ?? '全智')}`
})
