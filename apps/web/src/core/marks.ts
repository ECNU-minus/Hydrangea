/**
 * 标记规则（纯函数，零框架依赖）
 *
 * 意向标记（一级标记）的规则见 PRD §3.2.4 / §3.2.8、DESIGN §2.6：
 * - 以**教学班**为单位，点击即生效，无确认框；
 * - 最多 50 门课，达到上限后**阻止添加**并提示；
 * - 取消意向即删除该条记录（已排是意向的子集，随之移除）。
 */

import type { IntentMark } from '../storage/db'

/** 意向列表上限（PRD §3.2.8） */
export const INTENT_LIMIT = 50

/** 切换意向的结果 */
export interface ToggleResult {
  /** 变更后的标记列表（不可变更新，入参不被修改） */
  next: IntentMark[]
  /** 是否因达到上限而被阻止 */
  blocked: boolean
}

/** 某教学班是否已打意向标记 */
export function isIntent(marks: readonly IntentMark[], classCode: string): boolean {
  return marks.some((mark) => mark.classCode === classCode && mark.intent)
}

/** 已打意向标记的教学班代码（供视图绑定） */
export function intentCodes(marks: readonly IntentMark[]): string[] {
  return marks.filter((mark) => mark.intent).map((mark) => mark.classCode)
}

/**
 * 切换某教学班的意向标记
 *
 * - 已存在：移除该条（取消意向）。
 * - 不存在且已达上限：`blocked = true`，列表不变。
 * - 不存在且未达上限：追加一条 `{ intent: true, scheduled: false }`。
 */
export function toggleIntent(
  marks: readonly IntentMark[],
  semester: string,
  classCode: string,
  now: number,
): ToggleResult {
  if (isIntent(marks, classCode)) {
    return { next: marks.filter((mark) => mark.classCode !== classCode), blocked: false }
  }

  if (marks.length >= INTENT_LIMIT) {
    return { next: [...marks], blocked: true }
  }

  return {
    next: [...marks, { semester, classCode, intent: true, scheduled: false, addedAt: now }],
    blocked: false,
  }
}

/** 意向列表中的一条（详情可为空：未解析或数据中已不存在） */
export interface IntentEntry {
  classCode: string
  addedAt: number
  /** 教学班详情：`undefined` = 未解析，`null` = 数据中不存在（占位条目） */
  course?: { courseCode: string; courseName: string } | null
}

/** 按添加时间升序（先加的在上，PRD §3.2.8）；不修改入参 */
export function sortByAddedAt(marks: readonly IntentMark[]): IntentMark[] {
  return [...marks].sort((a, b) => a.addedAt - b.addedAt)
}

/**
 * 拆出占位条目（PRD §3.2.8）
 *
 * `course === null` 表示数据中不存在该教学班 → 占位条目，仅展示教学班代码，
 * 与正常课程在列表中分隔展示。`undefined`（尚未回查）不算占位，避免闪烁。
 */
export function splitPlaceholders(entries: readonly IntentEntry[]): {
  normal: IntentEntry[]
  placeholders: IntentEntry[]
} {
  const normal: IntentEntry[] = []
  const placeholders: IntentEntry[] = []

  for (const entry of entries) {
    if (entry.course === null) placeholders.push(entry)
    else normal.push(entry)
  }

  return { normal, placeholders }
}

/**
 * 同一课程被打标了多个教学班的课程代码（PRD §3.2.6）
 *
 * 仅统计已解析出详情的条目；返回出现次数 ≥ 2 的课程代码。
 */
export function multiClassCourseCodes(entries: readonly IntentEntry[]): string[] {
  const counts = new Map<string, number>()

  for (const entry of entries) {
    if (!entry.course) continue
    counts.set(entry.course.courseCode, (counts.get(entry.course.courseCode) ?? 0) + 1)
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([courseCode]) => courseCode)
    .sort((a, b) => a.localeCompare(b))
}
