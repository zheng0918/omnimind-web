<template>
  <aside class="panel kb-side">
    <div class="panel-head">
      <h3><History class="ph-icon" /> 历史对话</h3>
      <span class="meta">{{ sessions.length }} 条</span>
    </div>
    <label class="kb-history-search">
      <Search />
      <input v-model="keyword" aria-label="搜索历史对话" placeholder="搜索历史对话..." type="search" />
    </label>
    <div class="panel-body tight">
      <div class="history-list">
        <template v-for="group in groupedSessions" :key="group.label">
          <p class="history-group-title">{{ group.label }}</p>
          <div
            v-for="session in group.items"
            :key="session.sessionId"
            class="history-item"
            :class="{ active: session.sessionId === activeId }"
          >
            <button class="history-item-main" type="button" @click="$emit('select', session.sessionId)">
              <span class="t">{{ session.title || '未命名会话' }}</span>
              <span class="s">{{ subtitle(session) }}</span>
            </button>
            <button
              class="history-item-del"
              type="button"
              aria-label="删除会话"
              title="删除会话"
              @click.stop="$emit('delete', session.sessionId)"
            >
              <Trash2 />
            </button>
          </div>
        </template>
        <p v-if="filteredSessions.length === 0" class="history-empty">
          {{ keyword ? '没有匹配的会话' : '暂无历史会话' }}
        </p>
      </div>
    </div>
    <div class="kb-side-foot">
      <button class="btn sm full" type="button" @click="$emit('create')">
        <Plus />
        新建对话
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { History, Plus, Search, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { ChatSession } from '@/types/api'

const props = defineProps<{
  sessions: ChatSession[]
  activeId: string
}>()

defineEmits<{
  select: [sessionId: string]
  create: []
  delete: [sessionId: string]
}>()

const keyword = ref('')

const filteredSessions = computed(() => {
  const normalized = keyword.value.trim().toLowerCase()
  if (!normalized) return props.sessions
  return props.sessions.filter((session) =>
    (session.title ?? '未命名会话').toLowerCase().includes(normalized),
  )
})

// 按更新时间分组：今天 / 昨天 / 更早（对齐原型的「今天/昨天/本周」分组形态）。
const groupedSessions = computed(() => {
  const groups: { label: string; items: ChatSession[] }[] = [
    { label: '今天', items: [] },
    { label: '昨天', items: [] },
    { label: '更早', items: [] },
  ]
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86400000
  for (const session of filteredSessions.value) {
    const t = new Date(session.updatedAt).getTime()
    if (Number.isNaN(t) || t >= startOfToday) groups[0].items.push(session)
    else if (t >= startOfYesterday) groups[1].items.push(session)
    else groups[2].items.push(session)
  }
  return groups.filter((group) => group.items.length > 0)
})

function subtitle(session: ChatSession): string {
  const d = new Date(session.updatedAt)
  const time = Number.isNaN(d.getTime())
    ? ''
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · `
  return `${time}${session.messageCount} 轮 · ${session.mode === 'precise' ? '精准' : '创意'}`
}
</script>
