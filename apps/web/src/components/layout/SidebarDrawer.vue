<script setup lang="ts">
import { useUiStore } from '../../stores/uiStore'

/**
 * 副栏外壳（DESIGN §4.1）
 *
 * - 桌面端：常驻左侧粘性面板（宽度由所在页面的网格列决定）；
 * - 窄屏：左侧抽屉，由页头的汉堡按钮（`App.vue`）切换展开，配半透明遮罩，
 *   点遮罩、按 Esc、切换路由都会收起（PRD §3.6.1）。
 *
 * 副栏内容由各页面通过默认插槽提供，两页共用同一套抽屉行为。
 */
withDefaults(defineProps<{ scrollable?: boolean }>(), { scrollable: false })

const uiStore = useUiStore()
</script>

<template>
  <div class="sidebar-drawer">
    <aside
      class="sidebar"
      :class="{ 'sidebar--open': uiStore.sidebarOpen, 'sidebar--scrollable': scrollable }"
    >
      <slot />
    </aside>

    <div v-if="uiStore.sidebarOpen" class="sidebar-backdrop" @click="uiStore.closeSidebar()" />
  </div>
</template>

<style scoped>
.sidebar-drawer {
  min-width: 0;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg);
}

.sidebar--scrollable {
  max-height: calc(100vh - 96px);
  overflow-y: auto;
}

/* 桌面端：常驻在网格左列，随页面滚动粘住 */
@media (min-width: 769px) {
  .sidebar {
    position: sticky;
    top: 16px;
  }

  .sidebar-backdrop {
    display: none;
  }
}

/* 窄屏：抽屉从左侧滑出，压在内容之上、页头之下 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 60;
    width: min(320px, 86vw);
    max-height: none;
    border-radius: 0;
    border-width: 0 1px 0 0;
    padding-top: 64px; /* 让出页头高度，避免内容被页头遮住 */
    overflow-y: auto;
    box-shadow: 2px 0 16px rgba(0, 0, 0, 0.18);
    transform: translateX(-100%);
    visibility: hidden;
    /* 关闭时先滑出、再隐藏；展开时立即可见（visibility 不参与补间） */
    transition:
      transform 0.22s ease,
      visibility 0s linear 0.22s;
  }

  .sidebar--open {
    transform: translateX(0);
    visibility: visible;
    transition:
      transform 0.22s ease,
      visibility 0s;
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 55;
    background: rgba(0, 0, 0, 0.42);
  }
}

/* 尊重系统的「减少动效」设置 */
@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}
</style>
