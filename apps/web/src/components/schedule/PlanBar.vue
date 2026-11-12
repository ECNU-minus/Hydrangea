<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { PLAN_LIMIT, PLAN_NAME_MAX_LENGTH } from '../../core/plans'
import { usePlanStore } from '../../stores/planStore'

/**
 * 副栏方案区（PRD §3.5，DESIGN §4.2）
 *
 * - 下拉切换方案；
 * - 「新建」达上限（10 个）时禁用并提示；
 * - 「重命名」就地编辑（Enter 保存 / Esc 取消），允许重名；
 * - 「删除」两步确认，删除当前方案后自动切到剩余方案。
 */
const planStore = usePlanStore()

/** 是否处于重命名编辑态 */
const editing = ref(false)
/** 重命名草稿 */
const draft = ref('')
/** 是否已进入「确认删除」状态 */
const confirmingDelete = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | null = null

function cancelConfirm(): void {
  confirmingDelete.value = false
  if (confirmTimer) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
}

function onSelect(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  cancelConfirm()
  void planStore.selectPlan(value)
}

async function onCreate(): Promise<void> {
  cancelConfirm()
  await planStore.createPlan()
}

function startRename(): void {
  if (!planStore.currentPlan) return
  cancelConfirm()
  draft.value = planStore.currentPlan.name
  editing.value = true
}

function cancelRename(): void {
  editing.value = false
  draft.value = ''
}

async function saveRename(): Promise<void> {
  const id = planStore.currentPlanId
  if (!id) return

  const ok = await planStore.renamePlanOf(id, draft.value)
  if (ok) cancelRename()
}

function onDeleteClick(): void {
  if (!planStore.currentPlan) return

  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    if (confirmTimer) clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => {
      confirmingDelete.value = false
      confirmTimer = null
    }, 4000)
    return
  }

  cancelConfirm()
  void planStore.removePlanOf(planStore.currentPlanId)
}

onBeforeUnmount(cancelConfirm)
</script>

<template>
  <section class="plan-bar">
    <div class="plan-bar__row">
      <label class="plan-bar__label" for="plan-select">方案</label>
      <select
        id="plan-select"
        class="plan-bar__select"
        :value="planStore.currentPlanId"
        :disabled="planStore.planCount === 0"
        @change="onSelect"
      >
        <option v-for="plan in planStore.plans" :key="plan.id" :value="plan.id">
          {{ plan.name }}
        </option>
      </select>
      <span class="plan-bar__count">{{ planStore.planCount }}/{{ PLAN_LIMIT }}</span>
    </div>

    <div class="plan-bar__actions">
      <button
        type="button"
        class="plan-btn"
        :class="{ 'plan-btn--limited': !planStore.canCreate }"
        :title="planStore.canCreate ? '新建方案' : `每个学期最多 ${PLAN_LIMIT} 个方案`"
        @click="onCreate"
      >
        新建
      </button>
      <button type="button" class="plan-btn" :disabled="!planStore.currentPlan" @click="startRename">
        重命名
      </button>
      <button
        type="button"
        class="plan-btn plan-btn--danger"
        :disabled="!planStore.currentPlan"
        @click="onDeleteClick"
      >
        {{ confirmingDelete ? '确认删除' : '删除' }}
      </button>
    </div>

    <form v-if="editing" class="plan-bar__rename" @submit.prevent="saveRename">
      <input
        v-model="draft"
        class="plan-bar__input"
        :maxlength="PLAN_NAME_MAX_LENGTH"
        aria-label="方案名称"
        placeholder="方案名称"
        @keydown.esc="cancelRename"
      />
      <button type="submit" class="plan-btn">保存</button>
      <button type="button" class="plan-btn" @click="cancelRename">取消</button>
    </form>

    <p v-if="planStore.error" class="plan-bar__notice plan-bar__notice--error">
      {{ planStore.error }}
    </p>
    <p v-else-if="planStore.notice" class="plan-bar__notice">{{ planStore.notice }}</p>
  </section>
</template>

<style scoped>
.plan-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.plan-bar__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-bar__label {
  font-size: 0.9em;
  color: var(--text);
  flex: none;
}

.plan-bar__select {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 0.95em;
}

.plan-bar__count {
  flex: none;
  font-family: var(--mono);
  font-size: 0.75em;
  color: var(--text);
}

.plan-bar__actions {
  display: flex;
  gap: 6px;
}

.plan-btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 0.85em;
  cursor: pointer;
}

.plan-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.plan-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.plan-btn--limited {
  color: var(--text);
  border-style: dashed;
}

.plan-btn--danger {
  margin-left: auto;
  color: #b3261e;
  border-color: rgba(211, 47, 47, 0.35);
}

.plan-btn--danger:hover:not(:disabled) {
  border-color: #d33;
  color: #d33;
}

.plan-bar__rename {
  display: flex;
  gap: 6px;
}

.plan-bar__input {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  font-size: 0.9em;
}

.plan-bar__notice {
  margin: 0;
  font-size: 0.8em;
  color: #8a5a00;
}

.plan-bar__notice--error {
  color: #b3261e;
}
</style>
