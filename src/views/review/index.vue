<template>
  <!--
    智能审查工作台（对应原型 index-v2.html 的 ir 视图）：
    同一 Agent，顶部「审查模式 / 编写模式」双 Tab，视觉权重相等；
    - 模板上传区为双模式共享；
    - 切走进行中的任务需二次确认（REQ-LINK §M7 状态机）；
    - 编写模式初稿完成度 ≥ 80% 才可一键送审。
  -->
  <PageHeader
    title="智能审查 Agent"
    description="同一 Agent · 审查模式 + 编写模式 · AI 辅助，需人工最终确认"
  >
    <template #actions>
      <button class="btn" type="button" @click="onHistory">
        <History />
        历史任务
      </button>
      <button class="btn primary" type="button" @click="onNewTask">
        <Plus />
        新建任务
      </button>
    </template>
  </PageHeader>

  <div class="ir-wrap">
    <section class="ir-config-card">
      <!-- ① 双模式 Tab + 模式专属操作 -->
      <div class="ir-mode-tabs" role="tablist">
        <button
          class="ir-mode-tab"
          :class="{ on: mode === 'review' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'review'"
          @click="switchMode('review')"
        >
          <ScanSearch />
          审查模式
          <span class="count">{{ reviewStore.risks.length }}</span>
        </button>
        <button
          class="ir-mode-tab"
          :class="{ on: mode === 'write' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'write'"
          @click="switchMode('write')"
        >
          <FilePenLine />
          编写模式
          <span class="count">{{ writeStore.outline.length }}</span>
        </button>

        <div class="ir-mode-meta">
          <template v-if="mode === 'review'">
            <span>
              已审
              <b>{{ reviewStore.task?.doneItems ?? 0 }}/{{ reviewStore.task?.totalItems ?? 0 }}</b>
              · 覆盖率 {{ reviewCoverage }}%
            </span>
            <button class="bridge" type="button" @click="switchMode('write')">
              <FilePenLine />
              切到编写
            </button>
          </template>
          <template v-else>
            <span>
              已生成 <b>{{ writeStore.doneSectionCount }}/{{ writeStore.outline.length }}</b> 章 ·
              响应率 {{ writeStore.responseRate }}%
            </span>
            <el-tooltip
              :disabled="writeStore.canSubmitReview"
              content="初稿完成度不足 80%，暂不可送审"
              placement="top"
            >
              <span class="bridge-wrap">
                <button
                  class="bridge"
                  type="button"
                  :disabled="!writeStore.canSubmitReview"
                  @click="onSubmitReview"
                >
                  <ArrowRight />
                  一键送审
                </button>
              </span>
            </el-tooltip>
          </template>
        </div>
      </div>

      <!-- 风险免责提示 -->
      <div class="banner">
        <AlertTriangle />
        <span><b>AI 辅助 · 需人工最终确认</b> — 不构成法律意见，最终责任由复核人承担。</span>
      </div>

      <!-- ② 双模式共享的文档上传区（标签随模式切换） -->
      <div class="upload-grid">
        <FileUploader
          kb-id="kb-1"
          :label="mode === 'review' ? '标准模板 / 招标文件 · 双模式共享' : '招标文件 · 双模式共享'"
          :disabled="isViewer"
        />
        <FileUploader
          v-if="mode === 'review'"
          kb-id="kb-1"
          label="待审文档 / 投标文件"
          :disabled="isViewer"
        />
        <div v-else class="upload-zone ghost">
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

      <!-- ③ 配置区：审查=清单/严格度/历史；编写=项目参数 -->
      <div v-if="mode === 'review'" class="review-options">
        <label>
          <span class="field-label">审查清单</span>
          <select v-model="checklistId">
            <option value="cl-construction">建筑工程合规审查清单</option>
            <option value="cl-contract">合同条款风险审查清单</option>
            <option value="cl-bid">投标文件 · 政府采购</option>
          </select>
        </label>
        <label>
          <span class="field-label">严格度（{{ strictnessLabel }}）</span>
          <input v-model.number="strictness" type="range" min="1" max="3" />
        </label>
        <label class="checkline">
          <input v-model="useHistory" type="checkbox" />
          启用历史案例复用
        </label>
      </div>
      <div v-else class="project-form">
        <label>
          <span class="field-label">项目名称</span>
          <input v-model="project.projectName" type="text" />
        </label>
        <label>
          <span class="field-label">客户</span>
          <input v-model="project.client" type="text" />
        </label>
        <label>
          <span class="field-label">规模</span>
          <input v-model="project.scale" type="text" />
        </label>
      </div>
    </section>

    <!-- ④ 模式面板：用 v-show 切换以保留各自的滚动/编辑状态（数据不丢） -->
    <ReviewModePanel v-show="mode === 'review'" />
    <WriteModePanel v-show="mode === 'write'" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { AlertTriangle, ArrowRight, FilePenLine, History, Plus, ScanSearch } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import ReviewModePanel from '@/components/review/ReviewModePanel.vue'
import FileUploader from '@/components/upload/FileUploader.vue'
import WriteModePanel from '@/components/write/WriteModePanel.vue'
import { useReviewStore } from '@/stores/review'
import { useUserStore } from '@/stores/user'
import { useWriteStore } from '@/stores/write'

type IrMode = 'review' | 'write'

const route = useRoute()
const router = useRouter()
const reviewStore = useReviewStore()
const writeStore = useWriteStore()
const userStore = useUserStore()

// 当前模式：从 ?mode=write 深链初始化，默认审查模式。
const mode = ref<IrMode>(route.query.mode === 'write' ? 'write' : 'review')

const isViewer = computed(() => userStore.role === 'viewer')

// 共享/审查配置（POC：本地状态；联调时随"开始审查"提交到 /review/tasks）。
const checklistId = ref('cl-construction')
const strictness = ref(2)
const useHistory = ref(true)
const strictnessLabel = computed(() => ({ 1: '宽松', 2: '平衡', 3: '严格' })[strictness.value] ?? '平衡')

// 编写项目参数（POC：本地状态；联调时作为 /write/tasks 的 projectParams）。
const project = reactive({ projectName: 'XX学校教学楼', client: 'XX教育局', scale: '8000万' })

const reviewCoverage = computed(() => {
  if (!reviewStore.task?.totalItems) return 0
  return Math.round((reviewStore.task.doneItems / reviewStore.task.totalItems) * 100)
})

/**
 * Tab 切换状态机（REQ-LINK §M7）：模板共享保留、各模式数据保留（v-show）；
 * 若离开的模式有进行中的任务（审查轮询 / 章节流式生成），先二次确认。
 */
async function switchMode(next: IrMode): Promise<void> {
  if (next === mode.value) return
  const leavingBusy =
    (mode.value === 'review' && reviewStore.polling) ||
    (mode.value === 'write' && writeStore.isGenerating)
  if (leavingBusy) {
    try {
      await ElMessageBox.confirm('当前任务仍在进行中，切换后将转入后台继续。确定切换？', '切换模式', {
        type: 'warning',
        confirmButtonText: '继续切换',
        cancelButtonText: '留在当前',
      })
    } catch {
      return
    }
  }
  mode.value = next
}

// 一键送审：完成度门控 + 二次确认 + 调接口 + 切回审查模式（REQ-LINK）。
async function onSubmitReview(): Promise<void> {
  if (!writeStore.canSubmitReview) return
  try {
    await ElMessageBox.confirm(
      `初稿完成度 ${writeStore.completionPercent}%，确认送入审查模式做最终复核？`,
      '一键送审',
      { type: 'info', confirmButtonText: '确认送审' },
    )
  } catch {
    return
  }
  const ok = await writeStore.submitReview()
  if (ok) {
    ElMessage.success('已送审，初稿已填入待审文档')
    mode.value = 'review'
  } else {
    ElMessage.error('送审失败，请稍后重试')
  }
}

function onHistory(): void {
  ElMessage.info('历史任务列表（一期占位入口）')
}
function onNewTask(): void {
  ElMessage.info('请在上方配置区上传文档并选择清单后开始任务')
}

// 模式 ↔ URL 双向同步，便于刷新/分享深链。
watch(mode, (value) => {
  void router.replace({ query: value === 'write' ? { mode: 'write' } : {} })
})
watch(
  () => route.query.mode,
  (value) => {
    mode.value = value === 'write' ? 'write' : 'review'
  },
)
</script>

<style scoped lang="scss">
.bridge-wrap {
  display: inline-flex;
}

.bridge:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
