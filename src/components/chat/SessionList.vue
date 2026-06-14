<template>
  <aside class="panel kb-side">
    <div class="panel-head">
      <h3>历史会话</h3>
      <span class="meta">{{ sessions.length }} 条</span>
    </div>
    <label class="kb-history-search">
      <Search />
      <input v-model="keyword" aria-label="搜索会话" placeholder="搜索历史会话" type="search" />
    </label>
    <div class="history-list">
      <p class="history-group-title">
        RECENT
      </p>
      <button
        v-for="session in filteredSessions"
        :key="session.sessionId"
        class="history-item"
        :class="{ active: session.sessionId === activeId }"
        type="button"
        @click="$emit('select', session.sessionId)"
      >
        <span class="t">{{ session.title || '未命名会话' }}</span>
        <span class="s">{{ session.messageCount }} 轮 · {{ session.mode === 'precise' ? '精准' : '创意' }}</span>
      </button>
    </div>
    <div class="kb-side-foot">
      <button class="btn primary full" type="button" @click="$emit('create')">
        <Plus />
        新建会话
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Plus, Search } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { ChatSession } from '@/types/api'

const props = defineProps<{
  sessions: ChatSession[]
  activeId: string
}>()

defineEmits<{
  select: [sessionId: string]
  create: []
}>()

const keyword = ref('')
const filteredSessions = computed(() => {
  const normalized = keyword.value.trim().toLowerCase()
  if (!normalized) return props.sessions
  return props.sessions.filter((session) =>
    (session.title ?? '未命名会话').toLowerCase().includes(normalized),
  )
})
</script>
