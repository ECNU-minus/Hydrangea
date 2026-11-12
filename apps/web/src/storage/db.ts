/**
 * 浏览器本地存储（IndexedDB）封装
 *
 * 用户数据（方案/标记/设置）只存在浏览器本地，后端不参与、不感知（DESIGN §2.6）。
 *
 * 数据库版本：
 * - v1：`marks`（标记，主键 `[semester, classCode]`）、`settings`（键值设置）
 * - v2：新增 `plans`（排课方案）与 `planMarks`（方案标记，主键 `[planId, classCode]`）
 *
 * v1 → v2 的迁移**不破坏旧数据**：升级只新建 store，旧 `marks` 原样保留；打开后把旧标记
 * 折叠成「每个学期一个方案 1」，迁移成功才写 `legacyMarksMigrated` 标记，旧 store 留待
 * 后续版本清理。这样即使迁移中途失败，数据仍可在旧 store 里找回。
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/** 排课方案（PRD §3.5） */
export interface PlanRecord {
  /** 方案唯一标识 */
  id: string
  /** 绑定学期（创建时绑定，不随学期切换改变） */
  semester: string
  /** 方案名称（允许重名） */
  name: string
  /** 创建时间戳（方案按此升序排列） */
  createdAt: number
}

/** 标记条目（DESIGN §2.6；归属某个方案） */
export interface IntentMark {
  /** 所属方案 */
  planId: string
  /** 学期（与方案一致，便于直接过滤） */
  semester: string
  /** 教学班代码 */
  classCode: string
  /** 意向标记（一级标记） */
  intent: boolean
  /** 已排标记（二级标记，意向的子集） */
  scheduled: boolean
  /** 打标时间戳（用于意向列表按添加时间排序） */
  addedAt: number
}

/** 键值设置条目（当前方案、搜索条件等） */
export interface SettingRecord {
  key: string
  value: unknown
}

/** v1 的标记结构（仅用于升级迁移） */
interface LegacyMark {
  semester: string
  classCode: string
  intent: boolean
  scheduled: boolean
  addedAt: number
}

/** v1 结构（仅用于升级迁移） */
interface LegacySchema extends DBSchema {
  marks: {
    key: [string, string]
    value: LegacyMark
    indexes: { 'by-semester': string }
  }
  settings: {
    key: string
    value: SettingRecord
  }
}

interface HydrangeaSchema extends DBSchema {
  plans: {
    key: string
    value: PlanRecord
    indexes: { 'by-semester': string }
  }
  planMarks: {
    key: [string, string]
    value: IntentMark
    indexes: { 'by-plan': string }
  }
  settings: {
    key: string
    value: SettingRecord
  }
}

const DB_NAME = 'hydrangea'
const DB_VERSION = 2

/** 迁移完成标记（settings 键） */
const MIGRATED_KEY = 'legacyMarksMigrated'

/** 每学期记住的当前方案（settings 键） */
export function currentPlanKey(semester: string): string {
  return `currentPlan:${semester}`
}

/** 新方案标识 */
function newPlanId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 把 v1 的旧标记迁移成「方案 + 方案标记」
 *
 * 旧 `marks` store 在升级中原样保留，所以这里失败了下一次打开仍可重试；
 * 成功后写 `legacyMarksMigrated` 标记，后续打开直接跳过。
 */
async function migrateLegacyMarks(db: IDBPDatabase<HydrangeaSchema>): Promise<void> {
  const done = await db.get('settings', MIGRATED_KEY)
  if (done?.value === true) return

  // 旧 store 不在 v2 的类型里，运行时按原生 DOMStringList 判断
  const storeNames = db.objectStoreNames as unknown as DOMStringList
  if (!storeNames.contains('marks')) {
    await db.put('settings', { key: MIGRATED_KEY, value: true })
    return
  }

  const rows = await (db as unknown as IDBPDatabase<LegacySchema>).getAll('marks')
  const tx = db.transaction(['plans', 'planMarks', 'settings'], 'readwrite')
  const plansStore = tx.objectStore('plans')
  const marksStore = tx.objectStore('planMarks')
  const settingsStore = tx.objectStore('settings')
  const planBySemester = new Map<string, string>()

  for (const row of rows) {
    let planId = planBySemester.get(row.semester)
    if (!planId) {
      planId = newPlanId()
      planBySemester.set(row.semester, planId)
      plansStore.put({ id: planId, semester: row.semester, name: '方案 1', createdAt: row.addedAt })
      settingsStore.put({ key: currentPlanKey(row.semester), value: planId })
    }

    marksStore.put({
      planId,
      semester: row.semester,
      classCode: row.classCode,
      intent: row.intent,
      scheduled: row.scheduled,
      addedAt: row.addedAt,
    })
  }

  settingsStore.put({ key: MIGRATED_KEY, value: true })

  await tx.done
}

let dbPromise: Promise<IDBPDatabase<HydrangeaSchema>> | null = null

/** 打开数据库（懒加载单例） */
export function openDb(): Promise<IDBPDatabase<HydrangeaSchema>> {
  dbPromise ??= (async () => {
    const db = await openDB<HydrangeaSchema>(DB_NAME, DB_VERSION, {
      upgrade(upgradeDb, oldVersion) {
        if (oldVersion < 1) {
          // 全新安装：直接建 v2 结构
          const plans = upgradeDb.createObjectStore('plans', { keyPath: 'id' })
          plans.createIndex('by-semester', 'semester')
          const planMarks = upgradeDb.createObjectStore('planMarks', {
            keyPath: ['planId', 'classCode'],
          })
          planMarks.createIndex('by-plan', 'planId')
          upgradeDb.createObjectStore('settings', { keyPath: 'key' })

          return
        }

        // v1 → v2：只新建 plans / planMarks；旧 marks 与 settings 原样保留，迁移在打开后进行
        const plans = upgradeDb.createObjectStore('plans', { keyPath: 'id' })
        plans.createIndex('by-semester', 'semester')
        const planMarks = upgradeDb.createObjectStore('planMarks', {
          keyPath: ['planId', 'classCode'],
        })
        planMarks.createIndex('by-plan', 'planId')
      },
    })

    await migrateLegacyMarks(db)

    return db
  })()

  return dbPromise
}

/** 读取某学期的方案（按创建时间升序） */
export async function listPlans(semester: string): Promise<PlanRecord[]> {
  const db = await openDb()
  const plans = await db.getAllFromIndex('plans', 'by-semester', semester)

  return plans
    .map((plan) => ({ ...plan }))
    .sort((a: PlanRecord, b: PlanRecord) => a.createdAt - b.createdAt)
}

/** 新增或更新一个方案 */
export async function putPlan(plan: PlanRecord): Promise<void> {
  const db = await openDb()
  await db.put('plans', { ...plan })
}

/** 删除方案及其全部标记 */
export async function removePlan(planId: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['plans', 'planMarks'], 'readwrite')
  const marksStore = tx.objectStore('planMarks')

  const keys = await marksStore.index('by-plan').getAllKeys(planId)
  for (const key of keys) marksStore.delete(key)
  await tx.objectStore('plans').delete(planId)

  await tx.done
}

/** 读取某方案的全部标记（按打标时间升序） */
export async function listMarks(planId: string): Promise<IntentMark[]> {
  const db = await openDb()
  const marks = await db.getAllFromIndex('planMarks', 'by-plan', planId)

  return marks.sort((a: IntentMark, b: IntentMark) => a.addedAt - b.addedAt)
}

/**
 * 新增或更新一条标记
 *
 * 入参可能是 Vue 的响应式代理，结构化克隆无法复制代理对象，
 * 故这里统一浅拷贝成普通对象再写入。
 */
export async function putMark(mark: IntentMark): Promise<void> {
  const db = await openDb()
  await db.put('planMarks', { ...mark })
}

/** 删除一条标记（取消意向；已排随之移除） */
export async function deleteMark(planId: string, classCode: string): Promise<void> {
  const db = await openDb()
  await db.delete('planMarks', [planId, classCode])
}

/** 读取设置项（不存在时返回 undefined） */
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  const record = await db.get('settings', key)

  return record?.value as T | undefined
}

/** 写入设置项（同样避免直接写入响应式代理） */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await openDb()
  await db.put('settings', { key, value: JSON.parse(JSON.stringify(value)) as T })
}
