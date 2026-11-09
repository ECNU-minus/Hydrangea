<script setup lang="ts">
/**
 * 学期下拉框（PRD §3.2.1：位于副栏，与搜索/筛选同一层次）
 *
 * 选项来自 `GET /api/semesters`，顺序由后端给出（最新在前）。
 */
const props = defineProps<{
  /** 可用学期（最新在前） */
  options: string[]
  /** 当前学期 */
  modelValue: string
  /** 是否正在加载学期列表 */
  loading?: boolean
  /** 加载失败提示（空串表示正常） */
  error?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', semester: string): void
}>()

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="semester-select">
    <label class="semester-select__label" for="semester">学期</label>
    <select
      id="semester"
      class="semester-select__control"
      :value="props.modelValue"
      :disabled="props.loading || props.options.length === 0"
      @change="onChange"
    >
      <option v-if="props.options.length === 0" value="">{{ props.loading ? '加载中…' : '暂无学期' }}</option>
      <option v-for="option in props.options" :key="option" :value="option">{{ option }}</option>
    </select>
    <p v-if="props.error" class="semester-select__error">{{ props.error }}</p>
  </div>
</template>

<style scoped>
.semester-select {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.semester-select__label {
  font-size: 0.9em;
  color: var(--text);
}

.semester-select__control {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 0.9em;
  cursor: pointer;
}

.semester-select__control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.semester-select__error {
  font-size: 0.8em;
  color: #d33;
}
</style>
