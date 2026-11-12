import { describe, expect, it } from 'vitest'
import { INTENT_LIMIT, intentCodes, isIntent, toggleIntent } from './marks'
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
