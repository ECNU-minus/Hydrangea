import { describe, expect, it } from 'vitest'
import { detectConflicts, type TimetableSession } from './conflict'
import { SLOTS, SLOT_COUNT, slotTimeLabel, DAY_NAMES, DAYS } from './slots'
import { blocksAt, buildTimetable, isCovered, weekDots } from './timetable'
import type { Schedule } from './format'

const seg = (day: number, start: number, end: number, location = '教101'): Schedule => ({
  day,
  start,
  end,
  location,
})

const session = (
  classCode: string,
  schedule: Schedule[],
  weeks: number[],
): TimetableSession => ({
  classCode,
  courseName: `课程 ${classCode}`,
  teacher: '张老师',
  schedule,
  weeks,
})

describe('slots', () => {
  it('共 14 节，首末节时间与 PRD 一致', () => {
    expect(SLOT_COUNT).toBe(14)
    expect(SLOTS[0]).toEqual({ index: 1, start: '08:00', end: '08:45' })
    expect(SLOTS[13]).toEqual({ index: 14, start: '20:30', end: '21:15' })
  })

  it('节次时间文案', () => {
    expect(slotTimeLabel(1)).toBe('08:00–08:45')
    expect(slotTimeLabel(99)).toBe('')
  })

  it('星期为周一至周日', () => {
    expect(DAYS).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(DAY_NAMES[1]).toBe('周一')
    expect(DAY_NAMES[7]).toBe('周日')
  })
})

describe('buildTimetable', () => {
  const sessions = [session('A001', [seg(1, 1, 2, '教101')], [1, 2, 3])]
  const conflicts = detectConflicts(sessions)

  it('课程块放在起始节次，后续节次被 rowspan 覆盖', () => {
    const grid = buildTimetable(sessions, conflicts)

    expect(blocksAt(grid, 1, 1)).toHaveLength(1)
    expect(blocksAt(grid, 1, 1)[0].span).toBe(2)
    expect(isCovered(grid, 1, 2)).toBe(true)
    expect(blocksAt(grid, 1, 2)).toHaveLength(0)
  })

  it('周次按数据推导，不硬编码学期周数', () => {
    expect(buildTimetable(sessions, conflicts).weeks).toEqual([1, 2, 3])
    expect(
      buildTimetable([session('B001', [seg(1, 1, 1)], [5, 9])], detectConflicts([])).weeks,
    ).toEqual([5, 9])
  })

  it('按周查看时只保留该周有课的课程块', () => {
    const grid = buildTimetable(sessions, conflicts, 2)
    expect(blocksAt(grid, 1, 1)).toHaveLength(1)

    const other = buildTimetable(sessions, conflicts, 5)
    expect(blocksAt(other, 1, 1)).toHaveLength(0)
    expect(isCovered(other, 1, 2)).toBe(false)
  })

  it('多段上课时间分别落到对应日子', () => {
    const grid = buildTimetable(
      [session('A001', [seg(2, 6, 7), seg(4, 11, 12)], [1])],
      detectConflicts([]),
    )

    expect(blocksAt(grid, 2, 6)).toHaveLength(1)
    expect(blocksAt(grid, 4, 11)).toHaveLength(1)
  })

  it('冲突块的 conflicted 与 conflictWeeks 被标记', () => {
    const clash = [session('A001', [seg(1, 1, 2)], [1, 2]), session('B001', [seg(1, 2, 3)], [2])]
    const grid = buildTimetable(clash, detectConflicts(clash))

    const block = blocksAt(grid, 1, 1).find((b) => b.classCode === 'A001')
    expect(block?.conflicted).toBe(true)
    expect(block?.conflictWeeks).toEqual([2])
  })
})

describe('weekDots', () => {
  const allWeeks = [1, 2, 3]

  it('有课填充、无课描线、冲突方形', () => {
    expect(weekDots({ weeks: [1, 3], conflictWeeks: [3] }, allWeeks)).toEqual([
      { week: 1, state: 'on' },
      { week: 2, state: 'off' },
      { week: 3, state: 'conflict' },
    ])
  })
})
