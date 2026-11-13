<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useIsDesktop } from './composables/useMediaQuery'
import { useUiStore } from './stores/uiStore'

/**
 * 应用外壳（DESIGN §4.1）
 *
 * 负责页头、窄屏汉堡按钮与页面切换；各页面自己渲染副栏与主栏。
 * 学期列表在这里加载一次，两个页面共用（副栏的 SemesterBar 读取 uiStore）。
 */
const uiStore = useUiStore()
const route = useRoute()
const isDesktop = useIsDesktop()

onMounted(async () => {
  await uiStore.loadSemesters()
})

/** 切换页面后收起抽屉：窄屏下打完标记通常要回主栏看结果 */
watch(
  () => route.fullPath,
  () => uiStore.closeSidebar(),
)

/** 视口变宽后收起抽屉：桌面端副栏常驻，展开状态无意义 */
watch(isDesktop, (desktop) => {
  if (desktop) uiStore.closeSidebar()
})

/** 抽屉展开时锁定背景滚动，避免移动端滚动穿透（未展开时清空内联样式） */
watch(
  () => uiStore.sidebarOpen,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

/** Esc 收起抽屉（PRD §3.6.1） */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && uiStore.sidebarOpen) uiStore.closeSidebar()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="app">
    <header class="app-header">
      <button
        type="button"
        class="app-header__menu"
        :aria-expanded="uiStore.sidebarOpen"
        :aria-label="uiStore.sidebarOpen ? '收起侧栏' : '展开侧栏'"
        @click="uiStore.toggleSidebar()"
      >
        <span aria-hidden="true">{{ uiStore.sidebarOpen ? '✕' : '☰' }}</span>
      </button>

      <h1>Hydrangea</h1>
      <nav class="app-nav">
        <RouterLink to="/search" class="app-nav__link">搜索</RouterLink>
        <RouterLink to="/schedule" class="app-nav__link">排课</RouterLink>
      </nav>
      <span class="semester">{{ uiStore.currentSemester }}</span>
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
}

/* 粘性页头：窄屏下压在抽屉之上，保证汉堡按钮始终可点 */
.app-header {
  position: sticky;
  top: 0;
  z-index: 70;
  display: flex;
  align-items: baseline;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 16px 8px;
  background: var(--bg);
}

.app-header h1 {
  font-size: 1.3em;
  color: var(--text-h);
  margin: 0;
}

/* 汉堡按钮：仅窄屏显示（PRD §3.6.1） */
.app-header__menu {
  display: none;
}

.app-nav {
  display: flex;
  gap: 4px;
}

.app-nav__link {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.9em;
  color: var(--text);
  text-decoration: none;
  border: 1px solid transparent;
}

.app-nav__link:hover {
  border-color: var(--border);
}

.app-nav__link.router-link-active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-bg, rgba(170, 59, 255, 0.08));
}

.semester {
  margin-left: auto;
  font-family: var(--mono);
  color: var(--text);
  font-size: 0.85em;
}

@media (max-width: 768px) {
  .app-header {
    align-items: center;
    gap: 10px;
  }

  .app-header__menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-h);
    font-size: 1.05em;
    line-height: 1;
    cursor: pointer;
  }

  .app-header__menu:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .app-header h1 {
    font-size: 1.1em;
  }

  .semester {
    font-size: 0.78em;
  }
}
</style>
