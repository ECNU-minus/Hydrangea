import { describe, expect, it } from 'vitest'
import {
  LEVEL_OPTIONS,
  availableOptionsOf,
  buildQueryParams,
  clipSelections,
  emptySelections,
  mergeSelections,
  shelvedValues,
  type AvailableOptions,
  type FilterSelections,
} from './search'

/** 构造一个学期的可选集合（培养层次固定） */
const available = (departments: string[], courseTypes = ['通识', '专业']): AvailableOptions => ({
  courseType: courseTypes,
  courseNature: ['必修', '选修'],
  department: departments,
  level: LEVEL_OPTIONS,
})

/** 一个「在 2026-2027-1 勾选了传播学院 + 化学与分子工程学院」的条件 */
const selectionsA: FilterSelections = {
  courseType: ['通识'],
  courseNature: ['必修', '选修'],
  department: ['传播学院', '化学与分子工程学院'],
  level: ['本科生'],
}

describe('emptySelections', () => {
  it('四项均为空数组', () => {
    expect(emptySelections()).toEqual({
      courseType: [],
      courseNature: [],
      department: [],
      level: [],
    })
  })
})

describe('availableOptionsOf', () => {
  it('合并接口返回的三项选项与固定的培养层次', () => {
    expect(
      availableOptionsOf({
        courseTypes: ['通识'],
        courseNatures: ['必修'],
        departments: ['传播学院'],
      }),
    ).toEqual({
      courseType: ['通识'],
      courseNature: ['必修'],
      department: ['传播学院'],
      level: LEVEL_OPTIONS,
    })
  })
})

describe('clipSelections', () => {
  it('只保留该学期可用的选中值', () => {
    const clipped = clipSelections(selectionsA, available(['传播学院']))

    expect(clipped.department).toEqual(['传播学院'])
    expect(clipped.courseType).toEqual(['通识'])
  })

  it('培养层次固定，永远保留', () => {
    const clipped = clipSelections({ ...emptySelections(), level: ['本科生', '研究生'] }, available([]))

    expect(clipped.level).toEqual(['本科生', '研究生'])
  })

  it('不修改入参', () => {
    clipSelections(selectionsA, available(['传播学院']))
    expect(selectionsA.department).toEqual(['传播学院', '化学与分子工程学院'])
  })
})

describe('shelvedValues', () => {
  it('返回该学期不可用的选中值（用于暂存提示）', () => {
    expect(shelvedValues(selectionsA, available(['传播学院']))).toEqual(['化学与分子工程学院'])
  })

  it('全部可用时为空', () => {
    expect(
      shelvedValues(selectionsA, available(['传播学院', '化学与分子工程学院'])),
    ).toEqual([])
  })
})

describe('mergeSelections', () => {
  it('base 全量保留（含该学期暂存值），add 只并入可用值', () => {
    const base: FilterSelections = {
      ...emptySelections(),
      department: ['历史学系'],
    }
    const add: FilterSelections = {
      ...emptySelections(),
      department: ['传播学院', '化学与分子工程学院'],
    }

    const merged = mergeSelections(base, add, available(['传播学院', '历史学系']))

    // 历史学系：新学期此前记住的；传播学院：从原学期顺延且可用；化学：新学期不可用，不顺延
    expect(merged.department).toEqual(['历史学系', '传播学院'])
  })

  it('同一值不重复', () => {
    const merged = mergeSelections(
      { ...emptySelections(), department: ['传播学院'] },
      { ...emptySelections(), department: ['传播学院'] },
      available(['传播学院']),
    )

    expect(merged.department).toEqual(['传播学院'])
  })
})

describe('buildQueryParams', () => {
  it('空条件转为 undefined（由客户端省略参数）', () => {
    const params = buildQueryParams('2026-2027-1', {
      keyword: '   ',
      selections: emptySelections(),
      page: 1,
      pageSize: 20,
    })

    expect(params).toEqual({
      semester: '2026-2027-1',
      keyword: undefined,
      courseType: undefined,
      courseNature: undefined,
      department: undefined,
      level: undefined,
      page: 1,
      pageSize: 20,
    })
  })

  it('关键词去空白后保留，筛选项原样传递', () => {
    const params = buildQueryParams('2025-2026-1', {
      keyword: '  程序设计  ',
      selections: {
        courseType: ['通识'],
        courseNature: [],
        department: ['传播学院', '数学学院'],
        level: ['本科生'],
      },
      page: 2,
      pageSize: 20,
    })

    expect(params.keyword).toBe('程序设计')
    expect(params.courseType).toEqual(['通识'])
    expect(params.courseNature).toBeUndefined()
    expect(params.department).toEqual(['传播学院', '数学学院'])
    expect(params.level).toEqual(['本科生'])
    expect(params.page).toBe(2)
  })

  it('返回的数组是副本，改动不影响条件状态', () => {
    const selections: FilterSelections = {
      ...emptySelections(),
      department: ['传播学院'],
    }
    const params = buildQueryParams('2026-2027-1', {
      keyword: '',
      selections,
      page: 1,
      pageSize: 20,
    })

    params.department?.push('数学学院')
    expect(selections.department).toEqual(['传播学院'])
  })
})

describe('跨学期恢复（A → B → A）', () => {
  // 2026-2027-1 有「化学与分子工程学院」，2025-2026-1 没有
  const availA = available(['传播学院', '化学与分子工程学院', '数学学院'])
  const availB = available(['传播学院', '数学学院'])

  it('切到无该选项的学期后暂存，切回时恢复', () => {
    // A 学期：用户勾选传播学院 + 化学与分子工程学院
    const memoryA = selectionsA

    // 切到 B：原学期可用条件顺延，不可用的值暂存（留在 A 的记忆里）
    const carried = clipSelections(memoryA, availA)
    const memoryB = mergeSelections(emptySelections(), carried, availB)

    expect(clipSelections(memoryB, availB).department).toEqual(['传播学院'])
    // 本次切换被暂存的值（B 学期没有该选项）
    expect(shelvedValues(carried, availB)).toEqual(['化学与分子工程学院'])
    // 暂存值不会污染 B 自身的记忆
    expect(shelvedValues(memoryB, availB)).toEqual([])

    // 切回 A：B 的可用条件顺延 + A 原有记忆恢复
    const carriedBack = clipSelections(memoryB, availB)
    const restoredA = mergeSelections(memoryA, carriedBack, availA)

    expect(clipSelections(restoredA, availA).department).toEqual([
      '传播学院',
      '化学与分子工程学院',
    ])
    expect(shelvedValues(restoredA, availA)).toEqual([])
  })

  it('在原学期取消选中后，不会再被恢复', () => {
    // 用户在 B 学期取消了传播学院
    const memoryB: FilterSelections = { ...emptySelections() }
    const restored = mergeSelections(memoryB, emptySelections(), availB)

    expect(clipSelections(restored, availB).department).toEqual([])
  })
})
