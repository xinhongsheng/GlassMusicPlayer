<script setup lang="ts">
import { qrLoginKey, qrLoginCreate, qrLoginCheck, loginStatus } from '@/api'
import { useUserStore } from '@/stores/modules/user'
import { useI18n } from 'vue-i18n'
import Button from '@/components/Ui/Button.vue'

const { t } = useI18n()
const emit = defineEmits<{ (e: 'close'): void; (e: 'success'): void }>()
const userStore = useUserStore()
const visible = ref(true)
const loginSuccess = ref(false)

const state = reactive({
  loading: false,
  qrKey: '',
  qrImg: '',
  qrPolling: false,
  qrStatusText: '请使用网易云音乐 App 扫码',
  qrUser: null as null | { avatarUrl: string; nickname: string; message?: string },
})
const { loading, qrImg, qrStatusText } = toRefs(state)

const genQr = async () => {
  try {
    state.loading = true
    const keyRes: any = await qrLoginKey()
    const key: string = keyRes?.data?.unikey || keyRes?.data?.key || ''
    state.qrKey = key
    const createRes: any = await qrLoginCreate({ key, qrimg: true })
    state.qrImg = createRes?.data?.qrimg || ''
    state.qrStatusText = '请使用网易云音乐 App 扫码'
    state.qrUser = null
    pollQr()
  } finally {
    state.loading = false
  }
}

let qrTimer: any = null
const pollQr = () => {
  if (!state.qrKey || state.qrPolling) return
  state.qrPolling = true
  const tick = async () => {
    try {
      const res: any = await qrLoginCheck({ key: state.qrKey })
      const code = res?.code
      if (code === 800) {
        state.qrStatusText = '二维码已过期，点击刷新'
        state.qrUser = null
        await genQr()
      } else if (code === 802) {
        const msg = res?.message || res?.data?.message || '已扫码，等待确认'
        const avatarUrl = res?.avatarUrl || res?.data?.avatarUrl || ''
        const nickname = res?.nickname || res?.data?.nickname || ''
        state.qrStatusText = String(msg)
        state.qrUser = {
          avatarUrl: String(avatarUrl),
          nickname: String(nickname),
          message: String(msg),
        }
      } else if (code === 803) {
        state.qrStatusText = '登录成功'
        await fetchLoginStatus()
        state.qrPolling = false
        clearInterval(qrTimer)
        loginSuccess.value = true
        visible.value = false
      }
    } catch {}
  }
  tick()
  qrTimer = setInterval(tick, 3000)
}

const fetchLoginStatus = async () => {
  const statusRes: any = await loginStatus()
  const profile = statusRes?.data?.profile || statusRes?.profile || statusRes?.account?.profile
  if (profile) {
    userStore.setUser({
      userId: Number(profile.userId || profile.uid || 0),
      nickname: String(profile.nickname || ''),
      avatarUrl: String(profile.avatarUrl || ''),
      vipType: Number(profile.vipType || 0),
    })
  }
}

onUnmounted(() => {
  if (qrTimer) clearInterval(qrTimer)
})

const handleAfterLeave = () => {
  if (loginSuccess.value) emit('success')
  emit('close')
  loginSuccess.value = false
}

const stopQrPolling = () => {
  if (qrTimer) clearInterval(qrTimer)
  qrTimer = null
  state.qrPolling = false
}

watch(visible, v => {
  if (!v) {
    stopQrPolling()
  }
})

// 组件挂载时自动生成二维码
onMounted(() => {
  genQr()
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <Transition name="mask" appear>
      <div
        v-if="visible"
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="visible = false"
      />
    </Transition>

    <Transition name="dialog" appear @after-leave="handleAfterLeave">
      <div v-if="visible" class="relative z-10 w-full max-w-xl">
        <div class="glass-container-strong overflow-hidden">
          <Button
            variant="soft"
            size="icon-sm"
            rounded="full"
            icon="mdi--close"
            icon-class="h-4 w-4"
            class="absolute top-4 right-4 z-20"
            @click="visible = false"
          />

          <div class="relative p-6 pb-4">
            <div class="flex items-center gap-4">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/25"
              >
                <span class="icon-[mdi--qrcode-scan] h-6 w-6 text-white" />
              </div>
              <div>
                <h2 class="text-primary text-xl font-bold">{{ t('auth.qrLogin') }}</h2>
                <p class="text-primary/50 mt-0.5 text-sm">
                  {{ t('auth.qrTip') || '使用网易云音乐 App 扫码登录' }}
                </p>
              </div>
            </div>
          </div>

          <div class="px-6 pb-6">
              <div class="flex flex-col items-center">
                <div class="relative mb-4">
                  <div class="overflow-hidden rounded-2xl bg-white p-3 shadow-xl">
                    <img
                      v-if="qrImg"
                      :src="qrImg"
                      :alt="t('auth.qr') || '二维码'"
                      class="h-44 w-44"
                    />
                    <div v-else class="flex h-44 w-44 items-center justify-center">
                      <span class="icon-[mdi--loading] h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  </div>
                  <Transition name="fade">
                    <div
                      v-if="state.qrUser?.avatarUrl"
                      class="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80 backdrop-blur-sm"
                    >
                      <div class="flex flex-col items-center gap-2">
                        <img
                          :src="state.qrUser.avatarUrl"
                          :alt="state.qrUser.nickname"
                          class="h-16 w-16 rounded-full ring-2 ring-white/20"
                        />
                        <span class="text-primary text-sm font-medium">{{
                          state.qrUser.nickname
                        }}</span>
                      </div>
                    </div>
                  </Transition>
                </div>

                <div class="mb-4 text-center">
                  <p class="text-primary/80 text-sm">
                    {{ state.qrUser?.message || qrStatusText || t('common.loading') + '...' }}
                  </p>
                  <p
                    v-if="state.qrUser?.nickname && !state.qrUser?.message"
                    class="text-primary mt-1 font-medium"
                  >
                    {{ state.qrUser.nickname }}
                  </p>
                </div>

                <Button
                  
                  size="md"
                  :loading="loading"
                  :disabled="loading"
                  icon="mdi--refresh"
                  @click="genQr"
                >
                  {{ t('auth.refreshQr') || '刷新二维码' }}
                </Button>
              </div>
            </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

.mask-enter-active,
.mask-leave-active {
  transition: opacity 0.3s ease;
}
.mask-enter-from,
.mask-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
