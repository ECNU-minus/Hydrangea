<script setup lang="ts">
import { computed, ref } from 'vue'
import TimetableGrid from '../components/schedule/TimetableGrid.vue'
import IntentList from '../components/schedule/IntentList.vue'
import PlanBar from '../components/schedule/PlanBar.vue'
import SemesterBar from '../components/layout/SemesterBar.vue'
import SidebarDrawer from '../components/layout/SidebarDrawer.vue'
import { detectConflicts } from '../core/conflict'
import { buildTimetable } from '../core/timetable'
import { useMarkStore } from '../stores/markStore'
import { useUiStore } from '../stores/uiStore'

/**
 * 排课页（DESIGN §4.1）
 *
 * 副栏：学期 + 意向列表（可打已排）；主栏：按已排教学班自动生成的周课表（PRD §3.3）。
 */
const uiStore = useUiStore()
const markStore = useMarkStore()

/** 只看某一周（`0` 表示全部），周次由已排课程数据推导（PRD §3.6.1） */
const selectedWeek = ref(0)

/** 冲突检测（PRD §3.6.4）：仅在当前学期的已排教学班之间进行 */
const conflicts = computed(() => detectConflicts(markStore.scheduledSessions))

/** 当前视图包含的已排教学班（按周查看时只保留该周有课的） */
const visibleSessions = computed(() =>
  selectedWeek.value === 0
    ? markStore.scheduledSessions
    : markStore.scheduledSessions.filter((session) => session.weeks.includes(selectedWeek.value)),
)

/** 课表网格 */
const timetable = computed(() => buildTimetable(visibleSessions.value, conflicts.value))

/** 当前视图内的冲突（按周查看时只提示该周的冲突） */
const visibleConflicts = computed(() => detectConflicts(visibleSessions.value))

/** 冲突对文案，如 "COMM1502.01 ↔ GEOG1101.01" */
const conflictText = computed(() =>
  visibleConflicts.value.pairs.map(([a, b]) => `${a} ↔ ${b}`).join('；'),
)
</script>

<template>
  <div class="schedule-page">
    <SidebarDrawer class="schedule-sidebar" scrollable>
      <SemesterBar />
      <PlanBar />
      <IntentList />
    </SidebarDrawer>

    <main class="main">
      <p v-if="markStore.limitNotice || markStore.error" class="intent-notice">
        {{ markStore.limitNotice || markStore.error }}
      </p>

      <div class="toolbar">
        <h2 class="toolbar__title">
          课表
          <span class="toolbar__count">{{ markStore.scheduledCount }} 门</span>
        </h2>
        <label v-if="timetable.weeks.length > 0" class="toolbar__week">
          查看
          <select v-model.number="selectedWeek">
            <option :value="0">全部周次</option>
            <option v-for="week in timetable.weeks" :key="week" :value="week">
              第 {{ week }} 周
            </option>
          </select>
        </label>
      </div>

      <p v-if="!uiStore.currentSemester" class="hint">学期信息不可用，请稍后重试</p>
      <p v-else-if="markStore.scheduledCount === 0" class="hint">
        还没有已排课程：在左侧意向列表里勾选「已排」，课程会出现在课表中
      </p>
      <template v-else>
        <p v-if="conflictText" class="conflict-notice">
          时间冲突（已排入，不做阻止）：{{ conflictText }}
        </p>
        <TimetableGrid :grid="timetable" />
      </template>
    </main>
  </div>
</template>

<style scoped>
.schedule-page {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  width: 100%;
  padding: 16px;
}

.main {
  min-width: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.toolbar__title {
  margin: 0;
  font-size: 1em;
  color: var(--text-h);
}

.toolbar__count {
  font-family: var(--mono);
  font-size: 0.85em;
  color: var(--accent);
  margin-left: 6px;
}

.toolbar__week {
  margin-left: auto;
  font-size: 0.85em;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar__week select {
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 0.95em;
}

.hint {
  color: var(--text);
  text-align: center;
  padding: 32px 0;
}

.conflict-notice {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(211, 47, 47, 0.35);
  background: rgba(211, 47, 47, 0.08);
  color: #b3261e;
  font-size: 0.85em;
}

.intent-notice {
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(180, 120, 0, 0.35);
  background: rgba(255, 193, 7, 0.12);
  color: #8a5a00;
  font-size: 0.9em;
}

@media (max-width: 768px) {
  .schedule-page {
    grid-template-columns: 1fr;
  }
}
</style>
