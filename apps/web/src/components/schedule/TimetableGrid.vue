<script setup lang="ts">
import { blocksAt, isCovered, weekDots, type TimetableGrid } from '../../core/timetable'

/**
 * 周课表（PRD §3.3）
 *
 * 周一至周日 × 14 节次；每个课程块用圆点表示周次（有课填充、无课描线、冲突方形），
 * 冲突课程的文字标红。
 */
const props = defineProps<{ grid: TimetableGrid }>()

/** 该格需要跨越的节数（多段重叠时取最大） */
function rowSpanOf(day: number, slot: number): number {
  const blocks = blocksAt(props.grid, day, slot)
  return blocks.length === 0 ? 1 : Math.max(...blocks.map((block) => block.span))
}
</script>

<template>
  <div class="timetable-wrap">
    <table class="timetable">
      <colgroup>
        <col class="col-slot" />
        <col v-for="day in grid.days" :key="day" />
      </colgroup>
      <thead>
        <tr>
          <th class="slot-head">节次</th>
          <th v-for="day in grid.days" :key="day" class="day-head">周{{ '一二三四五六日'[day - 1] }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="slot in grid.slots" :key="slot.index">
          <th class="slot-col" :title="`第${slot.index}节 ${slot.start}–${slot.end}`">
            <span class="slot-col__index">第{{ slot.index }}节</span>
            <span class="slot-col__time">{{ slot.start }}–{{ slot.end }}</span>
          </th>          <template v-for="day in grid.days" :key="day">
            <td
              v-if="!isCovered(grid, day, slot.index)"
              :rowspan="rowSpanOf(day, slot.index)"
              class="cell"
              :class="{ 'cell--filled': blocksAt(grid, day, slot.index).length > 0 }"
            >
              <div
                v-for="block in blocksAt(grid, day, slot.index)"
                :key="block.classCode"
                class="block"
                :class="{ 'block--conflict': block.conflicted }"
                :title="`${block.courseName} · ${block.teacher} · ${block.location}`"
              >
                <span class="block__name">{{ block.courseName }}</span>
                <span class="block__meta">{{ block.location }}</span>
                <span class="block__code">{{ block.classCode }}</span>
                <span class="dots">
                  <span
                    v-for="dot in weekDots(block, grid.weeks)"
                    :key="dot.week"
                    class="dot"
                    :class="`dot--${dot.state}`"
                    :title="`第 ${dot.week} 周${dot.state === 'conflict' ? '（冲突）' : dot.state === 'on' ? '（有课）' : '（无课）'}`"
                  />
                </span>
              </div>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.timetable-wrap {
  overflow-x: auto;
}

.timetable {
  border-collapse: collapse;
  width: 100%;
  min-width: 720px;
  table-layout: fixed;
}

.timetable th,
.timetable td {
  border: 1px solid var(--border);
  padding: 4px;
  vertical-align: top;
}

.slot-head,
.day-head {
  font-size: 0.8em;
  font-weight: 600;
  color: var(--text-h);
  background: rgba(170, 59, 255, 0.04);
  padding: 6px 4px;
}

/* 节次列宽由 colgroup 指定（固定表格布局下由首行决定列宽） */
.col-slot {
  width: 76px;
}

/* 节次列：节次一行、时间一行；两行各自都不折行 */
.slot-col {
  text-align: center;
  font-weight: 400;
  white-space: nowrap;
  line-height: 1.25;
}

.slot-col__index {
  display: block;
  font-size: 0.72em;
  color: var(--text-h);
}

.slot-col__time {
  display: block;
  font-family: var(--mono);
  font-size: 0.62em;
  color: var(--text);
  white-space: nowrap;
}

.cell {
  height: 44px;
}

.cell--filled {
  background: rgba(170, 59, 255, 0.03);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(170, 59, 255, 0.08);
  border: 1px solid rgba(170, 59, 255, 0.25);
}

.block + .block {
  margin-top: 4px;
}

/* 冲突：文字标红（PRD §3.3.2） */
.block--conflict {
  background: rgba(211, 47, 47, 0.08);
  border-color: rgba(211, 47, 47, 0.45);
}

.block--conflict .block__name {
  color: #d33;
  font-weight: 700;
}

.block__name {
  font-size: 0.78em;
  font-weight: 600;
  color: var(--text-h);
  line-height: 1.3;
  word-break: break-word;
}

.block__meta {
  font-size: 0.7em;
  color: var(--text);
  word-break: break-word;
}

.block__code {
  font-family: var(--mono);
  font-size: 0.65em;
  color: var(--accent);
}

.dots {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 2px;
}

/* 周次圆点：有课填充、无课描线、冲突方形（PRD §3.3.3） */
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 1px solid currentcolor;
  box-sizing: border-box;
}

.dot--on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent);
}

.dot--off {
  color: var(--border);
  background: transparent;
}

.dot--conflict {
  border-radius: 0;
  background: #d33;
  border-color: #d33;
  color: #d33;
}
</style>
