import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 代理目标 = omnimind-server（Java 网关）。可用 VITE_PROXY_TARGET 覆盖，默认本地 8200。
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8200'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        // 前端走相对路径 /api/v1/...，由 Vite 同源转发到后端，避免浏览器跨域（CORS）。
        // SSE（text/event-stream）默认即以流式透传，无需额外配置。
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
