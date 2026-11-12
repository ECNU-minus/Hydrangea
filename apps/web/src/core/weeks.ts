/**
 * 周次处理（PRD §3.6.1/§3.6.2）
 *
 * 学期周数不固定、课程周次可能不连续，故周次一律按数据推导，不硬编码。
 * 纯函数，零框架依赖。
 */

/** 两组周次是否相交 */
export function hasWeekOverlap(a: readonly number[], b: readonly number[]): boolean {
  return a.some((week) => b.includes(week))
}

/** 两组周次的交集（升序） */
export function intersectWeeks(a: readonly number[], b: readonly number[]): number[] {
  return [...new Set(a.filter((week) => b.includes(week)))].sort((x, y) => x - y)
}

/** 多组周次的并集（升序） */
export function allWeeksOf(weeksList: readonly (readonly number[])[]): number[] {
  const merged = new Set<number>()
  for (const weeks of weeksList) {
    for (const week of weeks) merged.add(week)
  }

  return [...merged].sort((a, b) => a - b)
}
