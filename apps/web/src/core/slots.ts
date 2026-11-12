/**
 * 节次定义（PRD §3.6.3）
 *
 * 每天 14 节，每节 45 分钟；节次之间的空档不可排课。
 * 纯常量与纯函数，零框架依赖。
 */

export interface Slot {
  /** 节次序号（1–14） */
  index: number
  /** 起始时间，如 '08:00' */
  start: string
  /** 结束时间，如 '08:45' */
  end: string
}

/** 全部节次（PRD §3.6.3 表格） */
export const SLOTS: readonly Slot[] = [
  { index: 1, start: '08:00', end: '08:45' },
  { index: 2, start: '08:50', end: '09:35' },
  { index: 3, start: '09:50', end: '10:35' },
  { index: 4, start: '10:40', end: '11:25' },
  { index: 5, start: '11:30', end: '12:15' },
  { index: 6, start: '13:00', end: '13:45' },
  { index: 7, start: '13:50', end: '14:35' },
  { index: 8, start: '14:50', end: '15:35' },
  { index: 9, start: '15:40', end: '16:25' },
  { index: 10, start: '16:30', end: '17:15' },
  { index: 11, start: '18:00', end: '18:45' },
  { index: 12, start: '18:50', end: '19:35' },
  { index: 13, start: '19:40', end: '20:25' },
  { index: 14, start: '20:30', end: '21:15' },
]

/** 每天节数 */
export const SLOT_COUNT = SLOTS.length

/** 星期几文案（1=周一 … 7=周日） */
export const DAY_NAMES: Readonly<Record<number, string>> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
}

/** 课表展示的星期（周一至周日，PRD §3.3.1） */
export const DAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7]

/** 取某节次定义 */
export function slotAt(index: number): Slot | undefined {
  return SLOTS.find((slot) => slot.index === index)
}

/** 节次时间文案，如 '08:00–08:45'；未知节次返回空串 */
export function slotTimeLabel(index: number): string {
  const slot = slotAt(index)
  return slot ? `${slot.start}–${slot.end}` : ''
}
