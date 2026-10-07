/**
 * 格式化纯函数（零框架依赖）
 *
 * 供搜索结果各布局（CardLayout / WideTableLayout 等）共用，避免重复实现。
 * 对应 DESIGN.md §4.5「搜索结果多布局」。
 */

/** 单段上课时间（与 api/classes.ts 的 Schedule 一致） */
export interface Schedule {
  day: number;
  start: number;
  end: number;
  location: string;
}

/** 将周次数组格式化为可读文本，如 "1-16"、"1,3,5,7" */
export function formatWeeks(weeks: number[]): string {
  if (weeks.length === 0) return ''
  // 合并连续区间
  const ranges: string[] = []
  let start = weeks[0]
  let prev = weeks[0]
  for (let i = 1; i <= weeks.length; i++) {
    const cur = weeks[i]
    if (cur === prev + 1) {
      prev = cur
      continue
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = cur
    prev = cur
  }
  return ranges.join(',')
}

/** 将上课时间格式化为可读文本，如 "周一 1-2节 教101" */
export function formatSchedule(schedule: Schedule[]): string {
  const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return schedule
    .map((s) => `${dayNames[s.day]} ${s.start}-${s.end}节 ${s.location}`)
    .join('；')
}