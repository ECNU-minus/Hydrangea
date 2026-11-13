import { defineStore } from 'pinia'
import { ref } from 'vue'
import { querySemesters } from '../api/semesters'

/** 上次选择的学期（PRD §3.6.5；S1 先用 localStorage，待用户数据层落地后迁入 IndexedDB） */
const STORAGE_KEY = 'hydrangea.currentSemester'

function readPersistedSemester(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function persistSemester(semester: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, semester)
  } catch {
    // 隐私模式等场景下写入失败可忽略：仅影响「记住上次学期」
  }
}

/**
 * UI 状态（DESIGN §4.3）
 *
 * 负责当前学期与可用学期列表、窄屏副栏的展开状态；课程查询结果与筛选项仍由页面自行维护。
 */
export const useUiStore = defineStore('ui', () => {
  /** 可用学期（最新在前，顺序由后端保证） */
  const availableSemesters = ref<string[]>([])
  /** 当前学期 */
  const currentSemester = ref('')
  const loading = ref(false)
  const error = ref('')
  /** 窄屏副栏是否展开（桌面端常驻显示，此状态不参与） */
  const sidebarOpen = ref(false)

  /** 展开/收起窄屏副栏（PRD §3.6.1 汉堡按钮） */
  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  /** 收起窄屏副栏（遮罩点击、Esc、路由切换时调用） */
  function closeSidebar(): void {
    sidebarOpen.value = false
  }

  /**
   * 加载学期列表并确定当前学期
   *
   * 优先级：上次选择（若仍在可用列表中）→ 后端给出的当前学期 → 最新学期。
   */
  async function loadSemesters(): Promise<void> {
    loading.value = true
    try {
      const result = await querySemesters()
      availableSemesters.value = result.semesters

      const persisted = readPersistedSemester()
      const fallback = result.current || result.semesters[0] || ''
      currentSemester.value = result.semesters.includes(persisted) ? persisted : fallback
      error.value = ''
    } catch (e) {
      error.value = e instanceof Error ? e.message : '学期列表加载失败'
    } finally {
      loading.value = false
    }
  }

  /** 切换当前学期（不在可用列表中的值直接忽略） */
  function setSemester(semester: string): void {
    if (!availableSemesters.value.includes(semester)) return
    currentSemester.value = semester
    persistSemester(semester)
  }

  return {
    availableSemesters,
    currentSemester,
    loading,
    error,
    sidebarOpen,
    loadSemesters,
    setSemester,
    toggleSidebar,
    closeSidebar,
  }
})
