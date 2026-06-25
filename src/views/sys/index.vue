<template>
  <PageHeader title="系统管理" description="用户、角色、字典与操作日志基础管理。">
    <template #actions>
      <button class="btn" type="button">
        <UserPlus />
        新建用户
      </button>
      <button class="btn primary" type="button">
        <Download />
        导出日志
      </button>
    </template>
  </PageHeader>

  <div class="sys-layout">
    <section v-show="activeTab === 'users'" class="panel">
      <div class="panel-head">
        <h3>用户管理</h3>
        <span class="meta">REQ-SYS-01</span>
      </div>
      <table class="km-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>状态</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.userId">
            <td>{{ user.realName }} · {{ user.username }}</td>
            <td>
              <select
                :value="user.role"
                @change="onAssignRole(user, ($event.target as HTMLSelectElement).value as Role)"
              >
                <option v-for="r in ROLE_OPTIONS" :key="r" :value="r">
                  {{ r }}
                </option>
              </select>
            </td>
            <td><span class="status-tag parsed">{{ user.status }}</span></td>
            <td>{{ user.updatedAt }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-show="activeTab === 'roles'" class="panel">
      <div class="panel-head">
        <h3>角色与权限</h3>
        <span class="meta">只读内置角色</span>
      </div>
      <div class="role-grid">
        <article v-for="role in roles" :key="role.role" class="role-card">
          <h4>{{ role.name }}</h4>
          <p>{{ role.role }}</p>
          <span v-for="permission in role.permissions" :key="permission" class="chip on">{{ permission }}</span>
        </article>
      </div>
    </section>

    <section v-show="activeTab === 'dicts'" class="panel">
      <div class="panel-head">
        <h3>字典配置</h3>
        <span class="meta">项目类型 / 客户类型</span>
      </div>
      <div class="dict-list">
        <button v-for="dict in dicts" :key="dict.dictId" class="dict-item" type="button">
          <span>{{ dict.label }}</span>
          <b>{{ dict.value }}</b>
        </button>
      </div>
    </section>

    <section v-show="activeTab === 'logs'" class="panel">
      <div class="panel-head">
        <h3>操作日志</h3>
        <span class="meta">trace_id</span>
      </div>
      <div class="audit-list">
        <article v-for="log in logs" :key="log.logId" class="audit-item">
          <span>{{ log.module }} · {{ log.action }}</span>
          <b>{{ log.traceId }}</b>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Download, UserPlus } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { assignRole, listAuditLogs, listDicts, listRoles, listUsers } from '@/api/sys'
import PageHeader from '@/components/common/PageHeader.vue'
import type { AuditLog, Role, SysDictItem, SysRole, SysUser } from '@/types/api'

// 全部由 onMounted 接口拉取；失败由 http 拦截统一提示，保持空态，不回退假数据。
const users = ref<SysUser[]>([])
const roles = ref<SysRole[]>([])
const dicts = ref<SysDictItem[]>([])
const logs = ref<AuditLog[]>([])

const ROLE_OPTIONS: Role[] = ['admin', 'editor', 'viewer']

// 当前子模块由侧边栏「系统管理」子菜单经 ?tab= 驱动，单次只展示对应面板。
type SysTab = 'users' | 'roles' | 'dicts' | 'logs'
const SYS_TABS: SysTab[] = ['users', 'roles', 'dicts', 'logs']
const route = useRoute()
const activeTab = computed<SysTab>(() => {
  const tab = route.query.tab
  return SYS_TABS.includes(tab as SysTab) ? (tab as SysTab) : 'users'
})

async function onAssignRole(user: SysUser, role: Role): Promise<void> {
  const previous = user.role
  if (role === previous) return
  user.role = role
  try {
    await assignRole(user.userId, role)
    ElMessage.success('角色已更新')
  } catch {
    user.role = previous
    ElMessage.error('角色更新失败，请稍后重试')
  }
}

onMounted(async () => {
  const [u, r, d, l] = await Promise.allSettled([
    listUsers(),
    listRoles(),
    listDicts(),
    listAuditLogs({ pageNum: 1, pageSize: 20 }),
  ])
  if (u.status === 'fulfilled') users.value = u.value
  if (r.status === 'fulfilled') roles.value = r.value
  if (d.status === 'fulfilled') dicts.value = d.value
  if (l.status === 'fulfilled') logs.value = l.value.list
})
</script>

<style scoped lang="scss">
/* 子菜单切换后单次仅展示一个面板，布局改为单列通栏。 */
.sys-layout {
  grid-template-columns: 1fr;
}
</style>
