<template>
  <main class="login-page">
    <section class="login-card">
      <div class="login-brand">
        <span class="brand-mark">O</span>
        <div>
          <h1>OmniMind</h1>
          <p>全智企业智能助手</p>
        </div>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label>
          <span>用户名</span>
          <input v-model.trim="form.username" autocomplete="username" placeholder="请输入用户名" type="text" />
        </label>
        <label>
          <span>密码</span>
          <input
            v-model.trim="form.password"
            autocomplete="current-password"
            placeholder="请输入密码"
            type="password"
          />
        </label>
        <p v-if="errorText" class="form-error">
          {{ errorText }}
        </p>
        <button class="btn primary login-btn" :disabled="!canSubmit || userStore.loading" type="submit">
          <LoaderCircle v-if="userStore.loading" class="spin" />
          <LogIn v-else />
          登录
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { LoaderCircle, LogIn } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routes'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const errorText = ref('')

const form = reactive({
  username: '',
  password: '',
})

const canSubmit = computed(() => form.username.length > 0 && form.password.length > 0)

async function handleSubmit(): Promise<void> {
  errorText.value = ''
  try {
    await userStore.login(form)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ROUTE_PATHS.workbench
    await router.push(redirect)
  } catch {
    errorText.value = '用户名或密码错误，请重试'
  }
}
</script>
