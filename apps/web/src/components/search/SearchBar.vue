<script setup lang="ts">
import { computed, ref } from 'vue'
import type { QueryClassesParams } from '../../api/classes'
import type { FilterOptions } from '../../api/filters'

const props = defineProps<{
  /** 当前查询参数 */
  params: QueryClassesParams
  /** 总条数（用于分页） */
  total: number
  /** 由 /api/filters 提供的三项选项（按当前学期生成） */
  options: FilterOptions
  /** 筛选项加载失败提示（空串表示正常） */
  optionsError?: string
}>()

const emit = defineEmits<{
  (e: 'update', params: QueryClassesParams): void
}>()

/** 培养层次选项固定为三个（PRD §6.1），不来自 /api/filters（DESIGN §3.3） */
const LEVEL_OPTIONS = ['本科生', '研究生', '辅修、微专业']

/** 四项筛选维度（每项均为复选，key 与 QueryClassesParams 的筛选字段同名） */
type FilterKey = 'courseType' | 'courseNature' | 'department' | 'level'

/** 筛选项来自 /api/filters，随学期与数据自动变化（PRD §6.2） */
const groups = computed<
  { key: FilterKey; label: string; options: string[] }[]
>(() => [
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

/** 关键词 */
const keyword = ref(props.params.keyword ?? '')

/** 四项筛选的复选状态（空数组 = 该项不限） */
const selected = ref<Record<FilterKey, string[]>>({
  courseType: [...(props.params.courseType ?? [])],
  courseNature: [...(props.params.courseNature ?? [])],
  department: [...(props.params.department ?? [])],
  level: [...(props.params.level ?? [])],
})

const page = ref(props.params.page ?? 1)
const pageSize = ref(props.params.pageSize ?? 20)

/**
 * 拼装查询参数
 *
 * 筛选项为空数组时传 `undefined`，由 API 客户端省略该参数（DESIGN.md §3.2）。
 */
function buildParams(targetPage: number): QueryClassesParams {
  const pick = (key: FilterKey) => {
    const values = selected.value[key]
    return values.length ? [...values] : undefined
  }

  return {
    semester: props.params.semester,
    keyword: keyword.value.trim() || undefined,
    courseType: pick('courseType'),
    courseNature: pick('courseNature'),
    department: pick('department'),
    level: pick('level'),
    page: targetPage,
    pageSize: pageSize.value,
  }
}

/** 任一条件变化时，重置到第 1 页并触发查询 */
function apply() {
  page.value = 1
  emit('update', buildParams(1))
}

/** 分页跳转（保留当前筛选条件） */
function goTo(p: number) {
  page.value = p
  emit('update', buildParams(p))
}

const totalPages = () => Math.max(1, Math.ceil(props.total / pageSize.value))
</script>

<template>
  <div class="search-bar">
    <input
      v-model="keyword"
      class="keyword"
      type="text"
      placeholder="搜索课程名称、代码、教师、地点…"
      @input="apply"
    />

    <div class="filters">
      <template v-for="group in groups" :key="group.key">
        <div v-if="group.options.length" class="filter-group">
          <span class="filter-group__label">{{ group.label }}</span>
          <div class="options">
            <label v-for="option in group.options" :key="option" class="option">
              <input
                v-model="selected[group.key]"
                type="checkbox"
                :value="option"
                @change="apply"
              />
              <span class="option__text">{{ option }}</span>
            </label>
          </div>
        </div>
      </template>

      <p v-if="optionsError" class="filter-error">{{ optionsError }}</p>
      <p v-else-if="!dynamicOptionsReady" class="filter-hint">筛选项加载中…</p>
      <p v-else class="filter-hint">不勾选任何选项表示该项不限；同一项内可多选。</p>
    </div>

    <div class="pagination">
      <button :disabled="page <= 1" @click="goTo(page - 1)">上一页</button>
      <span>第 {{ page }} / {{ totalPages() }} 页 · 共 {{ total }} 条</span>
      <button :disabled="page >= totalPages()" @click="goTo(page + 1)">下一页</button>
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
