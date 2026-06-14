<template>
  <PageHeader title="智能编写" description="抽取评分点、匹配历史素材，生成大纲与章节初稿。">
    <template #actions>
      <RouterLink class="btn" :to="ROUTE_PATHS.review">
        <ScanSearch />
        切到审查
      </RouterLink>
      <RouterLink class="btn primary" :to="ROUTE_PATHS.writeWorkspace">
        <FilePenLine />
        开始编写
      </RouterLink>
    </template>
  </PageHeader>

  <div class="ir-wrap">
    <section class="ir-config-card">
      <div class="ir-mode-tabs">
        <RouterLink class="ir-mode-tab" :to="ROUTE_PATHS.review">
          <ScanSearch />
          审查模式
          <span class="count">M5</span>
        </RouterLink>
        <RouterLink class="ir-mode-tab on" :to="ROUTE_PATHS.write">
          <FilePenLine />
          编写模式
          <span class="count">M6</span>
        </RouterLink>
        <div class="ir-mode-meta">
          <RouterLink class="bridge" :to="ROUTE_PATHS.reviewWorkspace">
            一键送审
            <ArrowRight />
          </RouterLink>
        </div>
      </div>

      <div class="upload-grid">
        <FileUploader kb-id="kb-1" label="招标文件" />
        <div class="upload-zone ghost">
          <span class="label-tag">AI 初稿</span>
          <FilePenLine class="icon" />
          <div class="title">
            编写模式由 AI 自动生成
          </div>
          <div class="sub">
            初稿完成度 ≥ 80% 后可一键送审
          </div>
        </div>
      </div>

      <div class="project-form">
        <label>
          <span class="field-label">项目名称</span>
          <input value="XX学校教学楼" type="text" />
        </label>
        <label>
          <span class="field-label">客户</span>
          <input value="XX教育局" type="text" />
        </label>
        <label>
          <span class="field-label">规模</span>
          <input value="8000万" type="text" />
        </label>
      </div>
    </section>

    <section class="agent-entry-grid">
      <RouterLink class="quick-card qc-ir" :to="ROUTE_PATHS.writeWorkspace">
        <span class="qc-ico"><FilePenLine /></span>
        <span class="qc-title">进入编写工作台 <ArrowRight /></span>
        <span class="qc-desc">大纲流、章节流、TipTap 自动保存与评分点响应度统一工作区。</span>
      </RouterLink>
      <RouterLink class="quick-card qc-kb" :to="ROUTE_PATHS.kb">
        <span class="qc-ico"><Database /></span>
        <span class="qc-title">上传历史素材 <ArrowRight /></span>
        <span class="qc-desc">素材越完整，章节生成越贴合企业表达与项目经验。</span>
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
