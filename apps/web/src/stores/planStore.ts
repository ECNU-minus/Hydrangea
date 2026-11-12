import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  PLAN_LIMIT,
  canAddPlan,
  defaultPlanName,
  isValidPlanName,
  normalizePlanName,
  sortPlansByCreated,
} from '../core/plans'
import {
  currentPlanKey,
  getSetting,
  listPlans,
  putPlan,
  removePlan,
  setSetting,
  type PlanRecord,
} from '../storage/db'
import { useMarkStore } from './markStore'

/**
 * 排课方案状态（DESIGN §4.3 planStore，PRD §3.5）
 *
 * - 方案按学期隔离：切换学期只显示该学期的方案；
 * - 每个学期始终至少有一个方案（没有就自动建「方案 1」）；
 * - 当前方案记在 `settings.currentPlan:<semester>`，切回该学期时恢复；
 * - 方案的**内容**（意向/已排标记）由 `markStore` 持有，方案切换时重新加载。
 */
export const usePlanStore = defineStore('plans', () => {
  const markStore = useMarkStore()

  /** 方案所属学期 */
  const semester = ref('')
  /** 当前学期的方案（按创建时间升序） */
  const plans = ref<PlanRecord[]>([])
  /** 当前方案的标识 */
  const currentPlanId = ref('')
  /** 正在读取本地存储 */
  const loading = ref(false)
  /** 本地存储不可用等错误提示 */
  const error = ref('')
  /** 一次性提示（达到上限、删除最后一个方案等） */
  const notice = ref('')

  /** 当前方案 */
  const currentPlan = computed<PlanRecord | null>(
    () => plans.value.find((plan) => plan.id === currentPlanId.value) ?? null,
  )

  /** 方案数量 */
  const planCount = computed(() => plans.value.length)

  /** 是否还能新建（PRD §3.5：上限 10 个） */
  const canCreate = computed(() => canAddPlan(plans.value))

  /** 把当前方案写入 settings，供下次进入该学期时恢复 */
  async function rememberCurrent(target: string, planId: string): Promise<void> {
    if (!target) return
    try {
      await setSetting(currentPlanKey(target), planId)
    } catch {
      // 记住选择属于锦上添花，失败不影响当前会话
    }
  }

  /** 切换当前方案：重新加载该方案的标记 */
  async function selectPlan(planIdValue: string): Promise<void> {
    if (!plans.value.some((plan) => plan.id === planIdValue)) return
    if (planIdValue === currentPlanId.value) return

    currentPlanId.value = planIdValue
    notice.value = ''
    await rememberCurrent(semester.value, planIdValue)
    await markStore.load(semester.value, planIdValue)
    await markStore.resolveDetails()
  }

  /** 新建方案并切换过去；达上限时拒绝并提示 */
  async function createPlan(): Promise<PlanRecord | null> {
    if (!canCreate.value) {
      notice.value = `每个学期最多 ${PLAN_LIMIT} 个方案，已达上限，请先删除不需要的方案`
      return null
    }

    const plan: PlanRecord = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      semester: semester.value,
      name: defaultPlanName(plans.value),
      createdAt: Date.now(),
    }

    try {
      await putPlan(plan)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '本地方案保存失败'
      return null
    }

    plans.value = sortPlansByCreated([...plans.value, plan])
    currentPlanId.value = plan.id
    notice.value = ''
    await rememberCurrent(semester.value, plan.id)
    // 空方案：加载后没有标记
    await markStore.load(semester.value, plan.id)

    return plan
  }

  /** 重命名当前（或指定）方案；空名拒绝 */
  async function renamePlanOf(planIdValue: string, name: string): Promise<boolean> {
    if (!isValidPlanName(name)) {
      notice.value = '方案名不能为空'
      return false
    }

    const target = plans.value.find((plan) => plan.id === planIdValue)
    if (!target) return false

    const next: PlanRecord = { ...target, name: normalizePlanName(name) }
    if (next.name === target.name) return true

    try {
      await putPlan(next)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '本地方案保存失败'
      return false
    }

    plans.value = plans.value.map((plan) => (plan.id === planIdValue ? next : plan))
    notice.value = ''

    return true
  }

  /**
   * 删除方案（连带删除其标记）
   *
   * 删的是当前方案时自动切到剩余的第一个；删掉最后一个后自动新建「方案 1」，
   * 保证每个学期始终有可用方案。
   */
  async function removePlanOf(planIdValue: string): Promise<void> {
    const target = plans.value.find((plan) => plan.id === planIdValue)
    if (!target) return

    try {
      await removePlan(planIdValue)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '本地方案删除失败'
      return
    }

    plans.value = plans.value.filter((plan) => plan.id !== planIdValue)

    if (plans.value.length === 0) {
      await createPlan()
      // createPlan 成功会清空提示，这里补回「自动新建」的说明
      notice.value = '已删除最后一个方案，已自动新建「方案 1」'
      return
    }

    if (currentPlanId.value === planIdValue) {
      const next = plans.value[0]
      currentPlanId.value = next.id
      await rememberCurrent(semester.value, next.id)
      await markStore.load(semester.value, next.id)
      await markStore.resolveDetails()
    }
  }

  /**
   * 加载某学期的方案
   *
   * 顺序：读取该学期方案 → 恢复上次选中的方案（没有则取第一个）→ 一个都没有就自动建「方案 1」
   * → 加载该方案的标记。重复调用同一学期为空操作。
   */
  async function load(target: string): Promise<void> {
    if (!target) return
    if (target === semester.value && plans.value.length > 0) return

    semester.value = target
    loading.value = true
    error.value = ''
    notice.value = ''

    try {
      plans.value = await listPlans(target)

      if (plans.value.length === 0) {
        const plan: PlanRecord = {
          id:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          semester: target,
          name: defaultPlanName([]),
          createdAt: Date.now(),
        }
        await putPlan(plan)
        plans.value = [plan]
        currentPlanId.value = plan.id
        await rememberCurrent(target, plan.id)
      } else {
        const remembered = await getSetting<string>(currentPlanKey(target))
        const found = plans.value.some((plan) => plan.id === remembered)
        currentPlanId.value = found ? (remembered as string) : plans.value[0].id
        await rememberCurrent(target, currentPlanId.value)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '本地方案读取失败'
      plans.value = []
      currentPlanId.value = ''
    } finally {
      loading.value = false
    }

    await markStore.load(target, currentPlanId.value)
  }

  /** 清除一次性提示 */
  function clearNotice(): void {
    notice.value = ''
  }

  return {
    semester,
    plans,
    currentPlanId,
    currentPlan,
    planCount,
    canCreate,
    loading,
    error,
    notice,
    load,
    selectPlan,
    createPlan,
    renamePlanOf,
    removePlanOf,
    clearNotice,
  }
})
