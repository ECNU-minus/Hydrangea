<script setup lang="ts">
import { ref } from 'vue'
import type { QueryClassesParams } from '../../api/classes'

const props = defineProps<{
  /** 当前查询参数 */
  params: QueryClassesParams
  /** 总条数（用于分页） */
  total: number
}>()

const emit = defineEmits<{
  (e: 'update', params: QueryClassesParams): void
}>()

/** 培养层次选项固定为三个（PRD §6.1） */
const LEVEL_OPTIONS = ['本科生', '研究生', '辅修、微专业']

/** 课程类型 / 性质 / 部门选项（暂用硬编码占位，后续接入 /api/filters） */
const COURSE_TYPE_OPTIONS = ['通识', '专业']
const COURSE_NATURE_OPTIONS = ['必修', '选修']
const DEPARTMENT_OPTIONS = [
  '计算机科学与技术学院',
  '数学学院',
  '物理与电子科学学院',
  '外语学院',
  '经济与管理学院',
  '体育与健康学院',
]

const keyword = ref(props.params.keyword ?? '')
const courseType = ref(props.params.courseType ?? '')
const courseNature = ref(props.params.courseNature ?? '')
const department = ref(props.params.department ?? '')
const level = ref(props.params.level ?? '')
const page = ref(props.params.page ?? 1)
const pageSize = ref(props.params.pageSize ?? 20)

/** 任一条件变化时，重置到第 1 页并触发查询 */
function apply() {
  emit('update', {
    semester: props.params.semester,
    keyword: keyword.value.trim() || undefined,
    courseType: courseType.value || undefined,
    courseNature: courseNature.value || undefined,
    department: department.value || undefined,
    level: level.value || undefined,
    page: 1,
    pageSize: pageSize.value,
  })
}

/** 分页跳转（保留当前筛选条件） */
function goTo(p: number) {
  page.value = p
  emit('update', {
    semester: props.params.semester,
    keyword: keyword.value.trim() || undefined,
    courseType: courseType.value || undefined,
    courseNature: courseNature.value || undefined,
    department: department.value || undefined,
    level: level.value || undefined,
    page: p,
    pageSize: pageSize.value,
  })
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
      <label>
        课程类型
        <select v-model="courseType" @change="apply">
          <option value="">全部</option>
          <option v-for="o in COURSE_TYPE_OPTIONS" :key="o" :value="o">{{ o }}</option>
        </select>
      </label>

      <label>
        课程性质
        <select v-model="courseNature" @change="apply">
          <option value="">全部</option>
          <option v-for="o in COURSE_NATURE_OPTIONS" :key="o" :value="o">{{ o }}</option>
        </select>
      </label>

      <label>
        开课部门
        <select v-model="department" @change="apply">
          <option value="">全部</option>
          <option v-for="o in DEPARTMENT_OPTIONS" :key="o" :value="o">{{ o }}</option>
        </select>
      </label>

      <label>
        培养层次
        <select v-model="level" @change="apply">
          <option value="">全部</option>
          <option v-for="o in LEVEL_OPTIONS" :key="o" :value="o">{{ o }}</option>
        </select>
      </label>
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
  gap: 8px;
}

.filters label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9em;
  color: var(--text);
}

.filters select {
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
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