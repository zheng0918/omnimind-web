import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

import { ROUTE_PATHS } from '@/constants/routes'
import { useUserStore } from '@/stores/user'
import type { ApiError, ApiResponse } from '@/types/api'
import { createTraceId } from '@/utils/trace'

/**
 * axios 实例与统一请求封装（interfaceContract.md §0.2 / frontendRequirements.md 全局约定）。
 * 职责：
 * - 请求拦截注入 X-Trace-Id / X-Api-Version / Authorization；
 * - 统一解包 {code,message,data,traceId}：code!==0 抛业务错误并 toast；
 * - HTTP 401 跳登录、403 提示无权限、2003 提示角色无操作权限。
 */

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
})

http.interceptors.request.use((config) => {
  const userStore = useUserStore()
  config.headers.set('X-Trace-Id', createTraceId())
  config.headers.set('X-Api-Version', 'v1')

  if (userStore.token) {
    config.headers.set('Authorization', `Bearer ${userStore.token}`)
  }

  return config
})

function toApiError(error: AxiosError<ApiResponse<unknown>>): ApiError {
  const response = error.response
  const payload = response?.data
  return {
    code: payload?.code ?? response?.status ?? 9999,
    message: payload?.message ?? error.message ?? '网络异常，请稍后重试',
    traceId: payload?.traceId,
  }
}

function handleUnauthorized(): void {
  const userStore = useUserStore()
  userStore.logout()
  if (window.location.pathname !== ROUTE_PATHS.login) {
    window.location.assign(ROUTE_PATHS.login)
  }
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<ApiResponse<T>>(config)
    const payload = response.data

    if (payload.code !== 0) {
      const apiError: ApiError = {
        code: payload.code,
        message: payload.message,
        traceId: payload.traceId,
      }

      if (payload.code === 2003) {
        ElMessage.error('当前角色无操作权限，请联系管理员')
      } else {
        ElMessage.error(payload.message)
      }

      return Promise.reject(apiError)
    }

    return payload.data
  } catch (rawError) {
    if (!axios.isAxiosError<ApiResponse<unknown>>(rawError)) {
      return Promise.reject(rawError)
    }

    if (rawError.response?.status === 401) {
      handleUnauthorized()
      return Promise.reject(toApiError(rawError))
    }

    if (rawError.response?.status === 403) {
      ElMessage.error('当前角色无操作权限，请联系管理员')
      return Promise.reject(toApiError(rawError))
    }

    const apiError = toApiError(rawError)
    ElMessage.error(apiError.message || '网络异常，请稍后重试')
    return Promise.reject(apiError)
  }
}
