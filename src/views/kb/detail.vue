<template>
  <!--
    知识库详情（REQ-KB / frontendRequirements §3.4）：
    左侧 = 库信息 + 成员权限；右侧 = 上传区 + 文档列表。
    与「知识库管理」列表页区分：列表负责全量库的浏览/检索，本页聚焦单个库的资产与成员。
  -->
  <PageHeader :title="kb?.name ?? '知识库详情'" :description="kb?.description ?? ''">
    <template #actions>
      <RouterLink class="btn" :to="ROUTE_PATHS.kb">
        <ArrowLeft />
        返回列表
      </RouterLink>
    </template>
  </PageHeader>

  <EmptyState v-if="!kb" title="知识库不存在" description="该知识库可能已被删除或你无访问权限。" />

  <div v-else class="kb-detail">
    <!-- 左：库信息 + 成员 -->
    <aside class="panel">
      <div class="panel-head">
        <h3>库信息</h3>
      </div>
      <div class="kb-info-list">
        <div class="row">
          <span>文档数</span><b>{{ kb.documentCount }}</b>
        </div>
        <div class="row">
          <span>容量</span><b>{{ formatBytes(kb.sizeBytes) }}</b>
        </div>
        <div class="row">
          <span>已解析</span><b>{{ kbStore.parsedCount }} / {{ kbStore.documents.length }}</b>
        </div>
        <div class="row">
          <span>负责人</span><b>{{ ownerName }}</b>
        </div>
        <div class="row">
          <span>更新时间</span><b>{{ formatTimeLabel(kb.updatedAt) }}</b>
        </div>
      </div>

      <div class="panel-head">
        <h3>成员权限</h3>
        <button class="btn sm" type="button" :disabled="isViewer" @click="onAddMember">
          <Plus />
          添加
        </button>
      </div>
      <div v-if="members.length">
        <div v-for="m in members" :key="m.userId" class="member-row">
          <span class="avatar-sm">{{ (m.realName ?? m.userId).slice(0, 1) }}</span>
          <span>{{ m.realName ?? m.userId }}</span>
          <span class="perm">{{ m.permission === 'write' ? '可编辑' : '只读' }}</span>
        </div>
      </div>
      <EmptyState v-else title="暂无成员" description="仅负责人可访问，点击「添加」邀请协作成员。" />
    </aside>

    <!-- 右：上传 + 文档列表 -->
    <section class="panel km-main">
      <div class="km-uploader-row">
        <FileUploader
          :kb-id="kb.kbId"
          label="上传文档（PDF / DOCX / XLSX，≤ 50MB）"
          :disabled="isViewer"
          @uploaded="handleUploaded"
        />
      </div>

      <div class="km-toolbar">
        <label class="km-search-bar">
          <Search />
          <input v-model="docKeyword" aria-label="搜索文档" placeholder="搜索文档名称" type="search" />
        </label>
        <span class="meta">{{ filteredDocuments.length }} 份文档</span>
      </div>

      <table class="km-table">
        <thead>
          <tr>
            <th>文档名称</th>
            <th>解析状态</th>
            <th>页数</th>
            <th>大小</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in filteredDocuments" :key="doc.documentId">
            <td>
              <span class="doc-name">
                <span class="doc-icon" :class="extClass(doc.name)">{{ iconText(doc.name) }}</span>
                <span>
                  <b>{{ doc.name }}</b>
                  <small>{{ doc.documentId }}</small>
                </span>
              </span>
            </td>
            <td><span class="status-tag" :class="doc.parseStatus.toLowerCase()">{{ doc.parseStatus }}</span></td>
            <td>{{ doc.pageCount ?? '-' }}</td>
            <td>{{ formatBytes(doc.sizeBytes) }}</td>
            <td>{{ formatTimeLabel(doc.updatedAt) }}</td>
            <td>
              <button
                v-if="doc.parseStatus === 'FAILED'"
                class="btn sm"
                type="button"
                :disabled="isViewer"
                @click="onReparse(doc.documentId)"
              >
                <RotateCcw />
                重新解析
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState
        v-if="!filteredDocuments.length"
        title="暂无文档"
        description="拖拽或点击上方区域上传第一份文档。"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Plus, RotateCcw, Search } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FileUploader from '@/components/upload/FileUploader.vue'
import { ROUTE_PATHS } from '@/constants/routes'
import { useKbStore } from '@/stores/kb'
import { useUserStore } from '@/stores/user'
import type { UploadDocumentResult } from '@/types/api'
import { formatBytes, formatTimeLabel } from '@/utils/format'

const route = useRoute()
const kbStore = useKbStore()
const userStore = useUserStore()
const docKeyword = ref('')

const isViewer = computed(() => userStore.role === 'viewer')
const kb = computed(() => kbStore.currentKb)
const members = computed(() => kb.value?.members ?? [])
const ownerName = computed(
  () => members.value.find((m) => m.userId === kb.value?.ownerId)?.realName ?? kb.value?.ownerId ?? '-',
)

const filteredDocuments = computed(() => {
  const q = docKeyword.value.trim().toLowerCase()
  if (!q) return kbStore.documents
  return kbStore.documents.filter((doc) => doc.name.toLowerCase().includes(q))
})

function iconText(name: string): string {
  return (name.split('.').pop()?.toUpperCase() ?? 'DOC').slice(0, 4)
}

function extClass(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase()
}

function onAddMember(): void {
  ElMessage.info('成员邀请（一期占位入口）')
}

// 上传成功后即时把新文档插入列表头部，并启动解析状态轮询直至终态（WEB-04）。
function handleUploaded(result: UploadDocumentResult): void {
  kbStore.documents.unshift({
    documentId: result.documentId,
    kbId: kb.value?.kbId ?? '',
    name: result.name,
    sizeBytes: result.sizeBytes,
    parseStatus: result.parseStatus,
    updatedAt: new Date().toISOString(),
  })
  kbStore.pollParseStatus(result.documentId)
}

async function onReparse(documentId: string): Promise<void> {
  const ok = await kbStore.reparse(documentId)
  if (!ok) ElMessage.error('重新解析失败，请稍后重试')
}

onMounted(() => {
  const kbId = String(route.params.kbId ?? '')
  void kbStore.fetchList()
  // fetchDocuments 同时会把 currentKbId 设为该库，driving 左侧库信息与右侧文档。
  if (kbId) void kbStore.fetchDocuments(kbId)
})
</script>
