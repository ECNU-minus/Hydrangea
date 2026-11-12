import { describe, expect, it } from 'vitest'
import type { PlanRecord } from '../storage/db'
import {
  PLAN_LIMIT,
  PLAN_NAME_MAX_LENGTH,
  canAddPlan,
  defaultPlanName,
  isValidPlanName,
  normalizePlanName,
  renamePlan,
  sortPlansByCreated,
} from './plans'

function plan(id: string, name: string, createdAt = 0, semester = '2026-2027-1'): PlanRecord {
  return { id, semester, name, createdAt }
}

describe('defaultPlanName', () => {
  it('空列表时从「方案 1」开始', () => {
    expect(defaultPlanName([])).toBe('方案 1')
  })

  it('按已有最大编号递增', () => {
    expect(defaultPlanName([plan('a', '方案 1'), plan('b', '方案 3')])).toBe('方案 4')
  })

  it('忽略自定义名称，只参考「方案 N」族', () => {
    expect(defaultPlanName([plan('a', '我的课表'), plan('b', '方案 2')])).toBe('方案 3')
  })

  it('删除中间方案后编号可复用', () => {
    expect(defaultPlanName([plan('a', '方案 1'), plan('b', '方案 3')])).toBe('方案 4')
    expect(defaultPlanName([plan('a', '方案 1'), plan('b', '方案 2')])).toBe('方案 3')
  })
})

describe('canAddPlan', () => {
  it('未达上限可新建', () => {
    expect(canAddPlan([])).toBe(true)
    expect(canAddPlan(Array.from({ length: PLAN_LIMIT - 1 }, (_, i) => plan(String(i), `方案 ${i + 1}`)))).toBe(true)
  })

  it('达到上限不可新建', () => {
    expect(canAddPlan(Array.from({ length: PLAN_LIMIT }, (_, i) => plan(String(i), `方案 ${i + 1}`)))).toBe(false)
  })
})

describe('normalizePlanName', () => {
  it('去首尾空白并压缩连续空白', () => {
    expect(normalizePlanName('  大一   上  ')).toBe('大一 上')
  })

  it('超长截断', () => {
    const long = '课'.repeat(PLAN_NAME_MAX_LENGTH + 10)
    expect(normalizePlanName(long)).toHaveLength(PLAN_NAME_MAX_LENGTH)
  })

  it('全空白视为空名', () => {
    expect(normalizePlanName('   ')).toBe('')
    expect(isValidPlanName('   ')).toBe(false)
  })
})

describe('renamePlan', () => {
  it('改名成功并规范化', () => {
    const list = [plan('a', '方案 1'), plan('b', '方案 2')]
    const next = renamePlan(list, 'b', '  保研  方案 ')
    expect(next.find((p) => p.id === 'b')?.name).toBe('保研 方案')
    expect(next.find((p) => p.id === 'a')?.name).toBe('方案 1')
  })

  it('允许重名', () => {
    const list = [plan('a', '方案 1'), plan('b', '方案 2')]
    expect(renamePlan(list, 'b', '方案 1').map((p) => p.name)).toEqual(['方案 1', '方案 1'])
  })

  it('空名不改动', () => {
    const list = [plan('a', '方案 1')]
    expect(renamePlan(list, 'a', '   ')[0].name).toBe('方案 1')
  })

  it('不修改入参', () => {
    const list = [plan('a', '方案 1')]
    renamePlan(list, 'a', '新名字')
    expect(list[0].name).toBe('方案 1')
  })
})

describe('sortPlansByCreated', () => {
  it('按创建时间升序且不修改入参', () => {
    const list = [plan('b', '方案 2', 200), plan('a', '方案 1', 100)]
    expect(sortPlansByCreated(list).map((p) => p.id)).toEqual(['a', 'b'])
    expect(list.map((p) => p.id)).toEqual(['b', 'a'])
  })
})
