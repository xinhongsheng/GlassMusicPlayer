<script setup lang="ts">
import { useUserStore } from '@/stores/modules/user'
import { userPlaylist } from '@/api'

const sections = [
  {
    titleKey: 'layout.aside.explore',
    items: [
      { to: '/', labelKey: 'layout.aside.menu.home', icon: 'mdi--home' },
      { to: '/mv-list', labelKey: 'layout.aside.menu.mv', icon: 'mdi--video' },
      { to: '/charts', labelKey: 'layout.aside.menu.charts', icon: 'mdi--chart-line' },
      { to: '/artists', labelKey: 'layout.aside.menu.artists', icon: 'mdi--account-music' },
      { to: '/new-albums', labelKey: 'layout.aside.menu.newAlbums', icon: 'mdi--album' },
      { to: '/search', labelKey: 'layout.aside.menu.search', icon: 'ic--round-search' },
    ],
  },
  {
    titleKey: 'layout.aside.myMusic',
    items: [
      { to: '/my-music', labelKey: 'layout.aside.menu.recent', icon: 'mdi--music-box-multiple' },
      { to: '/local-music', labelKey: 'layout.aside.menu.localMusic', icon: 'mdi--folder-music-outline' },
    ],
  },
  {
    titleKey: 'layout.aside.system',
    items: [{ to: '/settings', labelKey: 'layout.aside.menu.settings', icon: 'mdi--cog' }],
  },
]

interface UserPlaylistItem {
  id: number
  name: string
  coverImgUrl?: string
}

const state = reactive({
  // 用户创建的歌单列表
  userPlaylists: [] as UserPlaylistItem[],
  loading: false,
})
const { userPlaylists } = toRefs(state)
const userStore = useUserStore()

// 获取用户歌单
const fetchUserPlaylists = async () => {
  if (!userStore.isLoggedIn || !userStore.profile?.userId) return
  state.loading = true
  try {
    const res: any = await userPlaylist({ uid: userStore.profile.userId })
    const playlists = res?.playlist || []
    state.userPlaylists = playlists.map((p: any) => ({
      id: p.id,
      name: p.name,
      coverImgUrl: p.coverImgUrl,
    }))
  } catch (e) {
    console.error('获取用户歌单失败:', e)
  } finally {
    state.loading = false
  }
}

// 监听登录状态变化
watch(
  () => userStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      fetchUserPlaylists()
    } else {
      state.userPlaylists = []
    }
  },
  { immediate: true }
)
</script>
<template>
  <aside class="hidden w-64 shrink-0 p-4 py-0 lg:block">
    <div class="glass-card h-full p-4">
      <div v-for="sec in sections" :key="sec.titleKey" class="mb-6">
        <h3 class="text-primary mb-3 text-xs font-semibold tracking-wide uppercase">
          {{ $t(sec.titleKey) }}
        </h3>
        <nav class="space-y-2">
          <router-link
            v-for="item in sec.items"
            :key="item.to"
            :to="item.to"
            class="text-primary hover:text-primary flex items-center space-x-3 rounded-lg p-2 transition-colors hover:bg-white/10"
            :class="{ 'text-primary bg-white/10': $route.path === item.to }"
          >
            <span class="h-5 w-5" :class="`icon-[${item.icon}]`"></span>
            <span>{{ $t(item.labelKey) }}</span>
          </router-link>
          <div class="hidden">
            <span class="icon-[mdi--chevron-right]"></span>
          </div>
        </nav>
      </div>

      <div class="mt-6" v-if="userStore.isLoggedIn">
        <h4 class="text-primary/60 mb-3 text-sm font-medium">
          {{ $t('layout.aside.playlists.created') }}
        </h4>
        <div class="space-y-2">
          <div v-if="state.loading" class="flex items-center justify-center py-4">
            <span class="icon-[mdi--loading] text-primary/50 h-5 w-5 animate-spin"></span>
          </div>
          <div v-else-if="userPlaylists.length === 0" class="text-primary/40 py-2 text-center text-xs">
            暂无歌单
          </div>
          <template v-else>
            <router-link
              v-for="playlist in userPlaylists"
              :key="playlist.id"
              :to="`/playlist/${playlist.id}`"
              class="flex cursor-pointer items-center space-x-3 rounded-lg p-2 transition-colors hover:bg-white/10"
              :class="{ 'text-primary bg-white/10': $route.path === `/playlist/${playlist.id}` }"
            >
              <div
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-pink-400 to-purple-500 text-xs"
              >
                {{ playlist.name.charAt(0) }}
              </div>
              <span class="text-primary/80 truncate text-sm">{{ playlist.name }}</span>
            </router-link>
          </template>
        </div>
      </div>
      <div class="hidden">
        <span class="icon-[mdi--home] h-5 w-5"></span>
        <span class="icon-[mdi--video] h-5 w-5"></span>
        <span class="icon-[mdi--chart-line] h-5 w-5"></span>
        <span class="icon-[ic--round-search] h-5 w-5"></span>
        <span class="icon-[mdi--music-box-multiple] h-5 w-5"></span>
        <span class="icon-[mdi--heart-outline] h-5 w-5"></span>
        <span class="icon-[mdi--cog] h-5 w-5"></span>
        <span class="icon-[mdi--chevron-right] h-5 w-5"></span>
        <span class="icon-[mdi--account-music] h-5 w-5"></span>
        <span class="icon-[mdi--album] h-5 w-5"></span>
      </div>
    </div>
  </aside>
</template>
