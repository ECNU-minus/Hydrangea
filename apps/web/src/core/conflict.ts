/**
 * 冲突检测（PRD §3.6.4、DESIGN §7.1）
 *
 * 判定规则：两个教学班在**同一星期几**、**节次区间有交集**、且**周次有交集**时冲突。
 * 冲突允许排入，不阻止；多冲突统一按冲突样式表现。
 * 纯函数，零框架依赖。
 */

import type { Schedule } from './format'
import { intersectWeeks } from './weeks'

/** 参与课表与冲突判定的教学班 */
export interface TimetableSession {
  classCode: string
  courseName: string
  teacher: string
  /** 上课时间段（每段含星期与节次区间） */
  schedule: Schedule[]
  /** 开课周次 */
  weeks: number[]
}

/** 冲突检测结果 */
export interface ConflictResult {
  /** 存在冲突的教学班代码 */
  classCodes: Set<string>
  /** `cellKey(classCode, day, slot)` → 该格的冲突周次（升序） */
  cellWeeks: Map<string, number[]>
  /** 冲突对（去重、稳定顺序） */
  pairs: [string, string][]
}

/** 冲突格子的键：教学班 + 星期 + 节次 */
export function cellKey(classCode: string, day: number, slot: number): string {
  return `${classCode}|${day}|${slot}`
}

/** 两段上课时间是否在节次上重叠（同一天 + 区间交集） */
export function sectionsOverlap(a: Schedule, b: Schedule): boolean {
  return a.day === b.day && a.start <= b.end && b.start <= a.end
}

/**
 * 检测已排教学班之间的冲突
 *
 * 学期范围由调用方保证：只传入当前学期的已排教学班（PRD §3.6.4）。
 */
export function detectConflicts(sessions: readonly TimetableSession[]): ConflictResult {
  const classCodes = new Set<string>()
  const cellWeeks = new Map<string, Set<number>>()
  const pairs: [string, string][] = []

  const addCell = (classCode: string, day: number, slot: number, weeks: number[]) => {
    const key = cellKey(classCode, day, slot)
    const existing = cellWeeks.get(key) ?? new Set<number>()
    for (const week of weeks) existing.add(week)
    cellWeeks.set(key, existing)
  }

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i]
      const b = sessions[j]
      let conflicted = false

      for (const sa of a.schedule) {
        for (const sb of b.schedule) {
          if (!sectionsOverlap(sa, sb)) continue

          const weeks = intersectWeeks(a.weeks, b.weeks)
          if (weeks.length === 0) continue

          conflicted = true
          const from = Math.max(sa.start, sb.start)
          const to = Math.min(sa.end, sb.end)
          for (let slot = from; slot <= to; slot++) {
            addCell(a.classCode, sa.day, slot, weeks)
            addCell(b.classCode, sb.day, slot, weeks)
          }
        }
      }

      if (conflicted) {
        classCodes.add(a.classCode)
        classCodes.add(b.classCode)
        pairs.push([a.classCode, b.classCode])
      }
    }
  }

  const frozen = new Map<string, number[]>()
  for (const [key, weeks] of cellWeeks) {
    frozen.set(key, [...weeks].sort((x, y) => x - y))
  }

  return { classCodes, cellWeeks: frozen, pairs }
}

/** 某教学班在某个格子上是否冲突 */
export function isConflictedCell(
  conflicts: ConflictResult,
  classCode: string,
  day: number,
  slot: number,
): boolean {
  return conflicts.cellWeeks.has(cellKey(classCode, day, slot))
}

/** 某教学班在某个格子的冲突周次 */
export function conflictWeeksOf(
  conflicts: ConflictResult,
  classCode: string,
  day: number,
  slot: number,
): number[] {
  return conflicts.cellWeeks.get(cellKey(classCode, day, slot)) ?? []
}
