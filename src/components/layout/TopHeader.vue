<template>
  <header class="header">
    <div class="crumbs">
      <RouterLink :to="ROUTE_PATHS.workbench">
        首页
      </RouterLink>
      <span class="sep">{{ isHome ? '·' : '/' }}</span>
      <span class="curr">{{ route.meta.title }}</span>
    </div>

    <div class="header-right">
      <button class="scope-switch" type="button" @click="cycleScope">
        <Eye />
        <span>{{ scopeLabel }}</span>
        <ChevronDown class="caret" />
      </button>

      <label class="search-box">
        <Search />
        <input aria-label="全局搜索" placeholder="全局搜索（文档 / 客户 / 标书 / 预警 ⌘K）" type="search" />
      </label>

      <button class="icon-btn" type="button" aria-label="帮助">
        <CircleHelp />
      </button>
      <button class="icon-btn" type="button" aria-label="通知">
        <Bell />
        <span class="dot" />
      </button>
      <button class="user-pill" type="button" @click="handleLogout">
        <span class="avatar-sm">{{ userInitial }}</span>
        <span>{{ userStore.realName }}</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Bell, ChevronDown, CircleHelp, Eye, Search } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routes'
import { useUserStore } from '@/stores/user'
import type { Scope } from '@/types/api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const scopeNames: Record<Scope, string> = {
  sales: '销售视角',
  bid: '投标视角',
  admin: '管理员',
}

const isHome = computed(() => route.path === ROUTE_PATHS.workbench)
const scopeLabel = computed(() => scopeNames[userStore.currentScope])
const userInitial = computed(() => userStore.realName.slice(0, 1))

function cycleScope(): void {
  const scopes = userStore.allowedScopes
  const currentIndex = scopes.indexOf(userStore.currentScope)
  userStore.currentScope = scopes[(currentIndex + 1) % scopes.length] ?? 'bid'
}

function handleLogout(): void {
  userStore.logout()
  void router.push(ROUTE_PATHS.login)
}
</script>
