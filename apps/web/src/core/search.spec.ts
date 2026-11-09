import { describe, expect, it } from 'vitest'
import {
  LEVEL_OPTIONS,
  applyVisibleSelections,
  availableOptionsOf,
  buildQueryParams,
  clipSelections,
  emptySelections,
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

/** 全局条件：勾选了传播学院 + 化学与分子工程学院 */
const savedAll: FilterSelections = {
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
    const clipped = clipSelections(savedAll, available(['传播学院']))

    expect(clipped.department).toEqual(['传播学院'])
    expect(clipped.courseType).toEqual(['通识'])
  })

  it('培养层次固定，永远保留', () => {
    const clipped = clipSelections(
      { ...emptySelections(), level: ['本科生', '研究生'] },
      available([]),
    )

    expect(clipped.level).toEqual(['本科生', '研究生'])
  })

  it('不修改入参', () => {
    clipSelections(savedAll, available(['传播学院']))
    expect(savedAll.department).toEqual(['传播学院', '化学与分子工程学院'])
  })
})

describe('shelvedValues', () => {
  it('返回当前学期用不到的已选条件', () => {
    expect(shelvedValues(savedAll, available(['传播学院']))).toEqual(['化学与分子工程学院'])
  })

  it('全部可用时为空', () => {
    expect(shelvedValues(savedAll, available(['传播学院', '化学与分子工程学院']))).toEqual([])
  })
})

describe('applyVisibleSelections', () => {
  it('勾选新值时加入全局条件', () => {
    const visible = {
      ...clipSelections(savedAll, available(['传播学院'])),
      department: ['传播学院', '数学学院'],
    }

    const next = applyVisibleSelections(savedAll, visible, available(['传播学院', '数学学院']))

    // 数学学院被勾选；化学与分子工程学院该学期用不到，仍保留在全局条件里
    expect(next.department).toEqual(['化学与分子工程学院', '传播学院', '数学学院'])
  })

  it('取消勾选时从全局条件移除', () => {
    const next = applyVisibleSelections(
      savedAll,
      { ...clipSelections(savedAll, available(['传播学院'])), department: [] },
      available(['传播学院']),
    )

    // 传播学院被取消；化学与分子工程学院不属于该学期，保留
    expect(next.department).toEqual(['化学与分子工程学院'])
  })

  it('当前学期用不到的值不受界面操作影响', () => {
    const next = applyVisibleSelections(
      savedAll,
      { ...emptySelections() },
      available(['传播学院', '化学与分子工程学院']),
    )

    expect(next.department).toEqual([])
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

describe('全局一份条件 + 按学期生效（A → B → A）', () => {
  // 2026-2027-1 有「化学与分子工程学院」，2025-2026-1 没有
  const availA = available(['传播学院', '化学与分子工程学院'])
  const availB = available(['传播学院'])

  it('切换学期不修改全局条件，只改变生效范围', () => {
    // 在 A 学期勾选两项后，全局条件即为两份
    expect(clipSelections(savedAll, availA).department).toEqual([
      '传播学院',
      '化学与分子工程学院',
    ])

    // 切到 B：全局条件不变，只是「化学与分子工程学院」暂不生效
    expect(clipSelections(savedAll, availB).department).toEqual(['传播学院'])
    expect(shelvedValues(savedAll, availB)).toEqual(['化学与分子工程学院'])

    // 切回 A：无需任何恢复动作，条件自动重新生效
    expect(clipSelections(savedAll, availA).department).toEqual([
      '传播学院',
      '化学与分子工程学院',
    ])
    expect(shelvedValues(savedAll, availA)).toEqual([])
  })

  it('在 B 学期取消传播学院后，全局条件里只剩化学与分子工程学院', () => {
    const visibleInB = { ...clipSelections(savedAll, availB), department: [] }
    const next = applyVisibleSelections(savedAll, visibleInB, availB)

    expect(next.department).toEqual(['化学与分子工程学院'])
    expect(clipSelections(next, availB).department).toEqual([])
  })
})
