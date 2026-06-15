import { defineStore } from 'pinia'

import { fetchCurrentUser, login as loginApi } from '@/api/auth'
import type { LoginParams, Role, Scope, UserProfile } from '@/types/api'

import { seedUser } from './pocSeed'

/**
 * 用户态 store（REQ-AUTH）：登录态、角色、视角与权限。
 * token 与 profile 持久化到 localStorage 以支持刷新保活；登出时清除。
 * 角色用于路由守卫与写操作按钮置灰（viewer 只读）。
 */
const TOKEN_KEY = 'omnimind_token'
const PROFILE_KEY = 'omnimind_profile'

interface UserState {
  token: string
  profile: UserProfile | null
  role: Role
  currentScope: Scope
  loading: boolean
}

function readStoredProfile(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: localStorage.getItem(TOKEN_KEY) ?? '',
    profile: readStoredProfile(),
    role: readStoredProfile()?.role ?? 'viewer',
    currentScope: readStoredProfile()?.allowedScopes[0] ?? 'bid',
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    realName: (state) => state.profile?.realName ?? seedUser.realName,
    allowedScopes: (state) => state.profile?.allowedScopes ?? seedUser.allowedScopes,
  },
  actions: {
    persist(token: string, profile: UserProfile): void {
      this.token = token
      this.profile = profile
      this.role = profile.role
      this.currentScope = profile.allowedScopes[0] ?? 'bid'
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    },
    async login(params: LoginParams): Promise<void> {
      this.loading = true
      try {
        const result = await loginApi(params)
        const profile: UserProfile = {
          ...result.user,
          accessibleKbIds: [],
          allowedScopes: ['bid'],
        }
        this.persist(result.token, profile)
        await this.fetchProfile()
      } finally {
        this.loading = false
      }
    },
    async fetchProfile(): Promise<void> {
      if (!this.token) return
      const profile = await fetchCurrentUser()
      this.persist(this.token, profile)
    },
    logout(): void {
      this.token = ''
      this.profile = null
      this.role = 'viewer'
      this.currentScope = 'bid'
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(PROFILE_KEY)
    },
  },
})
