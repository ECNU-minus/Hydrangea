import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { QueryClassesParams } from '../api/classes'
import type { FilterOptions } from '../api/filters'
import {
  availableOptionsOf,
  buildQueryParams,
  clipSelections,
  emptySelections,
  mergeSelections,
  shelvedValues,
  type AvailableOptions,
  type FilterKey,
  type FilterSelections,
} from '../core/search'

/**
 * 条件持久化（S2 引入 IndexedDB 后迁入 `settings`）
 *
 * 记住「关键词 + 每个学期各自的条件」，刷新页面后仍可恢复（PRD §3.6.5）。
 */
const STORAGE_KEY = 'hydrangea.searchConditions.v1'

interface PersistedConditions {
  keyword: string
  /** 键为学期标识；值是该学期记住的条件（可能含该学期暂时不可用的值） */
  memory: Record<string, FilterSelections>
}

function loadPersisted(): PersistedConditions {
  const empty: PersistedConditions = { keyword: '', memory: {} }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<PersistedConditions>
    return {
      keyword: typeof parsed.keyword === 'string' ? parsed.keyword : '',
      memory:
        parsed.memory && typeof parsed.memory === 'object'
          ? (parsed.memory as Record<string, FilterSelections>)
          : {},
    }
  } catch {
    // 隐私模式或数据损坏：退化为空条件，不影响页面可用
    return empty
  }
}

/**
 * 搜索与筛选条件（DESIGN §4.3）
 *
 * **按学期记忆、与学期解耦**：
 * - `memory` 记录每个学期各自的条件（含该学期暂时不可用的值，用于切回时恢复）；
 * - `selections` 是当前学期**实际生效**的条件 = 记忆 ∩ 该学期可用选项；
 * - 切换学期时，原学期中「新学期同样存在」的值顺延选中，其余值留在原学期的记忆里。
 */
export const useSearchStore = defineStore('search', () => {
  const persisted = loadPersisted()

  /** 关键词（跨学期共用） */
  const keyword = ref(persisted.keyword)
  /** 各学期记住的条件 */
  const memory = ref<Record<string, FilterSelections>>(persisted.memory)
  /** 当前学期（条件所属学期） */
  const boundSemester = ref('')
  /** 当前学期可用选项（由 /api/filters 提供，进入学期时写入） */
  const available = ref<AvailableOptions>(availableOptionsOf({
    courseTypes: [],
    courseNatures: [],
    departments: [],
  }))
  /** 页码（条件变化时回到第 1 页） */
  const page = ref(1)
  /** 每页条数 */
  const pageSize = ref(20)

  /** 当前学期记住的条件（含暂存值） */
  const remembered = computed<FilterSelections>(
    () => memory.value[boundSemester.value] ?? emptySelections(),
  )

  /** 当前学期实际生效的条件（已按可用选项裁剪） */
  const selections = computed<FilterSelections>(() =>
    clipSelections(remembered.value, available.value),
  )

  /** 该学期暂时不可用、但仍被记住的选中值（切回对应学期可恢复） */
  const shelved = computed<string[]>(() => shelvedValues(remembered.value, available.value))

  /** 写入并持久化当前学期的条件 */
  function writeMemory(semester: string, next: FilterSelections): void {
    memory.value = { ...memory.value, [semester]: next }
  }

  /** 更新关键词并回到第 1 页 */
  function updateKeyword(value: string): void {
    keyword.value = value
    page.value = 1
  }

  /** 更新某一项的选中值并回到第 1 页 */
  function setSelection(key: FilterKey, values: string[]): void {
    writeMemory(boundSemester.value, { ...remembered.value, [key]: values })
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
   * 进入某学期：载入其可用选项，合并可顺延的条件，恢复该学期记住的条件
   *
   * 返回本次切换中被暂存的值（原学期有、该学期无），供界面提示；
   * 这些值仍留在**原学期**的记忆里，切回原学期即自动恢复。
   */
  function enterSemester(semester: string, options: FilterOptions): { shelved: string[] } {
    const nextAvailable = availableOptionsOf(options)
    const previous = boundSemester.value

    if (previous === semester) {
      available.value = nextAvailable
      return { shelved: shelvedValues(remembered.value, nextAvailable) }
    }

    // 原学期实际生效的条件（按原学期选项裁剪）
    const carried = previous
      ? clipSelections(memory.value[previous] ?? emptySelections(), available.value)
      : emptySelections()

    // 本次切换新产生的暂存值（原学期可用、该学期不可用）
    const carriedDrop = shelvedValues(carried, nextAvailable)

    // 该学期此前记住的条件 + 从原学期顺延的值（只并入该学期可用的）
    const merged = mergeSelections(
      memory.value[semester] ?? emptySelections(),
      carried,
      nextAvailable,
    )

    writeMemory(semester, merged)
    available.value = nextAvailable
    boundSemester.value = semester
    page.value = 1

    return {
      shelved: [...new Set([...carriedDrop, ...shelvedValues(merged, nextAvailable)])],
    }
  }

  /** 当前条件对应的查询参数（学期取自条件所属学期） */
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
    [keyword, memory],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ keyword: keyword.value, memory: memory.value }),
        )
      } catch {
        // 写入失败仅影响「刷新后恢复」，不影响当前会话
      }
    },
    { deep: true },
  )

  return {
    keyword,
    memory,
    boundSemester,
    available,
    page,
    pageSize,
    remembered,
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
