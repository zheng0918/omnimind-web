<template>
  <PageHeader title="工作台" :description="dateText">
    <template #actions>
      <RouterLink class="btn" :to="ROUTE_PATHS.kb">
        <Upload />
        上传文档
      </RouterLink>
      <RouterLink class="btn primary" :to="ROUTE_PATHS.review">
        <ScanSearch />
        新建审查
      </RouterLink>
    </template>
  </PageHeader>

  <div class="home-wrap">
    <section class="home-hello">
      <div class="greet">
        <h2>早上好，<b>{{ userStore.realName }}</b></h2>
        <p class="sub">
          今天为您整理了 {{ summary.kpis.pendingTasks }} 条待办任务
          <span class="dot-sep">·</span>
          AI 辅助结果需人工最终确认
        </p>
      </div>
      <div class="quick-pills">
        <RouterLink class="pill" :to="ROUTE_PATHS.chat">
          <MessagesSquare />
          发起问答
        </RouterLink>
        <RouterLink class="pill" :to="ROUTE_PATHS.write">
          <FilePenLine />
          开始编写
        </RouterLink>
      </div>
    </section>

    <section class="home-kpis">
      <RouterLink class="home-kpi kpi-ask" :to="ROUTE_PATHS.chat">
        <span class="label"><MessagesSquare /> 今日新提问</span>
        <span class="num">{{ summary.kpis.todayQuestions }}<span class="unit">次</span></span>
        <span class="delta"><span class="up">+18%</span> 较昨日</span>
      </RouterLink>
      <RouterLink class="home-kpi kpi-review" :to="ROUTE_PATHS.review">
        <span class="label"><ScanSearch /> 本周审查</span>
        <span class="num">{{ summary.kpis.weekReviews }}<span class="unit">个</span></span>
        <span class="delta"><span class="down">-9%</span> 平均耗时</span>
      </RouterLink>
      <RouterLink class="home-kpi kpi-cap" :to="ROUTE_PATHS.kb">
        <span class="label"><Database /> 知识库容量</span>
        <span class="num">{{ summary.kpis.kbUsagePercent }}<span class="unit">%</span></span>
        <span class="delta">已解析 {{ summary.kbHealth.parsedDocs }} 份</span>
      </RouterLink>
      <RouterLink class="home-kpi kpi-alert" :to="ROUTE_PATHS.reviewWorkspace">
        <span class="label"><Clock3 /> 待办任务</span>
        <span class="num">{{ summary.kpis.pendingTasks }}<span class="unit">项</span></span>
        <span class="delta"><span class="up">3</span> 项需今日处理</span>
      </RouterLink>
    </section>

    <section class="home-split">
      <article class="home-card">
        <div class="home-card-head">
          <h3><Activity /> 系统活跃趋势</h3>
          <span class="legend-pills">
            <span class="lp"><i style="background:#2563EB" />问答</span>
            <span class="lp"><i style="background:#F59E0B" />审查</span>
          </span>
        </div>
        <div ref="chartRef" class="home-echart" />
      </article>

      <article class="home-card">
        <div class="home-card-head">
          <h3><ShieldCheck /> 知识库健康度</h3>
          <span class="more">{{ healthPercent }}%</span>
        </div>
        <div class="health-block">
          <div class="health-ring-css" :style="{ '--p': `${healthPercent}%` }">
            <span>{{ healthPercent }}%</span>
          </div>
          <div class="health-meta">
            <div class="row">
              <span>总文档</span>
              <b>{{ summary.kbHealth.totalDocs }}</b>
            </div>
            <div class="row">
              <span>已解析</span>
              <b>{{ summary.kbHealth.parsedDocs }}</b>
            </div>
            <div class="row">
              <span>失败</span>
              <b>{{ summary.kbHealth.failedDocs }}</b>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="home-triple">
      <article class="home-card">
        <div class="home-card-head">
          <h3><Flame /> 今日热点问题</h3>
        </div>
        <div class="home-hot">
          <RouterLink
            v-for="question in summary.hotQuestions"
            :key="question.text"
            class="row"
            :to="ROUTE_PATHS.chat"
          >
            <span class="r top">{{ question.count }}</span>
            <span class="q">{{ question.text }}</span>
          </RouterLink>
        </div>
      </article>

      <article class="home-card">
        <div class="home-card-head">
          <h3><CircleHelp /> 未答问题</h3>
        </div>
        <div class="home-card-body">
          <div v-for="item in unanswered" :key="item" class="unans">
            <p class="unans-q">
              {{ item }}
            </p>
            <p class="unans-meta">
              <span>建议补充知识库</span><RouterLink :to="ROUTE_PATHS.kb">
                去处理
              </RouterLink>
            </p>
          </div>
        </div>
      </article>

      <article class="home-card">
        <div class="home-card-head">
          <h3><ListTodo /> 最近任务</h3>
        </div>
        <div class="home-card-body">
          <RouterLink
            v-for="task in summary.recentTasks"
            :key="task.taskId"
            class="home-list-item"
            :to="task.type === 'WRITE' ? ROUTE_PATHS.writeWorkspace : ROUTE_PATHS.reviewWorkspace"
          >
            <span class="ico blue"><FileText /></span>
            <span class="body">
              <span class="t">{{ task.title }}</span>
              <span class="s">{{ task.type }} · {{ task.status }}</span>
            </span>
          </RouterLink>
        </div>
      </article>
    </section>

    <section class="home-quick">
      <RouterLink class="quick-card qc-kb" :to="ROUTE_PATHS.chat">
        <span class="qc-ico"><MessagesSquare /></span>
        <span class="qc-title">AI 问答 <ArrowRight /></span>
        <span class="qc-desc">基于知识库进行 RAG 检索、流式回答、原文引用和置信度展示。</span>
      </RouterLink>
      <RouterLink class="quick-card qc-ir" :to="ROUTE_PATHS.review">
        <span class="qc-ico"><ScanSearch /></span>
        <span class="qc-title">智能审查 <ArrowRight /></span>
        <span class="qc-desc">上传招标文件与待审文档，按清单增量生成三色风险报告。</span>
      </RouterLink>
      <RouterLink class="quick-card qc-aw" :to="ROUTE_PATHS.write">
        <span class="qc-ico"><FilePenLine /></span>
        <span class="qc-title">智能编写 <ArrowRight /></span>
        <span class="qc-desc">抽取评分点、匹配历史素材，生成大纲与章节初稿。</span>
      </RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import {
  Activity,
  ArrowRight,
  CircleHelp,
  Clock3,
  Database,
  FilePenLine,
  FileText,
  Flame,
  ListTodo,
  MessagesSquare,
  ScanSearch,
  ShieldCheck,
  Upload,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import { ROUTE_PATHS } from '@/constants/routes'
import { useUserStore } from '@/stores/user'
import { useWorkbenchStore } from '@/stores/workbench'

const userStore = useUserStore()
const workbenchStore = useWorkbenchStore()
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const summary = computed(() => workbenchStore.summary)
const dateText = computed(() => {
  const now = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${weekdays[now.getDay()]}`
})
const healthPercent = computed(() =>
  Math.round((summary.value.kbHealth.parsedDocs / summary.value.kbHealth.totalDocs) * 100),
)
const unanswered = ['施工围挡夜间照明标准是什么？', '相似学校项目安全文明施工如何表述？', '付款节点与专用条款是否冲突？']

function renderChart(): void {
  if (!chartRef.value) return
  chart ??= echarts.init(chartRef.value)
  chart.setOption({
    grid: { left: 34, right: 18, top: 26, bottom: 30 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: summary.value.activityTrend.map((item) => item.date.slice(5)),
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      axisLabel: { color: '#6B7280' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#E5EAF2' } },
      axisLabel: { color: '#6B7280' },
    },
    series: [
      {
        name: '问答',
        type: 'line',
        smooth: true,
        data: summary.value.activityTrend.map((item) => item.questions),
        symbolSize: 7,
        lineStyle: { color: '#2563EB', width: 3 },
        itemStyle: { color: '#2563EB' },
        areaStyle: { color: 'rgba(37,99,235,0.08)' },
      },
      {
        name: '审查',
        type: 'line',
        smooth: true,
        data: summary.value.activityTrend.map((item) => item.reviews),
        symbolSize: 7,
        lineStyle: { color: '#F59E0B', width: 3 },
        itemStyle: { color: '#F59E0B' },
      },
    ],
  })
}

onMounted(async () => {
  await workbenchStore.fetchSummary()
  await nextTick()
  renderChart()
  window.addEventListener('resize', renderChart)
})

watch(summary, renderChart)

onBeforeUnmount(() => {
  window.removeEventListener('resize', renderChart)
  chart?.dispose()
})
</script>
