import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { QueryClassesParams } from '../api/classes'
import type { FilterOptions } from '../api/filters'
import {
  availableOptionsOf,
  buildQueryParams,
  emptySelections,
  pruneSelections,
  type FilterKey,
  type FilterSelections,
} from '../core/search'

/**
 * 搜索与筛选条件（DESIGN §4.3）
 *
 * **与学期解耦**：本 store 不含学期，学期在组装查询参数时由调用方传入。
 * 切换学期时调用 `syncOptions` 裁剪掉新学期不存在的选中值，其余保持选中。
 */
export const useSearchStore = defineStore('search', () => {
  /** 关键词 */
  const keyword = ref('')
  /** 四项筛选的选中值（空数组 = 该项不限） */
  const selections = ref<FilterSelections>(emptySelections())
  /** 页码（条件变化时回到第 1 页） */
  const page = ref(1)
  /** 每页条数 */
  const pageSize = ref(20)

  /** 更新关键词并回到第 1 页 */
  function updateKeyword(value: string): void {
    keyword.value = value
    page.value = 1
  }

  /** 更新某一项的选中值并回到第 1 页 */
  function setSelection(key: FilterKey, values: string[]): void {
    selections.value = { ...selections.value, [key]: values }
    page.value = 1
  }

  /** 翻页（保留当前条件） */
  function setPage(value: number): void {
    page.value = value
  }

  /** 回到第 1 页（切换学期时使用） */
  function resetPage(): void {
    page.value = 1
  }

  /**
   * 切换到新学期的筛选项后同步条件
   *
   * 返回被移除的选中值（供界面提示）；培养层次固定，始终保留。
   */
  function syncOptions(options: FilterOptions): string[] {
    const { selections: pruned, dropped } = pruneSelections(
      selections.value,
      availableOptionsOf(options),
    )
    selections.value = pruned
    return dropped
  }

  /** 当前条件对应的查询参数（学期由调用方传入） */
  function toParams(semester: string): QueryClassesParams {
    return buildQueryParams(semester, {
      keyword: keyword.value,
      selections: selections.value,
      page: page.value,
      pageSize: pageSize.value,
    })
  }

  return {
    keyword,
    selections,
    page,
    pageSize,
    updateKeyword,
    setSelection,
    setPage,
    resetPage,
    syncOptions,
    toParams,
  }
})
