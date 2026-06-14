import { API_PATHS } from '@/constants/api'
import type { LoginParams, LoginResult, UserProfile } from '@/types/api'

import { request } from './http'

export function login(params: LoginParams): Promise<LoginResult> {
  return request<LoginResult>({
    method: 'POST',
    url: API_PATHS.auth.login,
    data: params,
  })
}

export function fetchCurrentUser(): Promise<UserProfile> {
  return request<UserProfile>({
    method: 'GET',
    url: API_PATHS.auth.me,
  })
}
