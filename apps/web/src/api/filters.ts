/**
 * 筛选项 API 客户端
 *
 * 对应后端 `GET /api/filters`（DESIGN.md §3.3）：
 * 按学期返回课程类型 / 课程性质 / 开课部门三项选项，选项随数据自动适应（PRD §6.2）。
 */

/** 筛选项响应（仅三项；培养层次固定三个，由前端维护） */
export interface FilterOptions {
  /** 课程类型选项 */
  courseTypes: string[]
  /** 课程性质选项 */
  courseNatures: string[]
  /** 开课部门选项 */
  departments: string[]
}

/** 空筛选项（初始值 / 加载失败时使用） */
export const EMPTY_FILTER_OPTIONS: FilterOptions = {
  courseTypes: [],
  courseNatures: [],
  departments: [],
}

/** 获取指定学期的筛选项（GET /api/filters） */
export async function queryFilters(semester: string): Promise<FilterOptions> {
  const url = new URL('/api/filters', window.location.origin)
  url.searchParams.set('semester', semester)

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`获取筛选项失败：HTTP ${res.status}`)
  }
  return (await res.json()) as FilterOptions
}
