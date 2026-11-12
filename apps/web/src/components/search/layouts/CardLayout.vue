<script setup lang="ts">
import type { ClassItem } from '../../../api/classes'
import { formatSchedule, formatWeeks } from '../../../core/format'

const props = defineProps<{
  items: ClassItem[]
  /** 已打意向标记的教学班代码 */
  intentCodes: string[]
}>()

const emit = defineEmits<{
  /** 切换某教学班的意向标记 */
  toggleIntent: [classCode: string]
}>()

/** 某教学班是否已打意向标记 */
function isIntent(classCode: string): boolean {
  return props.intentCodes.includes(classCode)
}
</script>

<template>
  <div class="class-list">
    <article
      v-for="item in items"
      :key="item.classCode"
      class="class-card"
      :class="{ 'is-intent': isIntent(item.classCode) }"
    >
      <header class="card-header">
        <span class="class-code">{{ item.classCode }}</span>
        <span class="course-name">{{ item.courseName }}</span>
        <span class="course-code">{{ item.courseCode }}</span>
        <span class="hours-credits">{{ item.totalHours }}/{{ item.credits }}</span>
        <button
          type="button"
          class="intent-toggle"
          :class="{ 'is-on': isIntent(item.classCode) }"
          :aria-pressed="isIntent(item.classCode)"
          :aria-label="isIntent(item.classCode) ? '取消意向' : '标记意向'"
          :title="isIntent(item.classCode) ? '取消意向' : '标记意向'"
          @click="emit('toggleIntent', item.classCode)"
        >
          {{ isIntent(item.classCode) ? '★' : '☆' }}
        </button>
      </header>

      <dl class="card-body">
        <div class="row">
          <dt>教师</dt>
          <dd>{{ item.teacher }}</dd>
        </div>
        <div class="row">
          <dt>时间</dt>
          <dd>{{ formatSchedule(item.schedule) }}</dd>
        </div>
        <div class="row">
          <dt>周次</dt>
          <dd>{{ formatWeeks(item.weeks) }}</dd>
        </div>
        <div class="row">
          <dt>层次</dt>
          <dd>{{ item.level }}</dd>
        </div>
        <div class="row">
          <dt>教学组成</dt>
          <dd>{{ item.teachingComposition }}</dd>
        </div>
        <div v-if="item.remark" class="row">
          <dt>备注</dt>
          <dd>{{ item.remark }}</dd>
        </div>
      </dl>

      <footer class="card-footer">
        <a :href="item.syllabusUrl" target="_blank" rel="noopener noreferrer">
          课程大纲 ↗
        </a>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.class-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.class-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  background: var(--bg);
}

.card-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.class-code {
  font-family: var(--mono);
  font-weight: 600;
  color: var(--accent);
}

.course-name {
  font-weight: 600;
  color: var(--text-h);
  min-width: 0;
  word-break: break-word;
}

.course-code {
  font-family: var(--mono);
  color: var(--text);
  font-size: 0.9em;
}

.hours-credits {
  margin-left: auto;
  font-family: var(--mono);
  color: var(--text);
  font-size: 0.9em;
}

/* 已打意向标记的卡片：左侧色条 + 浅底色（PRD §3.2.4） */
.class-card.is-intent {
  border-color: var(--accent);
  background: var(--accent-bg, rgba(170, 59, 255, 0.06));
}

.intent-toggle {
  background: none;
  border: none;
  padding: 0 2px;
  font-size: 1.15em;
  line-height: 1;
  color: var(--text);
  cursor: pointer;
}

.intent-toggle:hover {
  color: var(--accent);
}

.intent-toggle.is-on {
  color: var(--accent);
}

.card-body {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row {
  display: flex;
  gap: 8px;
  font-size: 0.95em;
}

.row dt {
  flex: 0 0 64px;
  color: var(--text);
}

.row dd {
  margin: 0;
  color: var(--text-h);
  min-width: 0;
  word-break: break-word;
}

.card-footer {
  margin-top: 8px;
  text-align: right;
}

.card-footer a {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.9em;
}

.card-footer a:hover {
  text-decoration: underline;
}
</style>