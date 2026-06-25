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
      <div v-if="userStore.role === 'admin'" class="nav-group" :class="{ open: sysOpen }">
        <button class="nav-item nav-group-head" type="button" @click="sysOpen = !sysOpen">
          <Settings />
          <span>系统管理</span>
          <ChevronDown class="nav-caret" />
        </button>
        <div class="nav-sub">
          <button
            v-for="tab in SYS_TABS"
            :key="tab.value"
            class="nav-item nav-sub-item"
            :class="{ active: isSysActive(tab.value) }"
            type="button"
            @click="goSys(tab.value)"
          >
            <span class="nav-dot" />
            <span>{{ tab.label }}</span>
          </button>
        </div>
      </div>
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
  ChevronDown,
  Database,
  LayoutDashboard,
  MessagesSquare,
  ScanSearch,
  Settings,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routes'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const userInitial = computed(() => userStore.realName.slice(0, 1))
const roleLabel = computed(() => {
  const labels = { admin: '管理员', editor: '编辑者', viewer: '只读用户' }
  return labels[userStore.role]
})

// 系统管理子菜单：每项经 ?tab= 切换 sys 页对应面板，默认 users。
const SYS_TABS = [
  { value: 'users', label: '用户管理' },
  { value: 'roles', label: '角色与权限' },
  { value: 'dicts', label: '字典配置' },
  { value: 'logs', label: '操作日志' },
] as const

const onSysRoute = computed(() => route.path === ROUTE_PATHS.sys)
// 进入系统管理任一子页时自动展开分组；可手动收起/展开。
const sysOpen = ref(onSysRoute.value)
watch(onSysRoute, (active) => {
  if (active) sysOpen.value = true
})

function isSysActive(tab: string): boolean {
  if (!onSysRoute.value) return false
  return (route.query.tab ?? 'users') === tab
}

function goSys(tab: string): void {
  void router.push({ path: ROUTE_PATHS.sys, query: { tab } })
}
</script>
