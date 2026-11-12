<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { queryClasses, type ClassItem, type QueryClassesParams } from '../api/classes'
import { EMPTY_FILTER_OPTIONS, queryFilters, type FilterOptions } from '../api/filters'
import ClassList, { LAYOUT_META } from '../components/search/ClassList.vue'
import SearchBar from '../components/search/SearchBar.vue'
import SemesterBar from '../components/layout/SemesterBar.vue'
import { useIsDesktop } from '../composables/useMediaQuery'
import { useMarkStore } from '../stores/markStore'
import { useSearchStore } from '../stores/searchStore'
import { useUiStore } from '../stores/uiStore'

/** 当前学期与可用学期（DESIGN.md §4.3 uiStore） */
const uiStore = useUiStore()

/**
 * 搜索与筛选条件（DESIGN.md §4.3 searchStore）
 *
 * 条件本身**与学期解耦**：切换学期时按该学期是否存在该选项决定是否生效（PRD §3.6.5）。
 */
const searchStore = useSearchStore()

/** 意向标记（DESIGN.md §4.3 markStore，本地 IndexedDB 持久化） */
const markStore = useMarkStore()

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

/** 全局条件里当前学期用不到的部分：提示它们暂不生效、切回对应学期会恢复 */
const shelvedNotice = computed(() =>
  searchStore.shelved.length
    ? `该学期无此筛选项，暂不生效：${searchStore.shelved.join('、')}（切回对应学期自动恢复）`
    : '',
)

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
  refresh()
}

/**
 * 进入某个学期（PRD §3.2.1/§3.6.5）
 *
 * 全局条件只有一份、不随学期变化；这里只更换「该学期的可用选项」，再由 store 派生
 * 出该学期生效的条件（该学期不存在条件自动暂不生效，切回时恢复），最后查询。
 */
async function activateSemester(semester: string) {
  await loadFilterOptions(semester)
  searchStore.enterSemester(semester, filterOptions.value)
  refresh()
}

// 学期由副栏（SemesterBar）改动，页面据此重新加载筛选项与课程
watch(
  () => uiStore.currentSemester,
  async (semester) => {
    if (!semester) return
    items.value = []
    total.value = 0
    await activateSemester(semester)
  },
  { immediate: true },
)
</script>

<template>
  <div class="search-page" :class="`search-page--${LAYOUT_META[layout].container}`">
    <aside class="sidebar">
      <SemesterBar />
      <SearchBar
        :total="total"
        :options="filterOptions"
        :options-error="filterOptionsError"
        :notice="shelvedNotice"
        @apply="onApply"
      />
    </aside>

    <main class="main">
      <p v-if="markStore.limitNotice || markStore.error" class="intent-notice">
        {{ markStore.limitNotice || markStore.error }}
      </p>
      <p v-if="!uiStore.currentSemester" class="hint">学期信息不可用，请稍后重试</p>
      <p v-else-if="loading && items.length === 0" class="hint">加载中…</p>
      <p v-else-if="error" class="hint error">{{ error }}</p>
      <p v-else-if="items.length === 0" class="hint">暂无搜索结果</p>
      <div v-else class="list-wrap" :class="{ 'is-loading': loading }">
        <ClassList
          :items="items"
          :layout="layout"
          :intent-codes="markStore.intents"
          @toggle-intent="markStore.toggleIntentOf"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.search-page {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

/* 窄容器（卡片布局）：更窄的阅读宽度，居中 */
.search-page--narrow {
  max-width: 900px;
}

/* 宽表格布局：去除两侧空白，占满整个页面 */
.search-page--wide {
  max-width: none;
  padding: 0 0 16px;
}

.search-page--wide .sidebar {
  margin-left: 16px;
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
  padding-top: 0;
}

.search-page--wide .main {
  padding-top: 0;
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

/* 标记相关的提示（上限 / 本地存储不可用） */
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
  .search-page {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}
</style>
