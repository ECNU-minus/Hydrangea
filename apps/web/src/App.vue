<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { queryClasses, type ClassItem, type QueryClassesParams } from './api/classes'
import SearchBar from './components/search/SearchBar.vue'
import ClassList, { type ClassListLayout } from './components/search/ClassList.vue'

/** 当前学期（暂固定，学期切换留待后续切片） */
const SEMESTER = '2026-2027-1'

/** 当前布局（暂固定，布局切换留待后续切片） */
const layout = ref<ClassListLayout>('card')

const params = ref<QueryClassesParams>({ semester: SEMESTER })
const items = ref<ClassItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

async function load(p: QueryClassesParams) {
  loading.value = true
  error.value = ''
  try {
    const result = await queryClasses(p)
    items.value = result.items
    total.value = result.total
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onUpdate(p: QueryClassesParams) {
  params.value = p
  load(p)
}

onMounted(() => load(params.value))
</script>

<template>
  <div class="app" :class="{ 'app--wide': layout === 'wide-table' }">
    <header class="app-header">
      <h1>Hydrangea · 课程查询</h1>
      <span class="semester">{{ SEMESTER }}</span>
    </header>

    <div class="layout">
      <aside class="sidebar">
        <SearchBar :params="params" :total="total" @update="onUpdate" />
      </aside>

      <main class="main">
        <p v-if="loading" class="hint">加载中…</p>
        <p v-else-if="error" class="hint error">{{ error }}</p>
        <p v-else-if="items.length === 0" class="hint">暂无搜索结果</p>
        <ClassList v-else :items="items" :layout="layout" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
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
  grid-template-columns: 280px 1fr;
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
