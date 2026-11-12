<script setup lang="ts">
import { computed } from 'vue'
import { formatDateTime } from '../../core/format'
import { useMarkStore } from '../../stores/markStore'

/**
 * 副栏意向列表（PRD §3.2.8）
 *
 * - 按添加时间升序（先加的在上）；
 * - 同一课程的多个教学班另有标注（PRD §3.2.6）；
 * - 数据中已不存在的教学班以「占位条目」单独分组展示；
 * - 每条可直接移除意向（已排标记在下一步实现）。
 */
const markStore = useMarkStore()

const groups = computed(() => markStore.intentGroups)

/** 同一课程多教学班的提示文案 */
const multiClassNotice = computed(() =>
  markStore.multiClassCourses.length > 0
    ? `注意：以下课程存在多个已标记的教学班（不影响选课，仅提示）：${markStore.multiClassCourses.join('、')}`
    : '',
)
</script>

<template>
  <section class="intent-list">
    <h2 class="intent-list__title">
      意向列表
      <span class="intent-list__count">{{ markStore.intentCount }}</span>
      <span v-if="markStore.scheduledCount > 0" class="intent-list__scheduled">
        已排 {{ markStore.scheduledCount }}
      </span>
    </h2>

    <p v-if="markStore.loading" class="intent-list__hint">加载中…</p>
    <p v-else-if="markStore.error" class="intent-list__hint error">{{ markStore.error }}</p>
    <p v-else-if="markStore.intentCount === 0" class="intent-list__hint">
      还没有意向课程，去「搜索」页点星标添加吧
    </p>

    <template v-else>
      <p v-if="multiClassNotice" class="intent-list__notice">{{ multiClassNotice }}</p>

      <ul class="intent-items">
        <li v-for="entry in groups.normal" :key="entry.classCode" class="intent-item">
          <div class="intent-item__main">
            <span class="intent-item__name">
              {{ entry.course?.courseName ?? '（加载中…）' }}
            </span>
            <span class="intent-item__meta">
              <span v-if="entry.course" class="intent-item__course">{{ entry.course.courseCode }}</span>
              <span class="intent-item__code">{{ entry.classCode }}</span>
            </span>
            <span class="intent-item__tags">
              <span
                v-if="entry.course && markStore.multiClassCourses.includes(entry.course.courseCode)"
                class="tag tag--warn"
              >
                多教学班
              </span>
            </span>
            <span class="intent-item__time">{{ formatDateTime(entry.addedAt) }}</span>
          </div>
          <label
            class="intent-item__toggle"
            :title="entry.course === null ? '占位条目不能打已排' : '已排后进入课表'"
          >
            <input
              type="checkbox"
              :checked="entry.scheduled === true"
              :disabled="entry.course === null"
              :aria-label="`${entry.classCode} 已排`"
              @change="markStore.toggleScheduledOf(entry.classCode)"
            />
            <span>已排</span>
          </label>
          <button
            type="button"
            class="intent-item__remove"
            aria-label="移除意向"
            title="移除意向"
            @click="markStore.removeIntent(entry.classCode)"
          >
            移除
          </button>
        </li>
      </ul>

      <template v-if="groups.placeholders.length > 0">
        <p class="intent-list__divider">
          以下教学班在当前数据中不存在（占位条目，仅保留教学班代码）
        </p>
        <ul class="intent-items">
          <li
            v-for="entry in groups.placeholders"
            :key="entry.classCode"
            class="intent-item intent-item--placeholder"
          >
            <div class="intent-item__main">
              <span class="intent-item__code">{{ entry.classCode }}</span>
              <span class="intent-item__time">{{ formatDateTime(entry.addedAt) }}</span>
            </div>
            <label class="intent-item__toggle" title="占位条目不能打已排">
              <input type="checkbox" disabled :aria-label="`${entry.classCode} 已排（占位条目不可用）`" />
              <span>已排</span>
            </label>
            <button
              type="button"
              class="intent-item__remove"
              aria-label="移除意向"
              title="移除意向"
              @click="markStore.removeIntent(entry.classCode)"
            >
              移除
            </button>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

<style scoped>
.intent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.intent-list__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.95em;
  color: var(--text-h);
}

.intent-list__count {
  font-family: var(--mono);
  font-size: 0.85em;
  color: var(--accent);
}

.intent-list__scheduled {
  font-family: var(--mono);
  font-size: 0.8em;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0 6px;
}

/* 已排开关 */
.intent-item__toggle {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78em;
  color: var(--text);
  cursor: pointer;
  user-select: none;
}

.intent-item__toggle input {
  accent-color: var(--accent);
  cursor: pointer;
}

.intent-item__toggle input:disabled {
  cursor: not-allowed;
}

.intent-list__hint {
  margin: 0;
  font-size: 0.85em;
  color: var(--text);
}

.intent-list__hint.error {
  color: #d33;
}

.intent-list__notice {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(180, 120, 0, 0.35);
  background: rgba(255, 193, 7, 0.12);
  color: #8a5a00;
  font-size: 0.8em;
  line-height: 1.5;
}

.intent-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.intent-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.intent-item__main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.intent-item__name {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--text-h);
  word-break: break-word;
}

.intent-item__meta {
  display: flex;
  gap: 8px;
  font-size: 0.8em;
  color: var(--text);
}

.intent-item__course,
.intent-item__code {
  font-family: var(--mono);
}

.intent-item__code {
  color: var(--accent);
}

.intent-item__tags {
  display: flex;
  gap: 6px;
}

.tag {
  font-size: 0.75em;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid currentcolor;
}

.tag--warn {
  color: #8a5a00;
}

.intent-item__time {
  font-size: 0.75em;
  color: var(--text);
}

.intent-item__remove {
  flex: 0 0 auto;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.78em;
  color: var(--text);
  cursor: pointer;
}

.intent-item__remove:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* 占位条目：不同颜色 + 与正常课程分隔（PRD §3.2.8） */
.intent-list__divider {
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
  font-size: 0.78em;
  color: #8a5a00;
  line-height: 1.5;
}

.intent-item--placeholder {
  border-style: dashed;
  border-color: rgba(180, 120, 0, 0.5);
}

.intent-item--placeholder .intent-item__code {
  color: #8a5a00;
}
</style>
