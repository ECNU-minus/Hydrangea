import { describe, expect, it } from 'vitest'
import { allWeeksOf, hasWeekOverlap, intersectWeeks } from './weeks'

describe('weeks', () => {
  it('判断两组周次是否相交', () => {
    expect(hasWeekOverlap([1, 3], [3, 4])).toBe(true)
    expect(hasWeekOverlap([1, 3], [2, 4])).toBe(false)
    expect(hasWeekOverlap([], [1])).toBe(false)
  })

  it('求交集并升序去重', () => {
    expect(intersectWeeks([5, 1, 3], [3, 5, 7])).toEqual([3, 5])
    expect(intersectWeeks([1, 2], [3, 4])).toEqual([])
  })

  it('求并集并升序去重（周数不固定，按数据推导）', () => {
    expect(allWeeksOf([[3, 1], [2, 3], []])).toEqual([1, 2, 3])
    expect(allWeeksOf([])).toEqual([])
  })

  it('不修改入参', () => {
    const a = [3, 1]
    const b = [1, 2]
    intersectWeeks(a, b)
    allWeeksOf([a, b])

    expect(a).toEqual([3, 1])
  })
})
