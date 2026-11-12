<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useUiStore } from './stores/uiStore'

/**
 * 应用外壳（DESIGN §4.1）
 *
 * 负责页头与页面切换；各页面自己渲染副栏与主栏。
 * 学期列表在这里加载一次，两个页面共用（副栏的 SemesterBar 读取 uiStore）。
 */
const uiStore = useUiStore()

onMounted(async () => {
  await uiStore.loadSemesters()
})
</script>

<template>
  <div class="app">
    <header class="app-header">
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

.app-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 16px 8px;
}

.app-header h1 {
  font-size: 1.3em;
  color: var(--text-h);
  margin: 0;
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
</style>
