<template>
  <PageHeader compact title="AI 问答" description="RAG 检索、SSE 流式回答、原文引用与反馈。">
    <template #actions>
      <span class="kb-meta-pill">
        <RadioTower />
        首 Token {{ chatStore.firstTokenMs ?? '--' }} ms
      </span>
    </template>
  </PageHeader>

  <div class="kb-grid">
    <SessionList
      :sessions="chatStore.sessions"
      :active-id="chatStore.currentSessionId"
      @select="chatStore.setCurrentSession"
      @create="handleCreateSession"
    />

    <section class="panel chat-panel">
      <div class="chat-tabs">
        <button
          v-for="session in chatStore.sessions"
          :key="session.sessionId"
          class="chat-tab"
          :class="{ active: session.sessionId === chatStore.currentSessionId }"
          type="button"
          @click="chatStore.setCurrentSession(session.sessionId)"
        >
          <span class="tab-dot" />
          <span class="tab-title">{{ session.title || '新对话' }}</span>
        </button>
        <button class="chat-tab-add" type="button" aria-label="新建会话" @click="handleCreateSession">
          <Plus />
        </button>
        <span class="chat-tabs-meta">Java SSE 透传</span>
      </div>

      <div class="chat-stream">
        <StreamMessage
          v-for="message in chatStore.currentMessages"
          :key="message.messageId"
          :message="message"
          @open-citation="activeCitation = $event"
        />
        <EmptyState
          v-if="chatStore.currentMessages.length === 0"
          title="开始一次问答"
          description="选择知识库范围后输入问题，答案会携带原文引用和置信度。"
        />
      </div>

      <form class="composer" @submit.prevent="handleSend">
        <div class="composer-filters">
          <span class="filter-label">范围</span>
          <button
            v-for="kb in kbStore.kbList"
            :key="kb.kbId"
            class="chip"
            :class="{ on: selectedScope.includes(kb.kbId) }"
            type="button"
            @click="toggleScope(kb.kbId)"
          >
            {{ kb.name }}
          </button>
          <span class="filter-divider" />
          <span class="filter-label">模式</span>
          <span class="toggle-group">
            <button type="button" :class="{ on: mode === 'precise' }" @click="mode = 'precise'">精准</button>
            <button type="button" :class="{ on: mode === 'creative' }" @click="mode = 'creative'">创意</button>
          </span>
          <span class="perm-tip"><ShieldCheck /> 已过滤无权文档</span>
        </div>
        <div class="composer-input">
          <textarea
            v-model.trim="query"
            :disabled="chatStore.isStreaming"
            placeholder="输入问题，支持 @文档 限定检索范围"
            rows="3"
            @keydown.ctrl.enter.prevent="handleSend"
          />
          <div class="composer-tools">
            <button class="tool-btn" type="button" @click="query += ' @'">
              <AtSign />
              @文档
            </button>
            <span class="composer-hint">Ctrl Enter 发送 · 最长 2000 字</span>
            <button v-if="chatStore.isStreaming" class="btn" type="button" @click="chatStore.abortStream">
              <Square />
              停止
            </button>
            <button v-else class="composer-send" type="submit">
              <Send />
            </button>
          </div>
        </div>
      </form>
    </section>

    <aside class="panel">
      <div class="panel-head">
        <h3>引用与范围</h3>
        <span class="meta">默认展开前 3 条</span>
      </div>
      <div class="panel-body">
        <div v-if="activeCitation" class="citation-preview">
          <h4>{{ activeCitation.docName }}</h4>
          <p class="mono">
            P.{{ activeCitation.page }} · {{ activeCitation.paragraphId }}
          </p>
          <p>{{ activeCitation.snippet }}</p>
        </div>
        <div class="scope-list">
          <button v-for="kb in kbStore.kbList" :key="kb.kbId" class="recent-doc" type="button">
            <span class="tag">KB</span>
            <span class="name">{{ kb.name }}</span>
            <span class="time">{{ kb.documentCount }} docs</span>
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  AtSign,
  Plus,
  RadioTower,
  Send,
  ShieldCheck,
  Square,
} from 'lucide-vue-next'
import { onMounted, ref } from 'vue'

import SessionList from '@/components/chat/SessionList.vue'
import StreamMessage from '@/components/chat/StreamMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useChatStore } from '@/stores/chat'
import { useKbStore } from '@/stores/kb'
import type { ChatMode, Citation } from '@/types/api'

const chatStore = useChatStore()
const kbStore = useKbStore()
const query = ref('')
const mode = ref<ChatMode>('precise')
const selectedScope = ref<string[]>(['kb-1', 'kb-2'])
const activeCitation = ref<Citation | null>(null)

function toggleScope(kbId: string): void {
  selectedScope.value = selectedScope.value.includes(kbId)
    ? selectedScope.value.filter((id) => id !== kbId)
    : [...selectedScope.value, kbId]
}

async function handleCreateSession(): Promise<void> {
  await chatStore.createNewSession(selectedScope.value, mode.value)
}

function handleSend(): void {
  if (!query.value) {
    ElMessage.warning('请先输入问题内容')
    return
  }
  if (query.value.length > 2000) {
    ElMessage.warning('问题超过 2000 字，请拆分后再发送')
    return
  }
  if (selectedScope.value.length === 0) {
    ElMessage.warning('请至少选择一个知识库范围')
    return
  }
  chatStore.startStream(query.value, mode.value)
  query.value = ''
}

onMounted(() => {
  void chatStore.fetchSessions()
  void kbStore.fetchList()
})
</script>
