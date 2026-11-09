/**
 * 搜索与筛选条件（纯函数，零框架依赖）
 *
 * 关键约定：**全局只保存一份条件**，与学期解耦。
 * 切换学期时，按该学期是否存在某个条件决定它是否进入查询参数：
 * 不存在的条件**保留在全局条件里**（暂不生效），切回包含它的学期会自动生效（PRD §3.6.5）。
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
 * 裁剪出「该学期当前可用」的选中值
 *
 * 只影响**显示与查询**，不丢数据：不可用的选中值由 `shelvedValues` 单独取出暂存，
 * 以便切回有该选项的学期时恢复。不修改入参。
 */
export function clipSelections(
  selections: FilterSelections,
  available: AvailableOptions,
): FilterSelections {
  const next = emptySelections()

  for (const key of FILTER_KEYS) {
    for (const value of selections[key]) {
      if (available[key].includes(value)) next[key].push(value)
    }
  }

  return next
}

/** 取出「该学期不可用」的选中值（需要暂存，等切回有该选项的学期再恢复） */
export function shelvedValues(
  selections: FilterSelections,
  available: AvailableOptions,
): string[] {
  const shelved: string[] = []

  for (const key of FILTER_KEYS) {
    for (const value of selections[key]) {
      if (!available[key].includes(value)) shelved.push(value)
    }
  }

  return shelved
}

/**
 * 用「界面上的选中值」更新全局条件
 *
 * 全局只保存一份条件：勾选/取消勾选直接改动这一份。
 * 当前学期**不可用**的值原样保留（它们只在包含该选项的学期生效），
 * 当前学期可用的值以 `visible` 为准（含取消）。
 */
export function applyVisibleSelections(
  saved: FilterSelections,
  visible: FilterSelections,
  available: AvailableOptions,
): FilterSelections {
  const next = emptySelections()

  for (const key of FILTER_KEYS) {
    // 该项在当前学期用不到的选中值：保留，等切到包含该选项的学期再生效
    const kept = saved[key].filter((value) => !available[key].includes(value))
    next[key] = [...new Set([...kept, ...visible[key]])]
  }

  return next
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
