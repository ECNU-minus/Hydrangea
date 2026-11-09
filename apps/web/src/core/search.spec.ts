import { describe, expect, it } from 'vitest'
import {
  LEVEL_OPTIONS,
  availableOptionsOf,
  buildQueryParams,
  emptySelections,
  pruneSelections,
  type FilterSelections,
} from './search'

/** 构造一个学期的可选集合（培养层次固定） */
const available = (departments: string[], courseTypes = ['通识', '专业']) => ({
  courseType: courseTypes,
  courseNature: ['必修', '选修'],
  department: departments,
  level: LEVEL_OPTIONS,
})

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

describe('pruneSelections', () => {
  const selections: FilterSelections = {
    courseType: ['通识'],
    courseNature: ['必修', '选修'],
    department: ['传播学院', '历史学系'],
    level: ['本科生'],
  }

  it('保留新学期仍存在的选中值', () => {
    const result = pruneSelections(selections, available(['传播学院', '历史学系']))

    expect(result.selections.department).toEqual(['传播学院', '历史学系'])
    expect(result.selections.courseType).toEqual(['通识'])
    expect(result.dropped).toEqual([])
  })

  it('移除新学期不存在的选中值并记录', () => {
    const result = pruneSelections(selections, available(['传播学院']))

    expect(result.selections.department).toEqual(['传播学院'])
    expect(result.dropped).toEqual(['历史学系'])
  })

  it('培养层次固定，永远保留', () => {
    const result = pruneSelections(
      { ...emptySelections(), level: ['本科生', '研究生'] },
      available(['传播学院']),
    )

    expect(result.selections.level).toEqual(['本科生', '研究生'])
  })

  it('不修改入参', () => {
    pruneSelections(selections, available(['传播学院']))
    expect(selections.department).toEqual(['传播学院', '历史学系'])
  })

  it('全部不存在时清空选中值', () => {
    const result = pruneSelections(selections, {
      courseType: [],
      courseNature: [],
      department: [],
      level: LEVEL_OPTIONS,
    })

    expect(result.selections).toEqual({
      courseType: [],
      courseNature: [],
      department: [],
      level: ['本科生'],
    })
    expect(result.dropped.sort()).toEqual(
      ['传播学院', '历史学系', '必修', '选修', '通识'].sort(),
    )
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
