<script setup lang="ts">
import type { ClassItem } from '../../api/classes'

defineProps<{
  items: ClassItem[]
}>()

/** 将周次数组格式化为可读文本，如 "1-16"、"1,3,5,7" */
function formatWeeks(weeks: number[]): string {
  if (weeks.length === 0) return ''
  // 合并连续区间
  const ranges: string[] = []
  let start = weeks[0]
  let prev = weeks[0]
  for (let i = 1; i <= weeks.length; i++) {
    const cur = weeks[i]
    if (cur === prev + 1) {
      prev = cur
      continue
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = cur
    prev = cur
  }
  return ranges.join(',')
}

/** 将上课时间格式化为可读文本，如 "周一 1-2节 教101" */
function formatSchedule(schedule: ClassItem['schedule']): string {
  const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return schedule
    .map((s) => `${dayNames[s.day]} ${s.start}-${s.end}节 ${s.location}`)
    .join('；')
}
</script>

<template>
  <div class="class-table-wrap">
    <table class="class-table">
      <thead>
        <tr>
          <th>教学班</th>
          <th>课程代码</th>
          <th>课程名称</th>
          <th>学时/学分</th>
          <th>教师</th>
          <th>上课时间</th>
          <th>周次</th>
          <th>层次</th>
          <th>教学组成</th>
          <th>备注</th>
          <th>大纲</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.classCode">
          <td class="class-code">{{ item.classCode }}</td>
          <td class="mono">{{ item.courseCode }}</td>
          <td class="course-name">{{ item.courseName }}</td>
          <td class="mono">{{ item.totalHours }}/{{ item.credits }}</td>
          <td>{{ item.teacher }}</td>
          <td>{{ formatSchedule(item.schedule) }}</td>
          <td>{{ formatWeeks(item.weeks) }}</td>
          <td>{{ item.level }}</td>
          <td>{{ item.teachingComposition }}</td>
          <td class="remark">{{ item.remark }}</td>
          <td>
            <a :href="item.syllabusUrl" target="_blank" rel="noopener noreferrer">大纲 ↗</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.class-table-wrap {
  overflow-x: auto;
}

.class-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}

.class-table th,
.class-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
  white-space: normal;
  word-break: break-word;
}

.class-table th {
  position: sticky;
  top: 0;
  background: var(--bg);
  color: var(--text);
  font-weight: 600;
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
}

.class-table tbody tr:hover {
  background: var(--accent-bg, rgba(170, 59, 255, 0.05));
}

.class-code {
  font-family: var(--mono);
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
}

.course-name {
  font-weight: 600;
  color: var(--text-h);
}

.mono {
  font-family: var(--mono);
  color: var(--text);
  white-space: nowrap;
}

.remark {
  color: var(--text);
  max-width: 200px;
}

.class-table a {
  color: var(--accent);
  text-decoration: none;
}

.class-table a:hover {
  text-decoration: underline;
}
</style>