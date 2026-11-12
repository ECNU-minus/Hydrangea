import { describe, expect, it } from 'vitest'
import { detectConflicts, type TimetableSession } from './conflict'
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

describe('detectConflicts', () => {
  it('同一天、节次重叠、周次有交集时判定冲突', () => {
    const result = detectConflicts([
      session('A001', [seg(1, 1, 2)], [1, 2, 3]),
      session('B001', [seg(1, 2, 3)], [2, 3, 4]),
    ])

    expect(result.pairs).toEqual([['A001', 'B001']])
    expect([...result.classCodes].sort()).toEqual(['A001', 'B001'])
    // 节次 2 是重叠部分，冲突周次为交集 [2,3]
    expect(result.cellWeeks.get('A001|1|2')).toEqual([2, 3])
    expect(result.cellWeeks.get('B001|1|2')).toEqual([2, 3])
    // 节次 1、3 不重叠
    expect(result.cellWeeks.has('A001|1|1')).toBe(false)
    expect(result.cellWeeks.has('B001|1|3')).toBe(false)
  })

  it('节次不重叠不冲突', () => {
    const result = detectConflicts([
      session('A001', [seg(1, 1, 2)], [1, 2]),
      session('B001', [seg(1, 3, 4)], [1, 2]),
    ])

    expect(result.pairs).toEqual([])
    expect(result.classCodes.size).toBe(0)
  })

  it('不同星期几不冲突', () => {
    const result = detectConflicts([
      session('A001', [seg(1, 1, 2)], [1]),
      session('B001', [seg(2, 1, 2)], [1]),
    ])

    expect(result.pairs).toEqual([])
  })

  it('周次无交集不冲突（单双周课程）', () => {
    const result = detectConflicts([
      session('A001', [seg(1, 1, 2)], [1, 3, 5]),
      session('B001', [seg(1, 1, 2)], [2, 4, 6]),
    ])

    expect(result.pairs).toEqual([])
    expect(result.classCodes.size).toBe(0)
  })

  it('多段上课时间里任一段重叠即冲突', () => {
    const result = detectConflicts([
      session('A001', [seg(2, 6, 7), seg(3, 3, 4)], [1, 2]),
      session('B001', [seg(3, 4, 5)], [2]),
    ])

    expect(result.pairs).toEqual([['A001', 'B001']])
    expect(result.cellWeeks.get('A001|3|4')).toEqual([2])
    expect(result.cellWeeks.get('B001|3|4')).toEqual([2])
  })

  it('同一教学班与多个课程冲突时统一标记（不区分冲突数量）', () => {
    const result = detectConflicts([
      session('A001', [seg(1, 1, 2)], [1]),
      session('B001', [seg(1, 1, 1)], [1]),
      session('C001', [seg(1, 2, 2)], [1]),
    ])

    expect(result.classCodes.has('A001')).toBe(true)
    expect(result.pairs).toEqual([
      ['A001', 'B001'],
      ['A001', 'C001'],
    ])
  })

  it('周次部分相交时只标记相交的周次', () => {
    const result = detectConflicts([
      session('A001', [seg(1, 1, 1)], [1, 2, 3, 4]),
      session('B001', [seg(1, 1, 1)], [3, 4, 5]),
    ])

    expect(result.cellWeeks.get('A001|1|1')).toEqual([3, 4])
  })

  it('空列表无冲突', () => {
    const result = detectConflicts([])

    expect(result.pairs).toEqual([])
    expect(result.cellWeeks.size).toBe(0)
  })
})
