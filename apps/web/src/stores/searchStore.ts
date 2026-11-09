import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { QueryClassesParams } from '../api/classes'
import type { FilterOptions } from '../api/filters'
import {
  applyVisibleSelections,
  availableOptionsOf,
  buildQueryParams,
  clipSelections,
  emptySelections,
  shelvedValues,
  type AvailableOptions,
  type FilterKey,
  type FilterSelections,
} from '../core/search'

/**
 * 条件持久化（S2 引入 IndexedDB 后迁入 `settings`）
 *
 * 全局只保存一份条件，刷新页面后仍可恢复（PRD §3.6.5）。
 */
const STORAGE_KEY = 'hydrangea.searchConditions.v2'

interface PersistedConditions {
  keyword: string
  /** 全局条件（可能含当前学期用不到的值，切到对应学期再生效） */
  selections: FilterSelections
}

function loadPersisted(): PersistedConditions {
  const empty: PersistedConditions = { keyword: '', selections: emptySelections() }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<PersistedConditions>
    const saved = parsed.selections
    if (!saved || typeof saved !== 'object') return empty
    return {
      keyword: typeof parsed.keyword === 'string' ? parsed.keyword : '',
      selections: { ...emptySelections(), ...saved },
    }
  } catch {
    // 隐私模式或数据损坏：退化为空条件，不影响页面可用
    return empty
  }
}

/**
 * 搜索与筛选条件（DESIGN §4.3）
 *
 * **全局一份条件，学期只决定生效范围**：
 * - `saved` 是唯一的一份条件（勾选/取消都改它），跨学期保留；
 * - `selections` 是当前学期**生效**的部分 = `saved` ∩ 该学期可用选项，用于渲染与查询；
 * - 切换学期不修改 `saved`，只是换了可用选项，因此切回即恢复。
 */
export const useSearchStore = defineStore('search', () => {
  const persisted = loadPersisted()

  /** 关键词（跨学期共用） */
  const keyword = ref(persisted.keyword)
  /** 全局条件（唯一的一份） */
  const saved = ref<FilterSelections>(persisted.selections)
  /** 条件所属学期（用于组装查询参数） */
  const boundSemester = ref('')
  /** 当前学期可用选项（由 /api/filters 提供，进入学期时写入） */
  const available = ref<AvailableOptions>(
    availableOptionsOf({ courseTypes: [], courseNatures: [], departments: [] }),
  )
  /** 页码（条件变化时回到第 1 页） */
  const page = ref(1)
  /** 每页条数 */
  const pageSize = ref(20)

  /** 当前学期实际生效（可见）的条件 */
  const selections = computed<FilterSelections>(() => clipSelections(saved.value, available.value))

  /** 全局条件中当前学期用不到的部分（暂不生效，切到对应学期恢复） */
  const shelved = computed<string[]>(() => shelvedValues(saved.value, available.value))

  /** 更新关键词并回到第 1 页 */
  function updateKeyword(value: string): void {
    keyword.value = value
    page.value = 1
  }

  /** 更新某一项的选中值：直接改全局条件，并回到第 1 页 */
  function setSelection(key: FilterKey, values: string[]): void {
    saved.value = applyVisibleSelections(
      saved.value,
      { ...selections.value, [key]: values },
      available.value,
    )
    page.value = 1
  }

  /** 翻页（保留当前条件） */
  function setPage(value: number): void {
    page.value = value
  }

  /** 回到第 1 页 */
  function resetPage(): void {
    page.value = 1
  }

  /**
   * 进入某学期：只更换「该学期的可用选项」
   *
   * 全局条件不变，因此该学期存在的条件自动生效、不存在的自动暂不生效（PRD §3.6.5）。
   */
  function enterSemester(semester: string, options: FilterOptions): void {
    available.value = availableOptionsOf(options)
    boundSemester.value = semester
    page.value = 1
  }

  /** 当前条件对应的查询参数（只包含该学期存在的条件） */
  function toParams(): QueryClassesParams {
    return buildQueryParams(boundSemester.value, {
      keyword: keyword.value,
      selections: selections.value,
      page: page.value,
      pageSize: pageSize.value,
    })
  }

  // 条件变化即持久化：刷新或下次打开页面可恢复
  watch(
    [keyword, saved],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ keyword: keyword.value, selections: saved.value }),
        )
      } catch {
        // 写入失败仅影响「刷新后恢复」，不影响当前会话
      }
    },
    { deep: true },
  )

  return {
    keyword,
    saved,
    boundSemester,
    available,
    page,
    pageSize,
    selections,
    shelved,
    updateKeyword,
    setSelection,
    setPage,
    resetPage,
    enterSemester,
    toParams,
  }
})
