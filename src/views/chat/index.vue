<template>
  <PageHeader compact title="AI 问答" description="带原文出处的智能问答 · 统一接入企业全部文档资产">
    <template #actions>
      <span class="kb-meta-pill">
        <Database />
        <template v-if="chatStore.firstTokenMs">首 Token {{ chatStore.firstTokenMs }} ms</template>
        <template v-else>同步正常</template>
      </span>
    </template>
  </PageHeader>

  <div class="kb-grid">
    <SessionList
      :sessions="chatStore.sessions"
      :active-id="chatStore.currentSessionId"
      @select="chatStore.setCurrentSession"
      @create="handleCreateSession"
      @delete="handleDeleteSession"
    />

    <section class="panel chat-panel">
      <div class="chat-tabs">
        <div
          v-for="session in chatStore.sessions"
          :key="session.sessionId"
          class="chat-tab"
          :class="{ active: session.sessionId === chatStore.currentSessionId }"
        >
          <button
            class="chat-tab-main"
            type="button"
            @click="chatStore.setCurrentSession(session.sessionId)"
          >
            <span class="tab-dot" />
            <span class="tab-title">{{ session.title || '新对话' }}</span>
          </button>
          <button
            class="chat-tab-close"
            type="button"
            aria-label="关闭会话"
            title="关闭会话"
            @click.stop="handleDeleteSession(session.sessionId)"
          >
            <X />
          </button>
        </div>
        <button
          class="chat-tab-add"
          type="button"
          :disabled="chatStore.creatingSession"
          aria-label="新建会话"
          @click="handleCreateSession"
        >
          <Plus />
        </button>
      </div>

      <div class="chat-stream">
        <StreamMessage
          v-for="message in chatStore.currentMessages"
          :key="message.messageId"
          :message="message"
          @open-citation="activeCitation = $event"
          @feedback="chatStore.setFeedback"
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
          <RouterLink v-if="kbStore.kbList.length === 0" class="scope-empty" :to="{ name: 'kb' }">
            <Database />
            暂无知识库，点此前往「知识库」创建
          </RouterLink>
          <span class="filter-divider" />
          <span class="filter-label">模式</span>
          <span class="toggle-group">
            <button type="button" :class="{ on: mode === 'precise' }" @click="mode = 'precise'">精准</button>
            <button type="button" :class="{ on: mode === 'creative' }" @click="mode = 'creative'">创意</button>
          </span>
          <span class="perm-tip"><ShieldCheck /> 已过滤无权文档</span>
        </div>
        <div class="composer-input">
          <div v-if="mentionedDocs.length" class="mention-chips">
            <span v-for="doc in mentionedDocs" :key="doc.documentId" class="mention-chip">
              <FileText />
              {{ doc.name }}
              <button type="button" aria-label="移除文档" @click="removeMention(doc.documentId)">
                <X />
              </button>
            </span>
          </div>
          <textarea
            ref="composerRef"
            v-model="query"
            :disabled="chatStore.isStreaming"
            placeholder="输入问题，支持 @文档 限定检索范围"
            rows="3"
            @input="onComposerInput"
            @keydown.enter.exact="onComposerKeydown"
            @keydown.esc="mentionOpen = false"
          />
          <!-- @文档 选择浮层：列出所选知识库范围内的文档，按 @ 后关键字过滤 -->
          <div v-if="mentionOpen" class="mention-popover">
            <p v-if="mentionLoading" class="mention-empty">加载文档中…</p>
            <template v-else>
              <button
                v-for="doc in filteredMentionDocs"
                :key="doc.documentId"
                class="mention-option"
                type="button"
                @mousedown.prevent="selectMention(doc)"
              >
                <FileText />
                <span class="mention-name">{{ doc.name }}</span>
                <span class="mention-kb">{{ doc.kbName }}</span>
              </button>
              <p v-if="filteredMentionDocs.length === 0" class="mention-empty">
                {{ mentionScopeDocs.length ? '无匹配文档' : '所选范围内暂无文档' }}
              </p>
            </template>
          </div>
          <div class="composer-tools">
            <button class="tool-btn" type="button" @click="openMentionPicker">
              <AtSign />
              @文档
            </button>
            <span class="composer-hint">Enter 发送 · Shift Enter 换行 · 最长 2000 字</span>
            <button v-if="chatStore.isStreaming" class="btn" type="button" @click="chatStore.abortStream">
              <Square />
              停止
            </button>
            <button v-else class="composer-send" type="submit">
              <Send />
              发送
            </button>
          </div>
        </div>
      </form>
    </section>

    <aside class="panel kb-side">
      <div class="kb-actions">
        <RouterLink class="btn primary" :to="{ name: 'kb' }">
          <Plus />
          新建知识库
        </RouterLink>
        <RouterLink class="btn" :to="{ name: 'kb' }">
          <Upload />
          上传文档
        </RouterLink>
      </div>

      <div class="panel-body tight">
        <!-- 引用来源预览：点击 AI 气泡里的引用时在此展开原文片段 -->
        <div v-if="activeCitation" class="citation-preview">
          <h4>{{ activeCitation.docName }}</h4>
          <p class="mono">P.{{ activeCitation.page }} · {{ activeCitation.paragraphId }}</p>
          <p>{{ activeCitation.snippet }}</p>
        </div>

        <div class="tree">
          <!-- 知识库即检索范围：点击切换是否纳入本次问答 scope -->
          <div
            v-for="kb in kbStore.kbList"
            :key="kb.kbId"
            class="tree-node"
            :class="{ selected: selectedScope.includes(kb.kbId) }"
            role="button"
            tabindex="0"
            @click="toggleScope(kb.kbId)"
            @keydown.enter="toggleScope(kb.kbId)"
          >
            <Folder />
            <span>{{ kb.name }}</span>
            <span class="count">{{ kb.documentCount }}</span>
          </div>

          <p v-if="kbStore.kbList.length === 0" class="tree-empty">
            暂无知识库，<RouterLink :to="{ name: 'kb' }">点此创建</RouterLink>
          </p>

          <template v-if="recentKbs.length">
            <div class="tree-sep" />
            <div class="tree-section">最近访问</div>
            <RouterLink
              v-for="kb in recentKbs"
              :key="`recent-${kb.kbId}`"
              class="tree-node"
              :to="{ name: 'kb-detail', params: { kbId: kb.kbId } }"
            >
              <FileText />
              <span>{{ kb.name }}</span>
            </RouterLink>
          </template>
        </div>
      </div>

      <!-- 容量概览：取自真实库的文档数与体积聚合，非写死 -->
      <div v-if="kbStore.kbList.length" class="kb-capacity">
        <div class="kb-capacity-head">
          <span>知识库容量</span>
          <span class="mono">{{ kbStore.kbList.length }} 个库</span>
        </div>
        <div class="capacity-stats">
          <span><b>{{ totalDocs }}</b> 份文档</span>
          <span><b>{{ formatBytes(totalSize) }}</b> 占用</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  AtSign,
  Database,
  FileText,
  Folder,
  Plus,
  Send,
  ShieldCheck,
  Square,
  Upload,
  X,
} from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { listDocuments } from '@/api/document'
import SessionList from '@/components/chat/SessionList.vue'
import StreamMessage from '@/components/chat/StreamMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useChatStore } from '@/stores/chat'
import { useKbStore } from '@/stores/kb'
import type { ChatMode, Citation } from '@/types/api'
import { formatBytes } from '@/utils/format'

const chatStore = useChatStore()
const kbStore = useKbStore()
const query = ref('')
const composerRef = ref<HTMLTextAreaElement | null>(null)
const mode = ref<ChatMode>('precise')
// 范围用后端真实 kbId（数字字符串，如 "1"）。列表加载后默认全选，避免硬编码假 id 导致后端 Long 反序列化失败。
const selectedScope = ref<string[]>([])
const activeCitation = ref<Citation | null>(null)

// 右侧「最近访问」：按更新时间倒序取前两个真实库（无写死数据）。
const recentKbs = computed(() =>
  [...kbStore.kbList].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 2),
)
const totalDocs = computed(() => kbStore.kbList.reduce((sum, kb) => sum + (kb.documentCount ?? 0), 0))
const totalSize = computed(() => kbStore.kbList.reduce((sum, kb) => sum + (kb.sizeBytes ?? 0), 0))

function toggleScope(kbId: string): void {
  selectedScope.value = selectedScope.value.includes(kbId)
    ? selectedScope.value.filter((id) => id !== kbId)
    : [...selectedScope.value, kbId]
}

/* ---------------- @文档 选择器（REQ-CHAT docRefs） ---------------- */
interface MentionDoc {
  documentId: string
  name: string
  kbId: string
  kbName: string
}

// 所选范围内的全部文档（按 scope 缓存）/ 已被 @ 选中的文档 / 浮层态与关键字。
const mentionScopeDocs = ref<MentionDoc[]>([])
const mentionedDocs = ref<MentionDoc[]>([])
const mentionOpen = ref(false)
const mentionLoading = ref(false)
const mentionKeyword = ref('')
let mentionScopeKey = ''

// 候选 = 范围内文档 − 已选 ，再按 @ 后关键字过滤，最多 8 条。
const filteredMentionDocs = computed(() => {
  const q = mentionKeyword.value.trim().toLowerCase()
  const chosen = new Set(mentionedDocs.value.map((doc) => doc.documentId))
  return mentionScopeDocs.value
    .filter((doc) => !chosen.has(doc.documentId))
    .filter((doc) => !q || doc.name.toLowerCase().includes(q))
    .slice(0, 8)
})

// 传给后端的限定检索范围：已 @ 文档的 documentId 列表（契约 docRefs，逗号分隔）。
const docRefs = computed(() => mentionedDocs.value.map((doc) => doc.documentId).join(','))

// 拉取当前 scope 下的全部文档（多库并发），scope 未变则复用缓存。
async function loadMentionDocs(): Promise<void> {
  const key = [...selectedScope.value].sort().join(',')
  if (key === mentionScopeKey && mentionScopeDocs.value.length) return
  mentionLoading.value = true
  try {
    const lists = await Promise.all(
      selectedScope.value.map(async (kbId) => {
        const kbName = kbStore.kbList.find((kb) => kb.kbId === kbId)?.name ?? ''
        const docs = await listDocuments(kbId)
        return docs.map((doc) => ({ documentId: doc.documentId, name: doc.name, kbId, kbName }))
      }),
    )
    mentionScopeDocs.value = lists.flat()
    mentionScopeKey = key
  } catch {
    mentionScopeDocs.value = []
  } finally {
    mentionLoading.value = false
  }
}

// 点击「@文档」：在光标处插入 @ 并打开浮层。
function openMentionPicker(): void {
  if (selectedScope.value.length === 0) {
    ElMessage.warning('请先选择知识库范围，再 @ 指定文档')
    return
  }
  const el = composerRef.value
  const pos = el?.selectionStart ?? query.value.length
  query.value = `${query.value.slice(0, pos)}@${query.value.slice(pos)}`
  mentionKeyword.value = ''
  mentionOpen.value = true
  void loadMentionDocs()
  void nextTick(() => {
    el?.focus()
    el?.setSelectionRange(pos + 1, pos + 1)
  })
}

// 输入时探测光标前的 @token：存在则开浮层并更新关键字，否则关闭。
function onComposerInput(): void {
  const el = composerRef.value
  if (!el) return
  const before = el.value.slice(0, el.selectionStart ?? 0)
  const match = before.match(/@([^@\s]*)$/)
  if (match) {
    mentionKeyword.value = match[1]
    if (!mentionOpen.value) {
      mentionOpen.value = true
      void loadMentionDocs()
    }
  } else {
    mentionOpen.value = false
  }
}

// 选中文档：把光标前的 @token 替换为 @文件名 ，并登记到 docRefs。
function selectMention(doc: MentionDoc): void {
  const el = composerRef.value
  if (el) {
    const pos = el.selectionStart ?? query.value.length
    const replaced = query.value.slice(0, pos).replace(/@([^@\s]*)$/, `@${doc.name} `)
    const after = query.value.slice(pos)
    query.value = replaced + after
    const caret = replaced.length
    void nextTick(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }
  if (!mentionedDocs.value.some((item) => item.documentId === doc.documentId)) {
    mentionedDocs.value.push(doc)
  }
  mentionOpen.value = false
}

// 移除已选文档：同时清掉输入框里的 @文件名 文本。
function removeMention(documentId: string): void {
  const doc = mentionedDocs.value.find((item) => item.documentId === documentId)
  mentionedDocs.value = mentionedDocs.value.filter((item) => item.documentId !== documentId)
  if (doc) {
    query.value = query.value.replace(`@${doc.name} `, '').replace(`@${doc.name}`, '')
  }
}

async function handleCreateSession(): Promise<void> {
  await chatStore.createNewSession(selectedScope.value, mode.value)
}

async function handleDeleteSession(sessionId: string): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后该会话及其历史消息将不可恢复，确定删除？', '删除会话', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const ok = await chatStore.removeSession(sessionId)
  if (ok) ElMessage.success('会话已删除')
  else ElMessage.error('删除失败，请稍后重试')
}

// 回车发送；Shift Enter 换行。组合输入中（中文拼音回车选词）不触发发送。
function onComposerKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return
  // 浮层打开且有候选时，回车选中第一条文档而非发送。
  if (mentionOpen.value && filteredMentionDocs.value.length) {
    event.preventDefault()
    selectMention(filteredMentionDocs.value[0])
    return
  }
  event.preventDefault()
  void handleSend()
}

async function handleSend(): Promise<void> {
  if (!query.value) {
    ElMessage.warning('请先输入问题内容')
    return
  }
  if (query.value.length > 2000) {
    ElMessage.warning('问题超过 2000 字，请拆分后再发送')
    return
  }
  if (kbStore.kbList.length === 0) {
    ElMessage.warning('暂无知识库，请先在「知识库」中创建后再提问')
    return
  }
  if (selectedScope.value.length === 0) {
    ElMessage.warning('请至少选择一个知识库范围')
    return
  }
  // 无当前会话（如历史为空）时先建会话，否则 startStream 因缺 sessionId 静默返回、界面无反应。
  if (!chatStore.currentSessionId) {
    await chatStore.createNewSession(selectedScope.value, mode.value)
  }
  if (!chatStore.currentSessionId) {
    ElMessage.error('会话创建失败，请稍后重试')
    return
  }
  chatStore.startStream(query.value, mode.value, docRefs.value || undefined)
  query.value = ''
  mentionedDocs.value = []
  mentionOpen.value = false
}

onMounted(() => {
  void chatStore.fetchSessions()
  void kbStore.fetchList().then(() => {
    // 默认选中全部知识库范围；用户可在 composer 的 chips 中增减。
    if (selectedScope.value.length === 0) {
      selectedScope.value = kbStore.kbList.map((kb) => kb.kbId)
    }
  })
})
</script>

<style scoped lang="scss">
// @文档 浮层锚点：相对定位让候选列表浮在输入框上方。
.composer-input {
  position: relative;
}

// 已选文档的 chips：展示当前限定检索范围，可逐个移除。
.mention-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.mention-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 2px 8px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;

  svg {
    width: 13px;
    height: 13px;
  }

  button {
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;

    svg {
      width: 12px;
      height: 12px;
    }
  }
}

// @文档 候选浮层：悬浮在输入框上方，最多滚动展示候选文档。
.mention-popover {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 6px);
  z-index: 20;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.mention-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-1);
  font-size: 13px;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--bg-soft);
  }

  svg {
    width: 14px;
    height: 14px;
    color: var(--text-3);
    flex: none;
  }
}

.mention-name {
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-kb {
  flex: none;
  color: var(--text-3);
  font-size: 11px;
}

.mention-empty {
  margin: 0;
  padding: 12px;
  color: var(--text-3);
  font-size: 12px;
  text-align: center;
}

// 无知识库时的范围区引导：把"没东西可选"的死胡同变成可点击的去创建入口。
.scope-empty {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--primary);
  font-size: 12px;
  text-decoration: none;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    text-decoration: underline;
  }
}
</style>
