import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { queryClass, type ClassItem } from '../api/classes'
import {
  INTENT_LIMIT,
  intentCodes,
  multiClassCourseCodes,
  sortByAddedAt,
  splitPlaceholders,
  toggleIntent,
  type IntentEntry,
  type ToggleResult,
} from '../core/marks'
import { addMark, deleteMark, listMarks, type IntentMark } from '../storage/db'

/**
 * 标记状态（DESIGN §4.3 markStore）
 *
 * 标记按学期隔离：教学班代码跨学期会重复，故本地存储以 `[semester, classCode]` 为键，
 * store 只持有**当前学期**的标记（PRD §3.2.1）。
 * 标记只记录教学班代码与时间，展示所需的课程信息按需回查后端（DESIGN §3.5）。
 */
export const useMarkStore = defineStore('marks', () => {
  /** 标记所属学期 */
  const semester = ref('')
  /** 当前学期的标记列表（按打标时间升序） */
  const marks = ref<IntentMark[]>([])
  /** 教学班详情缓存：`undefined` = 未解析，`null` = 数据中不存在（占位条目） */
  const details = ref<Record<string, ClassItem | null>>({})
  /** 正在读取本地存储 */
  const loading = ref(false)
  /** 正在回查教学班详情 */
  const detailsLoading = ref(false)
  /** 本地存储不可用等错误提示 */
  const error = ref('')
  /** 达到上限时的一次性提示 */
  const limitNotice = ref('')

  /** 已打意向标记的教学班代码 */
  const intents = computed(() => intentCodes(marks.value))

  /** 意向数量 */
  const intentCount = computed(() => intents.value.length)

  /** 某教学班的展示信息：`undefined` = 未解析，`null` = 数据中不存在 */
  function courseOf(classCode: string): IntentEntry['course'] {
    if (!(classCode in details.value)) return undefined
    const detail = details.value[classCode]

    return detail ? { courseCode: detail.courseCode, courseName: detail.courseName } : null
  }

  /** 意向列表条目（按添加时间升序，附带已解析的课程信息） */
  const intentEntries = computed<IntentEntry[]>(() =>
    sortByAddedAt(marks.value)
      .filter((mark) => mark.intent)
      .map((mark) => ({
        classCode: mark.classCode,
        addedAt: mark.addedAt,
        course: courseOf(mark.classCode),
      })),
  )

  /** 被打标了多个教学班的课程代码（PRD §3.2.6） */
  const multiClassCourses = computed(() => multiClassCourseCodes(intentEntries.value))

  /** 按 PRD §3.2.8 分组的意向条目 */
  const intentGroups = computed(() => splitPlaceholders(intentEntries.value))

  /** 某教学班是否已打意向标记 */
  function hasIntent(classCode: string): boolean {
    return intents.value.includes(classCode)
  }

  /** 读取某学期的标记；读取失败只提示，不阻塞查询 */
  async function load(target: string): Promise<void> {
    semester.value = target
    details.value = {}
    loading.value = true
    error.value = ''
    try {
      marks.value = await listMarks(target)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '本地标记读取失败'
      marks.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 回查尚未解析的教学班详情
   *
   * 后端 404 → 记为 `null`（占位条目，PRD §3.2.8）；请求失败 → 保持未解析，下次再试。
   */
  async function resolveDetails(): Promise<void> {
    const target = semester.value
    const missing = marks.value
      .map((mark) => mark.classCode)
      .filter((classCode) => !(classCode in details.value))

    if (missing.length === 0) return

    detailsLoading.value = true
    const results = await Promise.allSettled(missing.map((code) => queryClass(target, code)))

    // 期间切换了学期：丢弃这批结果
    if (target !== semester.value) {
      detailsLoading.value = false
      return
    }

    const next = { ...details.value }
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') next[missing[index]] = result.value
    })
    details.value = next
    detailsLoading.value = false
  }

  /** 落库：添加或删除单条（失败只提示，内存状态保留） */
  async function persist(result: ToggleResult, classCode: string): Promise<void> {
    const current = result.next.find((mark) => mark.classCode === classCode)

    try {
      if (current) {
        await addMark(current)
      } else {
        await deleteMark(semester.value, classCode)
        delete details.value[classCode]
      }
      error.value = ''
    } catch (e) {
      error.value = e instanceof Error ? e.message : '本地标记保存失败'
    }
  }

  /** 切换某教学班的意向标记（点击即生效，无确认框，PRD §3.2.4） */
  async function toggleIntentOf(classCode: string): Promise<void> {
    const result = toggleIntent(marks.value, semester.value, classCode, Date.now())

    if (result.blocked) {
      limitNotice.value = `意向最多 ${INTENT_LIMIT} 门课，已达上限，无法继续添加`
      return
    }

    limitNotice.value = ''
    marks.value = result.next
    await persist(result, classCode)
  }

  /** 移除意向（意向列表中直接移除，PRD §3.2.8） */
  async function removeIntent(classCode: string): Promise<void> {
    if (hasIntent(classCode)) await toggleIntentOf(classCode)
  }

  /** 场景变化（如切换学期）时清除一次性提示 */
  function clearNotice(): void {
    limitNotice.value = ''
  }

  return {
    semester,
    marks,
    details,
    loading,
    detailsLoading,
    error,
    limitNotice,
    intents,
    intentCount,
    intentEntries,
    intentGroups,
    multiClassCourses,
    hasIntent,
    load,
    resolveDetails,
    toggleIntentOf,
    removeIntent,
    clearNotice,
  }
})
