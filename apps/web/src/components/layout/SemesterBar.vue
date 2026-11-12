<script setup lang="ts">
import { watch } from 'vue'
import { useUiStore } from '../../stores/uiStore'
import { usePlanStore } from '../../stores/planStore'
import { useMarkStore } from '../../stores/markStore'
import SemesterSelect from '../search/SemesterSelect.vue'

/**
 * 副栏学期选择（DESIGN §4.1）
 *
 * 两个页面共用：切换学期后由各页面自行响应（搜索页重查课程，排课页重建列表）。
 * 方案与标记都按学期隔离，统一在这里加载（PRD §3.5、§3.2.1）：
 * 学期 → 该学期的方案 → 当前方案 → 该方案的标记。
 */
const uiStore = useUiStore()
const planStore = usePlanStore()
const markStore = useMarkStore()

function onSemesterChange(semester: string): void {
  if (!semester || semester === uiStore.currentSemester) return
  uiStore.setSemester(semester)
}

watch(
  () => uiStore.currentSemester,
  async (semester) => {
    if (!semester) return
    markStore.clearNotice()
    planStore.clearNotice()
    await planStore.load(semester)
    await markStore.resolveDetails()
  },
  { immediate: true },
)
</script>

<template>
  <SemesterSelect
    :options="uiStore.availableSemesters"
    :model-value="uiStore.currentSemester"
    :loading="uiStore.loading"
    :error="uiStore.error"
    @update:model-value="onSemesterChange"
  />
</template>
