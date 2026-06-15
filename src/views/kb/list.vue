<template>
  <PageHeader title="知识库管理" description="库 CRUD、文档上传、解析状态与成员权限。">
    <template #actions>
      <button class="btn" type="button">
        <Plus />
        新建知识库
      </button>
      <button class="btn primary" type="button">
        <Upload />
        上传文档
      </button>
    </template>
  </PageHeader>

  <div class="km-layout">
    <aside class="panel km-tree">
      <div class="panel-head">
        <h3>知识库</h3>
        <span class="meta">{{ kbStore.kbList.length }} 个库</span>
      </div>
      <div class="km-search">
        <Search />
        <input v-model="keyword" aria-label="搜索知识库" placeholder="搜索库名 / 标签" type="search" />
      </div>
      <div class="km-node-list">
        <button
          v-for="kb in filteredKbs"
          :key="kb.kbId"
          class="km-node"
          :class="{ on: kb.kbId === kbStore.currentKbId }"
          type="button"
          @click="handleSelectKb(kb.kbId)"
        >
          <Database />
          <span>{{ kb.name }}</span>
          <b>{{ kb.documentCount }}</b>
        </button>
      </div>
    </aside>

    <section class="panel km-main">
      <div class="km-headline">
        <div>
          <h2>{{ kbStore.currentKb?.name }}</h2>
          <p>{{ kbStore.currentKb?.description }}</p>
        </div>
        <div class="km-headline-aside">
          <div class="km-stats">
            <span><b>{{ kbStore.documents.length }}</b>文档</span>
            <span><b>{{ kbStore.parsedCount }}</b>已解析</span>
          </div>
          <RouterLink
            v-if="kbStore.currentKbId"
            class="btn sm"
            :to="{ name: 'kb-detail', params: { kbId: kbStore.currentKbId } }"
          >
            <ArrowUpRight />
            成员与详情
          </RouterLink>
        </div>
      </div>

      <div class="km-uploader-row">
        <FileUploader
          :kb-id="kbStore.currentKbId"
          label="知识库文档"
          :disabled="userStore.role === 'viewer'"
          @uploaded="handleUploaded"
        />
      </div>

      <div class="km-toolbar">
        <label class="km-search-bar">
          <Search />
          <input v-model="docKeyword" aria-label="搜索文档" placeholder="搜索文档名称" type="search" />
        </label>
        <button class="km-filter" type="button">
          全部状态
        </button>
        <button class="km-filter" type="button">
          最近更新
        </button>
      </div>

      <table class="km-table">
        <thead>
          <tr>
            <th>文档名称</th>
            <th>解析状态</th>
            <th>页数</th>
            <th>大小</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in filteredDocuments" :key="doc.documentId">
            <td>
              <span class="doc-name">
                <span class="doc-icon">{{ iconText(doc.name) }}</span>
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
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpRight, Database, Plus, Search, Upload } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import FileUploader from '@/components/upload/FileUploader.vue'
import { useKbStore } from '@/stores/kb'
import { useUserStore } from '@/stores/user'
import type { UploadDocumentResult } from '@/types/api'
import { formatBytes, formatTimeLabel } from '@/utils/format'

const kbStore = useKbStore()
const userStore = useUserStore()
const keyword = ref('')
const docKeyword = ref('')

const filteredKbs = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return kbStore.kbList
  return kbStore.kbList.filter((kb) => kb.name.toLowerCase().includes(q))
})

const filteredDocuments = computed(() => {
  const q = docKeyword.value.trim().toLowerCase()
  if (!q) return kbStore.documents
  return kbStore.documents.filter((doc) => doc.name.toLowerCase().includes(q))
})

function handleSelectKb(kbId: string): void {
  void kbStore.fetchDocuments(kbId)
}

function handleUploaded(result: UploadDocumentResult): void {
  kbStore.documents.unshift({
    documentId: result.documentId,
    kbId: kbStore.currentKbId,
    name: result.name,
    sizeBytes: result.sizeBytes,
    parseStatus: result.parseStatus,
    updatedAt: new Date().toISOString(),
  })
}

function iconText(name: string): string {
  const ext = name.split('.').pop()?.toUpperCase() ?? 'DOC'
  return ext.slice(0, 3)
}

onMounted(() => {
  void kbStore.fetchList()
  void kbStore.fetchDocuments()
})
</script>
