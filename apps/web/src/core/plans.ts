/**
 * 排课方案规则（纯函数，零框架依赖）
 *
 * PRD §3.5：一个学期最多 10 个方案；允许重名；新建时自动命名为「方案 N」。
 * 方案与学期的归属关系由 `PlanRecord.semester` 表达，切换学期只显示该学期的方案。
 */

import type { PlanRecord } from '../storage/db'

/** 每学期方案上限（PRD §3.5） */
export const PLAN_LIMIT = 10

/** 默认方案名前缀 */
export const PLAN_NAME_PREFIX = '方案'

/** 方案名最大长度（超出截断，避免副栏被撑开） */
export const PLAN_NAME_MAX_LENGTH = 40

/** 是否还能新建方案 */
export function canAddPlan(plans: readonly PlanRecord[]): boolean {
  return plans.length < PLAN_LIMIT
}

/**
 * 默认方案名
 *
 * 取已有「方案 N」中最大的 N + 1；没有同族命名时从 1 开始。
 * 删除中间方案后编号可能复用（重名本就允许，PRD §3.5）。
 */
export function defaultPlanName(plans: readonly PlanRecord[]): string {
  const used = plans
    .map((plan) => new RegExp(`^${PLAN_NAME_PREFIX}\\s*(\\d+)$`).exec(plan.name.trim())?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number)

  return `${PLAN_NAME_PREFIX} ${used.length === 0 ? 1 : Math.max(...used) + 1}`
}

/** 规范化方案名：去首尾空白、压缩连续空白、超长截断 */
export function normalizePlanName(raw: string): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, PLAN_NAME_MAX_LENGTH)
}

/** 方案名是否可用（规范化后非空） */
export function isValidPlanName(name: string): boolean {
  return normalizePlanName(name).length > 0
}

/** 按创建时间升序（先建的在前）；不修改入参 */
export function sortPlansByCreated(plans: readonly PlanRecord[]): PlanRecord[] {
  return [...plans].sort((a, b) => a.createdAt - b.createdAt)
}

/**
 * 重命名
 *
 * 名称非法（空）时原样返回；找不到 id 时原样返回。不修改入参。
 */
export function renamePlan(plans: readonly PlanRecord[], id: string, name: string): PlanRecord[] {
  const normalized = normalizePlanName(name)
  if (!normalized) return [...plans]

  return plans.map((plan) => (plan.id === id ? { ...plan, name: normalized } : plan))
}
