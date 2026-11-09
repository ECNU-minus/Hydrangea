<script setup lang="ts">
import { computed } from 'vue'
import type { FilterOptions } from '../../api/filters'
import { LEVEL_OPTIONS, type FilterKey } from '../../core/search'
import { useSearchStore } from '../../stores/searchStore'

const props = defineProps<{
  /** 总条数（用于分页） */
  total: number
  /** 由 /api/filters 提供的三项选项（按当前学期生成） */
  options: FilterOptions
  /** 筛选项加载失败提示（空串表示正常） */
  optionsError?: string
  /** 切换学期时因该学期无此值而被取消的筛选项提示 */
  notice?: string
}>()

const emit = defineEmits<{
  (e: 'apply'): void
}>()

/** 搜索与筛选条件集中在 searchStore（与学期解耦） */
const store = useSearchStore()

/** 四项筛选维度：前三项来自 /api/filters，培养层次固定（PRD §6.1） */
const groups = computed<{ key: FilterKey; label: string; options: string[] }[]>(() => [
  { key: 'courseType', label: '课程类型', options: props.options.courseTypes },
  { key: 'courseNature', label: '课程性质', options: props.options.courseNatures },
  { key: 'department', label: '开课部门', options: props.options.departments },
  { key: 'level', label: '培养层次', options: LEVEL_OPTIONS },
])

/** 三项动态选项是否已就绪（培养层次固定，不计入） */
const dynamicOptionsReady = computed(
  () =>
    props.options.courseTypes.length > 0 ||
    props.options.courseNatures.length > 0 ||
    props.options.departments.length > 0,
)

function onKeywordInput(event: Event) {
  store.updateKeyword((event.target as HTMLInputElement).value)
  emit('apply')
}

function isChecked(key: FilterKey, value: string): boolean {
  return store.selections[key].includes(value)
}

function onToggle(key: FilterKey, value: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const current = store.selections[key]
  store.setSelection(
    key,
    checked ? [...current, value] : current.filter((item) => item !== value),
  )
  emit('apply')
}

function goTo(target: number) {
  store.setPage(target)
  emit('apply')
}

const totalPages = () => Math.max(1, Math.ceil(props.total / store.pageSize))
</script>

<template>
  <div class="search-bar">
    <input
      class="keyword"
      type="text"
      placeholder="搜索课程名称、代码、教师、地点…"
      :value="store.keyword"
      @input="onKeywordInput"
    />

    <div class="filters">
      <template v-for="group in groups" :key="group.key">
        <div v-if="group.options.length" class="filter-group">
          <span class="filter-group__label">{{ group.label }}</span>
          <div class="options">
            <label v-for="option in group.options" :key="option" class="option">
              <input
                type="checkbox"
                :value="option"
                :checked="isChecked(group.key, option)"
                @change="onToggle(group.key, option, $event)"
              />
              <span class="option__text">{{ option }}</span>
            </label>
          </div>
        </div>
      </template>

      <p v-if="optionsError" class="filter-error">{{ optionsError }}</p>
      <p v-else-if="!dynamicOptionsReady" class="filter-hint">筛选项加载中…</p>
      <p v-if="notice" class="filter-note">{{ notice }}</p>
      <p v-if="dynamicOptionsReady" class="filter-hint">
        不勾选任何选项表示该项不限；同一项内可多选。
      </p>
    </div>

    <div class="pagination">
      <button :disabled="store.page <= 1" @click="goTo(store.page - 1)">上一页</button>
      <span>第 {{ store.page }} / {{ totalPages() }} 页 · 共 {{ total }} 条</span>
      <button :disabled="store.page >= totalPages()" @click="goTo(store.page + 1)">下一页</button>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.keyword {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 1em;
  background: var(--bg);
  color: var(--text-h);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group__label {
  font-size: 0.9em;
  color: var(--text);
}

/* 选项较多时（如开课部门）在组内滚动，避免副栏被撑得过长 */
.options {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 2px 0;
  font-size: 0.9em;
  color: var(--text-h);
  cursor: pointer;
}

.option input {
  flex: none;
  margin: 2px 0 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.option__text {
  overflow-wrap: anywhere;
}

.filter-hint {
  font-size: 0.8em;
  color: var(--text);
  opacity: 0.8;
}

.filter-note {
  font-size: 0.8em;
  color: #a06200;
}

.filter-error {
  font-size: 0.8em;
  color: #d33;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: var(--text);
}

.pagination button {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
