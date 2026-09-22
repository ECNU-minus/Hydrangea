<script setup lang="ts">
import type { ClassItem } from '../../../api/classes'
import { formatSchedule, formatWeeks } from '../../../core/format'

defineProps<{
  items: ClassItem[]
}>()
</script>

<template>
  <div class="class-list">
    <article v-for="item in items" :key="item.classCode" class="class-card">
      <header class="card-header">
        <span class="class-code">{{ item.classCode }}</span>
        <span class="course-name">{{ item.courseName }}</span>
        <span class="course-code">{{ item.courseCode }}</span>
        <span class="hours-credits">{{ item.totalHours }}/{{ item.credits }}</span>
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