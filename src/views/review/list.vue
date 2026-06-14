<template>
  <PageHeader title="智能审查" description="上传模板与待审文件，按清单生成三色风险报告。">
    <template #actions>
      <RouterLink class="btn" :to="ROUTE_PATHS.write">
        <FilePenLine />
        切到编写
      </RouterLink>
      <RouterLink class="btn primary" :to="ROUTE_PATHS.reviewWorkspace">
        <ScanSearch />
        开始审查
      </RouterLink>
    </template>
  </PageHeader>

  <div class="ir-wrap">
    <section class="ir-config-card">
      <div class="ir-mode-tabs">
        <RouterLink class="ir-mode-tab on" :to="ROUTE_PATHS.review">
          <ScanSearch />
          审查模式
          <span class="count">M5</span>
        </RouterLink>
        <RouterLink class="ir-mode-tab" :to="ROUTE_PATHS.write">
          <FilePenLine />
          编写模式
          <span class="count">M6</span>
        </RouterLink>
      </div>

      <div class="upload-grid">
        <FileUploader kb-id="kb-1" label="标准模板 / 招标文件" />
        <FileUploader kb-id="kb-1" label="待审文档" />
      </div>

      <div class="review-options">
        <label>
          <span class="field-label">审查清单</span>
          <select>
            <option>建筑工程合规审查清单</option>
            <option>合同条款风险审查清单</option>
          </select>
        </label>
        <label>
          <span class="field-label">严格度</span>
          <input type="range" min="1" max="3" value="2" />
        </label>
        <label class="checkline">
          <input type="checkbox" checked />
          启用历史案例复用
        </label>
      </div>
    </section>

    <section class="agent-entry-grid">
      <RouterLink class="quick-card qc-ir" :to="ROUTE_PATHS.reviewWorkspace">
        <span class="qc-ico"><ScanSearch /></span>
        <span class="qc-title">进入审查工作台 <ArrowRight /></span>
        <span class="qc-desc">左原文、中风险、右处置建议，支持增量轮询与逐条采纳。</span>
      </RouterLink>
      <RouterLink class="quick-card qc-kb" :to="ROUTE_PATHS.kb">
        <span class="qc-ico"><Database /></span>
        <span class="qc-title">补充知识库 <ArrowRight /></span>
        <span class="qc-desc">审查前补齐模板、规范、历史案例，提升风险识别置信度。</span>
      </RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, Database, FilePenLine, ScanSearch } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import FileUploader from '@/components/upload/FileUploader.vue'
import { ROUTE_PATHS } from '@/constants/routes'
</script>
