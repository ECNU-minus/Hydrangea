/**
 * 课表生成（PRD §3.3、DESIGN §7.2）
 *
 * 根据已排教学班生成「周一至周日 × 14 节次」的网格；
 * 节次区间用 rowspan 表现，单元格内用圆点表示周次（有课填充、无课描线、冲突方形）。
 * 纯函数，零框架依赖。
 */

import { conflictWeeksOf, type ConflictResult, type TimetableSession } from './conflict'
import { DAYS, SLOTS } from './slots'
import { allWeeksOf } from './weeks'

/** 课表中的一个课程块（对应一段上课时间） */
export interface TimetableBlock {
  classCode: string
  courseName: string
  teacher: string
  location: string
  /** 起始节次 */
  start: number
  /** 结束节次 */
  end: number
  /** 跨越的节数（供 rowspan 使用） */
  span: number
  /** 该段覆盖的周次 */
  weeks: number[]
  /** 与其它已排课程冲突的周次 */
  conflictWeeks: number[]
  /** 是否与其它已排课程冲突（PRD §3.3.2：文本标红） */
  conflicted: boolean
}

/** 课表网格 */
export interface TimetableGrid {
  days: readonly number[]
  slots: typeof SLOTS
  /** `day → slot → 从该节次开始的课程块`（覆盖的后续节次由 rowspan 跨过） */
  starts: Map<number, Map<number, TimetableBlock[]>>
  /** 被 rowspan 覆盖、不单独渲染的格子：`day|slot` */
  covered: Set<string>
  /** 课表涉及的周次（按数据推导，升序，PRD §3.6.1） */
  weeks: number[]
}

/** 圆点状态：有课填充 / 无课描线 / 冲突方形 */
export type WeekDotState = 'on' | 'off' | 'conflict'

/** 取某格从该节次开始的课程块 */
export function blocksAt(
  grid: TimetableGrid,
  day: number,
  slot: number,
): TimetableBlock[] {
  return grid.starts.get(day)?.get(slot) ?? []
}

/** 该格子是否被上方的 rowspan 覆盖（不渲染） */
export function isCovered(grid: TimetableGrid, day: number, slot: number): boolean {
  return grid.covered.has(`${day}|${slot}`)
}

/**
 * 生成课表网格
 *
 * @param sessions 已排教学班（调用方保证只含当前学期）
 * @param conflicts 冲突检测结果
 * @param week 只看某一周时传入；不传则展示全部
 */
export function buildTimetable(
  sessions: readonly TimetableSession[],
  conflicts: ConflictResult,
  week?: number,
): TimetableGrid {
  const starts = new Map<number, Map<number, TimetableBlock[]>>()
  const covered = new Set<string>()

  for (const session of sessions) {
    if (week !== undefined && !session.weeks.includes(week)) continue

    for (const segment of session.schedule) {
      const from = Math.min(segment.start, segment.end)
      const to = Math.max(segment.start, segment.end)
      const conflictWeeks = new Set<number>()
      for (let slot = from; slot <= to; slot++) {
        for (const w of conflictWeeksOf(conflicts, session.classCode, segment.day, slot)) {
          conflictWeeks.add(w)
        }
      }

      const block: TimetableBlock = {
        classCode: session.classCode,
        courseName: session.courseName,
        teacher: session.teacher,
        location: segment.location,
        start: from,
        end: to,
        span: to - from + 1,
        weeks: [...session.weeks].sort((a, b) => a - b),
        conflictWeeks: [...conflictWeeks].sort((a, b) => a - b),
        conflicted: conflicts.classCodes.has(session.classCode),
      }

      const dayMap = starts.get(segment.day) ?? new Map<number, TimetableBlock[]>()
      const cellBlocks = dayMap.get(from) ?? []
      cellBlocks.push(block)
      dayMap.set(from, cellBlocks)
      starts.set(segment.day, dayMap)

      for (let slot = from + 1; slot <= to; slot++) {
        covered.add(`${segment.day}|${slot}`)
      }
    }
  }

  return {
    days: DAYS,
    slots: SLOTS,
    starts,
    covered,
    weeks: allWeeksOf(sessions.map((session) => session.weeks)),
  }
}

/**
 * 生成某课程块的周次圆点状态
 *
 * 有课填充、无课描线、冲突方形（PRD §3.3.3/§3.3.2）。
 */
export function weekDots(
  block: Pick<TimetableBlock, 'weeks' | 'conflictWeeks'>,
  allWeeks: readonly number[],
): { week: number; state: WeekDotState }[] {
  return allWeeks.map((week) => {
    if (block.conflictWeeks.includes(week)) return { week, state: 'conflict' }
    if (block.weeks.includes(week)) return { week, state: 'on' }

    return { week, state: 'off' }
  })
}
