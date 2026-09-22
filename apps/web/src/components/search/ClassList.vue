<script setup lang="ts">
import type { ClassItem } from '../../api/classes'
import CardLayout from './layouts/CardLayout.vue'
import TableLayout from './layouts/TableLayout.vue'

/** 搜索结果布局类型（DESIGN.md §4.5） */
export type ClassListLayout = 'card' | 'table' | 'wide-table'

defineProps<{
  items: ClassItem[]
  /** 当前布局（默认卡片） */
  layout?: ClassListLayout
}>()
</script>

<template>
  <CardLayout v-if="layout === 'card'" :items="items" />
  <TableLayout v-else-if="layout === 'table'" :items="items" />
  <!-- 新增布局在此注册：<XxxLayout v-else-if="layout === 'xxx'" :items="items" /> -->
</template>