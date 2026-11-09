<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { queryClasses, type ClassItem, type QueryClassesParams } from './api/classes'
import { EMPTY_FILTER_OPTIONS, queryFilters, type FilterOptions } from './api/filters'
import SemesterSelect from './components/search/SemesterSelect.vue'
import SearchBar from './components/search/SearchBar.vue'
import ClassList, { LAYOUT_META } from './components/search/ClassList.vue'
import { useIsDesktop } from './composables/useMediaQuery'
import { useSearchStore } from './stores/searchStore'
import { useUiStore } from './stores/uiStore'

/** 当前学期与可用学期（DESIGN.md §4.3 uiStore） */
const uiStore = useUiStore()

/**
 * 搜索与筛选条件（DESIGN.md §4.3 searchStore）
 *
 * 条件本身**与学期解耦**：切换学期时只裁掉新学期不存在的选中值，其余保持
 * （PRD §3.6.5）。学期只在组装查询参数时传入。
 */
const searchStore = useSearchStore()

/** 布局随视口自适应：桌面端宽表格，移动端卡片（DESIGN.md §4.5） */
const isDesktop = useIsDesktop()
const layout = computed(() => (isDesktop.value ? 'wide-table' : 'card'))

const items = ref<ClassItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

/** 筛选项（课程类型/性质/部门，按当前学期由后端生成；培养层次固定，见 SearchBar） */
const filterOptions = ref<FilterOptions>({ ...EMPTY_FILTER_OPTIONS })
const filterOptionsError = ref('')

/** 切换学期时被暂存的筛选项提示（空串表示无） */
const shelvedNotice = ref('')

/** 加载筛选项：失败不清空已加载的选项，仅在副栏提示 */
async function loadFilterOptions(semester: string) {
  try {
    filterOptions.value = await queryFilters(semester)
    filterOptionsError.value = ''
  } catch (e) {
    filterOptionsError.value = e instanceof Error ? e.message : '筛选项加载失败'
  }
}

/** 只接受最后一次请求的结果：关键词输入与筛选切换都会连续触发查询，响应可能乱序到达 */
let latestRequestId = 0

async function load(p: QueryClassesParams) {
  const requestId = ++latestRequestId
  loading.value = true
  error.value = ''
  try {
    const result = await queryClasses(p)
    if (requestId !== latestRequestId) return
    items.value = result.items
    total.value = result.total
  } catch (e) {
    if (requestId !== latestRequestId) return
    error.value = e instanceof Error ? e.message : '加载失败'
    items.value = []
    total.value = 0
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

/** 按当前条件 + 条件所属学期查询 */
function refresh() {
  if (!searchStore.boundSemester) return
  load(searchStore.toParams())
}

/** 条件变化（关键词 / 复选 / 翻页）：条件状态已在 store 中更新 */
function onApply() {
  shelvedNotice.value = ''
  refresh()
}

/**
 * 进入某个学期（PRD §3.2.1/§3.6.5）
 *
 * 先取该学期筛选项，再让 searchStore 合并/恢复条件，最后查询：
 * 1. 原学期中该学期同样存在的条件**顺延选中**；
 * 2. 该学期此前记住的条件**恢复**；
 * 3. 该学期暂时不存在的条件**暂存**（提示用户，切回时自动恢复）。
 */
async function activateSemester(semester: string) {
  await loadFilterOptions(semester)
  const { shelved } = searchStore.enterSemester(semester, filterOptions.value)
  shelvedNotice.value = shelved.length
    ? `该学期无此筛选项，已暂存：${shelved.join('、')}（切回对应学期自动恢复）`
    : ''
  refresh()
}

async function onSemesterChange(semester: string) {
  if (!semester || semester === uiStore.currentSemester) return

  uiStore.setSemester(semester)
  items.value = []
  total.value = 0
  await activateSemester(semester)
}

onMounted(async () => {
  await uiStore.loadSemesters()
  const semester = uiStore.currentSemester
  if (!semester) return

  await activateSemester(semester)
})
</script>

<template>
  <div class="app" :class="`app--${LAYOUT_META[layout].container}`">
    <header class="app-header">
      <h1>Hydrangea · 课程查询</h1>
      <span class="semester">{{ uiStore.currentSemester }}</span>
    </header>

    <div class="layout">
      <aside class="sidebar">
        <SemesterSelect
          :options="uiStore.availableSemesters"
          :model-value="uiStore.currentSemester"
          :loading="uiStore.loading"
          :error="uiStore.error"
          @update:model-value="onSemesterChange"
        />
        <SearchBar
          :total="total"
          :options="filterOptions"
          :options-error="filterOptionsError"
          :notice="shelvedNotice"
          @apply="onApply"
        />
      </aside>

      <main class="main">
        <p v-if="!uiStore.currentSemester" class="hint">学期信息不可用，请稍后重试</p>
        <p v-else-if="loading && items.length === 0" class="hint">加载中…</p>
        <p v-else-if="error" class="hint error">{{ error }}</p>
        <p v-else-if="items.length === 0" class="hint">暂无搜索结果</p>
        <div v-else class="list-wrap" :class="{ 'is-loading': loading }">
          <ClassList :items="items" :layout="layout" />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

/* 窄容器（卡片布局）：更窄的阅读宽度，居中 */
.app--narrow {
  max-width: 900px;
}

/* 宽表格布局：去除两侧空白，占满整个页面 */
.app--wide {
  max-width: none;
  padding: 0;
}

.app--wide .app-header {
  padding: 16px 16px 0;
}

.app--wide .layout {
  padding: 0 0 16px;
}

.app--wide .sidebar {
  margin-left: 16px;
}

.app-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.app-header h1 {
  font-size: 1.4em;
  color: var(--text-h);
  margin: 0;
}

.semester {
  font-family: var(--mono);
  color: var(--text);
  font-size: 0.9em;
}

.layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.sidebar {
  position: sticky;
  top: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg);
}

.main {
  min-width: 0;
}

/* 加载时保留旧内容，仅降低透明度提示加载中，避免闪屏 */
.list-wrap {
  transition: opacity 0.15s ease;
}

.list-wrap.is-loading {
  opacity: 0.5;
  pointer-events: none;
}

.hint {
  color: var(--text);
  text-align: center;
  padding: 32px 0;
}

.hint.error {
  color: #d33;
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}
</style>
