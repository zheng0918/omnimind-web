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
    <section class="panel">
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
            <td>{{ user.role }}</td>
            <td><span class="status-tag parsed">{{ user.status }}</span></td>
            <td>{{ user.updatedAt }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="panel">
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

    <section class="panel">
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

    <section class="panel">
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
import { Download, UserPlus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import type { AuditLog, SysDictItem, SysRole, SysUser } from '@/types/api'

const users: SysUser[] = [
  { userId: 'u-001', username: 'zhangwei', realName: '张华', role: 'admin', status: 'ENABLED', updatedAt: '2026-06-14' },
  { userId: 'u-002', username: 'limin', realName: '李敏', role: 'editor', status: 'ENABLED', updatedAt: '2026-06-13' },
  { userId: 'u-003', username: 'wangyu', realName: '王宇', role: 'viewer', status: 'DISABLED', updatedAt: '2026-06-12' },
]

const roles: SysRole[] = [
  { role: 'admin', name: '管理员', permissions: ['全模块读写', '系统管理'] },
  { role: 'editor', name: '编辑者', permissions: ['问答', '审查', '编写', '知识库写'] },
  { role: 'viewer', name: '只读用户', permissions: ['问答只读', '知识库读'] },
]

const dicts: SysDictItem[] = [
  { dictId: 'd-1', type: 'projectType', label: '学校工程', value: 'school', enabled: true },
  { dictId: 'd-2', type: 'projectType', label: '市政工程', value: 'municipal', enabled: true },
  { dictId: 'd-3', type: 'clientType', label: '政府客户', value: 'gov', enabled: true },
]

const logs: AuditLog[] = [
  { logId: 'l-1', userId: 'u-001', module: 'KB', action: 'UPLOAD', traceId: 'tr-1024', createdAt: '2026-06-14' },
  { logId: 'l-2', userId: 'u-002', module: 'REVIEW', action: 'DISPOSE', traceId: 'tr-1025', createdAt: '2026-06-14' },
]
</script>
