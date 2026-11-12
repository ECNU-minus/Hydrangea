/**
 * 浏览器本地存储（IndexedDB）封装
 *
 * 用户数据（标记/方案/设置）只存在浏览器本地，后端不参与、不感知（DESIGN §2.6）。
 *
 * 数据库版本：
 * - v1：`marks`（标记，复合主键 `[semester, classCode]`）、`settings`（键值设置）
 * - 后续：S5 引入方案管理时升到 v2，新增 `plans`
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/** 标记条目（DESIGN §2.6） */
export interface IntentMark {
  /** 学期标识（教学班代码跨学期重复，必须与学期一起定位） */
  semester: string
  /** 教学班代码 */
  classCode: string
  /** 意向标记（一级标记） */
  intent: boolean
  /** 已排标记（二级标记，意向的子集；本切片恒为 false） */
  scheduled: boolean
  /** 打标时间戳（用于意向列表按添加时间排序） */
  addedAt: number
}

/** 键值设置条目（下一步把 localStorage 的学期与搜索条件迁入） */
export interface SettingRecord {
  key: string
  value: unknown
}

interface HydrangeaSchema extends DBSchema {
  marks: {
    key: [string, string]
    value: IntentMark
    indexes: { 'by-semester': string }
  }
  settings: {
    key: string
    value: SettingRecord
  }
}

const DB_NAME = 'hydrangea'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<HydrangeaSchema>> | null = null

/** 打开数据库（懒加载单例） */
export function openDb(): Promise<IDBPDatabase<HydrangeaSchema>> {
  dbPromise ??= openDB<HydrangeaSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const marks = db.createObjectStore('marks', { keyPath: ['semester', 'classCode'] })
      marks.createIndex('by-semester', 'semester')
      db.createObjectStore('settings', { keyPath: 'key' })
    },
  })

  return dbPromise
}

/** 读取某学期的全部标记（按打标时间升序） */
export async function listMarks(semester: string): Promise<IntentMark[]> {
  const db = await openDb()
  const marks = await db.getAllFromIndex('marks', 'by-semester', semester)

  return marks.sort((a: IntentMark, b: IntentMark) => a.addedAt - b.addedAt)
}

/**
 * 新增一条标记
 *
 * 入参可能是 Vue 的响应式代理，结构化克隆无法复制代理对象，
 * 故这里统一浅拷贝成普通对象再写入。
 */
export async function addMark(mark: IntentMark): Promise<void> {
  const db = await openDb()
  await db.put('marks', { ...mark })
}

/** 删除一条标记（取消意向；已排随之移除） */
export async function deleteMark(semester: string, classCode: string): Promise<void> {
  const db = await openDb()
  await db.delete('marks', [semester, classCode])
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
