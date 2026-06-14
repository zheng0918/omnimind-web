<template>
  <aside class="sidebar">
    <RouterLink class="sidebar-brand" :to="ROUTE_PATHS.workbench">
      <span class="brand-mark">O</span>
      <span class="brand-name">OmniMind<small>POC CONSOLE</small></span>
    </RouterLink>

    <nav class="sidebar-nav" aria-label="主导航">
      <p class="nav-section-title">
        工作台
      </p>
      <RouterLink class="nav-item" :to="ROUTE_PATHS.workbench">
        <LayoutDashboard />
        <span>首页</span>
      </RouterLink>

      <p class="nav-section-title">
        核心 Agent
      </p>
      <RouterLink class="nav-item" :to="ROUTE_PATHS.chat">
        <MessagesSquare />
        <span>AI 问答</span>
      </RouterLink>
      <RouterLink class="nav-item" :to="ROUTE_PATHS.review">
        <ScanSearch />
        <span>智能审查</span>
      </RouterLink>
      <button class="nav-item nav-disabled" type="button" disabled>
        <BellRing />
        <span>异常预警</span>
        <span class="badge muted">一期预留</span>
      </button>

      <p class="nav-section-title">
        管理
      </p>
      <RouterLink class="nav-item" :to="ROUTE_PATHS.kb">
        <Database />
        <span>知识库管理</span>
      </RouterLink>
      <RouterLink v-if="userStore.role === 'admin'" class="nav-item" :to="ROUTE_PATHS.sys">
        <Settings />
        <span>系统管理</span>
      </RouterLink>
    </nav>

    <footer class="sidebar-foot">
      <span class="avatar-sm">{{ userInitial }}</span>
      <span>
        <b>{{ userStore.realName }}</b>
        <small>{{ roleLabel }}</small>
      </span>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import {
  BellRing,
  Database,
  LayoutDashboard,
  MessagesSquare,
  ScanSearch,
  Settings,
} from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routes'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const userInitial = computed(() => userStore.realName.slice(0, 1))
const roleLabel = computed(() => {
  const labels = { admin: '管理员', editor: '编辑者', viewer: '只读用户' }
  return labels[userStore.role]
})
</script>
