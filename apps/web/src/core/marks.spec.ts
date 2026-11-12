import { describe, expect, it } from 'vitest'
import {
  INTENT_LIMIT,
  intentCodes,
  isIntent,
  multiClassCourseCodes,
  sortByAddedAt,
  splitPlaceholders,
  toggleIntent,
  type IntentEntry,
} from './marks'
import type { IntentMark } from '../storage/db'

const SEMESTER = '2026-2027-1'

/** 构造一条意向标记 */
const mark = (classCode: string, addedAt = 1): IntentMark => ({
  semester: SEMESTER,
  classCode,
  intent: true,
  scheduled: false,
  addedAt,
})

/** 构造 n 条意向标记 */
const marks = (n: number): IntentMark[] =>
  Array.from({ length: n }, (_, i) => mark(`C${String(i).padStart(3, '0')}`, i))

describe('isIntent / intentCodes', () => {
  it('识别已打标的教学班', () => {
    const list = [mark('A001'), mark('A002')]

    expect(isIntent(list, 'A001')).toBe(true)
    expect(isIntent(list, 'A003')).toBe(false)
  })

  it('列出全部教学班代码', () => {
    expect(intentCodes([mark('A001'), mark('A002')])).toEqual(['A001', 'A002'])
  })
})

describe('toggleIntent（添加）', () => {
  it('未打标时追加一条意向标记，并记录打标时间', () => {
    const { next, blocked } = toggleIntent([], SEMESTER, 'A001', 1700000000000)

    expect(blocked).toBe(false)
    expect(next).toEqual([
      {
        semester: SEMESTER,
        classCode: 'A001',
        intent: true,
        scheduled: false,
        addedAt: 1700000000000,
      },
    ])
  })

  it('保留已存在的其它标记与顺序', () => {
    const existing = [mark('A002', 2), mark('A001', 1)]
    const { next } = toggleIntent(existing, SEMESTER, 'A003', 3)

    expect(intentCodes(next)).toEqual(['A002', 'A001', 'A003'])
  })

  it('不修改入参', () => {
    const existing = [mark('A001', 1)]
    toggleIntent(existing, SEMESTER, 'A002', 2)

    expect(intentCodes(existing)).toEqual(['A001'])
  })
})

describe('toggleIntent（取消）', () => {
  it('已打标时移除该条', () => {
    const existing = [mark('A001', 1), mark('A002', 2)]
    const { next, blocked } = toggleIntent(existing, SEMESTER, 'A001', 3)

    expect(blocked).toBe(false)
    expect(intentCodes(next)).toEqual(['A002'])
  })

  it('取消后仍可再次添加（回到列表末尾）', () => {
    const existing = [mark('A001', 1), mark('A002', 2)]
    const removed = toggleIntent(existing, SEMESTER, 'A001', 3).next
    const reAdded = toggleIntent(removed, SEMESTER, 'A001', 4).next

    expect(intentCodes(reAdded)).toEqual(['A002', 'A001'])
    expect(reAdded.at(-1)?.addedAt).toBe(4)
  })
})

describe('toggleIntent（上限）', () => {
  it('达到上限后再添加被阻止，列表不变', () => {
    const existing = marks(INTENT_LIMIT)
    const { next, blocked } = toggleIntent(existing, SEMESTER, 'NEW', 999)

    expect(blocked).toBe(true)
    expect(next).toHaveLength(INTENT_LIMIT)
    expect(isIntent(next, 'NEW')).toBe(false)
  })

  it('达到上限时仍可取消已有标记', () => {
    const existing = marks(INTENT_LIMIT)
    const { next, blocked } = toggleIntent(existing, SEMESTER, 'C000', 999)

    expect(blocked).toBe(false)
    expect(next).toHaveLength(INTENT_LIMIT - 1)
  })
})

describe('sortByAddedAt', () => {
  it('按打标时间升序排列', () => {
    const list = [mark('B', 30), mark('A', 10), mark('C', 20)]

    expect(sortByAddedAt(list).map((m) => m.classCode)).toEqual(['A', 'C', 'B'])
  })

  it('不修改入参', () => {
    const list = [mark('B', 30), mark('A', 10)]
    sortByAddedAt(list)

    expect(list.map((m) => m.classCode)).toEqual(['B', 'A'])
  })
})

describe('splitPlaceholders', () => {
  const entry = (
    classCode: string,
    course: IntentEntry['course'],
    addedAt = 1,
  ): IntentEntry => ({ classCode, addedAt, course })

  it('detail 为 null 的条目归入占位条目', () => {
    const { normal, placeholders } = splitPlaceholders([
      entry('A001', { courseCode: 'CS101', courseName: '数据结构' }),
      entry('GONE01', null),
    ])

    expect(normal.map((e) => e.classCode)).toEqual(['A001'])
    expect(placeholders.map((e) => e.classCode)).toEqual(['GONE01'])
  })

  it('尚未回查（undefined）不算占位，避免加载时闪烁', () => {
    const { normal, placeholders } = splitPlaceholders([entry('A001', undefined)])

    expect(normal).toHaveLength(1)
    expect(placeholders).toHaveLength(0)
  })
})

describe('multiClassCourseCodes', () => {
  const entry = (classCode: string, courseCode: string): IntentEntry => ({
    classCode,
    addedAt: 1,
    course: { courseCode, courseName: `课程 ${courseCode}` },
  })

  it('同一课程标了两个教学班时返回其课程代码', () => {
    expect(
      multiClassCourseCodes([entry('A001', 'CS101'), entry('A002', 'CS101'), entry('B001', 'MA201')]),
    ).toEqual(['CS101'])
  })

  it('每个课程只有一个教学班时为空', () => {
    expect(multiClassCourseCodes([entry('A001', 'CS101'), entry('B001', 'MA201')])).toEqual([])
  })

  it('忽略尚未解析或已不存在的条目', () => {
    expect(
      multiClassCourseCodes([
        { classCode: 'A001', addedAt: 1 },
        { classCode: 'A002', addedAt: 2, course: null },
      ]),
    ).toEqual([])
  })
})
