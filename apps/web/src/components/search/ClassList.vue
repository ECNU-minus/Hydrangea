<script lang="ts">
/** 搜索结果布局类型（DESIGN.md §4.5） */
export type ClassListLayout = 'card' | 'wide-table'

/** 布局对页面容器的需求：narrow = 窄容器（居中），normal = 标准容器（居中 1200px），wide = 占满整个页面 */
export type LayoutContainer = 'narrow' | 'normal' | 'wide'

/**
 * 各布局的容器需求元数据。
 * App.vue 据此决定容器样式，无需关心具体布局名。
 * 新增布局时在此登记即可，App.vue 无需改动。
 */
export const LAYOUT_META: Record<ClassListLayout, { container: LayoutContainer }> = {
  card: { container: 'narrow' },
  'wide-table': { container: 'wide' },
}
</script>

<script setup lang="ts">
import type { ClassItem } from '../../api/classes'
import CardLayout from './layouts/CardLayout.vue'
import WideTableLayout from './layouts/WideTableLayout.vue'

defineProps<{
  items: ClassItem[]
  /** 当前布局（默认卡片） */
  layout?: ClassListLayout
  /** 已打意向标记的教学班代码 */
  intentCodes: string[]
}>()

const emit = defineEmits<{
  /** 切换某教学班的意向标记 */
  toggleIntent: [classCode: string]
}>()
</script>

<template>
  <CardLayout
    v-if="layout === 'card'"
    :items="items"
    :intent-codes="intentCodes"
    @toggle-intent="emit('toggleIntent', $event)"
  />
  <WideTableLayout
    v-else-if="layout === 'wide-table'"
    :items="items"
    :intent-codes="intentCodes"
    @toggle-intent="emit('toggleIntent', $event)"
  />
  <!-- 新增布局在此注册：<XxxLayout v-else-if="layout === 'xxx'" :items="items" :intent-codes="intentCodes" /> -->
</template>