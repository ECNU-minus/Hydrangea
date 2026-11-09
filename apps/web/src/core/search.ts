/**
 * 搜索与筛选条件（纯函数，零框架依赖）
 *
 * 关键约定：**搜索/筛选条件与学期解耦**——条件本身不随学期变化，
 * 切换学期时只把「新学期不存在」的选中值裁掉，其余保持选中（PRD §3.6.5）。
 */

import type { QueryClassesParams } from '../api/classes'
import type { FilterOptions } from '../api/filters'

/** 培养层次选项固定为三个（PRD §6.1），不来自 /api/filters */
export const LEVEL_OPTIONS = ['本科生', '研究生', '辅修、微专业']

/** 四项筛选的键（与 QueryClassesParams 的筛选字段同名） */
export const FILTER_KEYS = ['courseType', 'courseNature', 'department', 'level'] as const

/** 筛选键 */
export type FilterKey = (typeof FILTER_KEYS)[number]

/** 四项筛选的选中值（空数组 = 该项不限） */
export type FilterSelections = Record<FilterKey, string[]>

/** 某一学期实际可选的选项集合（用于裁剪选中值） */
export type AvailableOptions = Record<FilterKey, string[]>

/** 空选择 */
export function emptySelections(): FilterSelections {
  return { courseType: [], courseNature: [], department: [], level: [] }
}

/** 由接口返回的三项选项 + 固定的培养层次，得到该学期的完整可选集合 */
export function availableOptionsOf(options: FilterOptions): AvailableOptions {
  return {
    courseType: options.courseTypes,
    courseNature: options.courseNatures,
    department: options.departments,
    level: LEVEL_OPTIONS,
  }
}

/**
 * 按新学期的可选集合裁剪选中值
 *
 * - 仍存在的选中值**保留**（切换学期后相同条件依旧选中）；
 * - 新学期不存在的选中值被移除，并收集到 `dropped` 供界面提示；
 * - 不修改入参。
 */
export function pruneSelections(
  selections: FilterSelections,
  available: AvailableOptions,
): { selections: FilterSelections; dropped: string[] } {
  const next = emptySelections()
  const dropped: string[] = []

  for (const key of FILTER_KEYS) {
    for (const value of selections[key]) {
      if (available[key].includes(value)) next[key].push(value)
      else dropped.push(value)
    }
  }

  return { selections: next, dropped }
}

/** 查询条件（不含学期；学期在调用时单独传入） */
export interface QueryConditions {
  /** 关键词（未 trim，组装时处理） */
  keyword: string
  /** 四项筛选的选中值 */
  selections: FilterSelections
  /** 页码 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/**
 * 组装后端查询参数
 *
 * 空选择 / 空关键词转为 `undefined`，由 API 客户端省略该参数（DESIGN §3.2）。
 * 返回的数组均为副本，调用方后续修改不会影响条件状态。
 */
export function buildQueryParams(
  semester: string,
  conditions: QueryConditions,
): QueryClassesParams {
  const pick = (values: string[]) => (values.length ? [...values] : undefined)
  const keyword = conditions.keyword.trim()

  return {
    semester,
    keyword: keyword || undefined,
    courseType: pick(conditions.selections.courseType),
    courseNature: pick(conditions.selections.courseNature),
    department: pick(conditions.selections.department),
    level: pick(conditions.selections.level),
    page: conditions.page,
    pageSize: conditions.pageSize,
  }
}
