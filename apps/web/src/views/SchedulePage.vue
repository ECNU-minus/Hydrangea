<script setup lang="ts">
import SemesterBar from '../components/layout/SemesterBar.vue'
import IntentList from '../components/schedule/IntentList.vue'
import { useUiStore } from '../stores/uiStore'

/**
 * 排课页（DESIGN §4.1）
 *
 * 本切片先提供副栏的意向列表（PRD §3.2.8）；已排标记与周课表在下一步实现。
 */
const uiStore = useUiStore()
</script>

<template>
  <div class="schedule-page">
    <aside class="sidebar">
      <SemesterBar />
      <IntentList />
    </aside>

    <main class="main">
      <section class="placeholder">
        <h2>课表</h2>
        <p>已排标记与周课表将在下一步实现。</p>
        <p class="placeholder__hint">
          当前学期：<span class="mono">{{ uiStore.currentSemester || '—' }}</span>
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.schedule-page {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.sidebar {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg);
}

.main {
  min-width: 0;
}

.placeholder {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 24px;
  color: var(--text);
}

.placeholder h2 {
  margin: 0 0 8px;
  font-size: 1em;
  color: var(--text-h);
}

.placeholder p {
  margin: 4px 0;
  font-size: 0.9em;
}

.placeholder__hint {
  color: var(--text);
}

.mono {
  font-family: var(--mono);
}

@media (max-width: 768px) {
  .schedule-page {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}
</style>
