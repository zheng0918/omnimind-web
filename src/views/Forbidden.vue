<template>
  <main class="forbidden-page">
    <section class="forbidden-card">
      <p class="eyebrow">
        403
      </p>
      <h1>当前角色无操作权限</h1>
      <p>请联系管理员调整角色或返回工作台继续查看可访问内容。</p>
      <RouterLink class="btn primary" :to="ROUTE_PATHS.workbench">
        返回工作台
      </RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routes'
</script>
