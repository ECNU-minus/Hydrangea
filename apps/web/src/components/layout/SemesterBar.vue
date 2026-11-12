<script setup lang="ts">
import { watch } from 'vue'
import { useUiStore } from '../../stores/uiStore'
import { useMarkStore } from '../../stores/markStore'
import SemesterSelect from '../search/SemesterSelect.vue'

/**
 * 副栏学期选择（DESIGN §4.1）
 *
 * 两个页面共用：切换学期后由各页面自行响应（搜索页重查课程，排课页重建列表）。
 * 标记按学期隔离，也在这里统一加载（PRD §3.2.1）。
 */
const uiStore = useUiStore()
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
    await markStore.load(semester)
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
