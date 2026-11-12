import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { INTENT_LIMIT, intentCodes, toggleIntent, type ToggleResult } from '../core/marks'
import { addMark, deleteMark, listMarks, type IntentMark } from '../storage/db'

/**
 * 标记状态（DESIGN §4.3 markStore）
 *
 * 标记按学期隔离：教学班代码跨学期会重复，故本地存储以 `[semester, classCode]` 为键，
 * store 只持有**当前学期**的标记（PRD §3.2.1）。
 */
export const useMarkStore = defineStore('marks', () => {
  /** 标记所属学期 */
  const semester = ref('')
  /** 当前学期的标记列表（按打标时间升序） */
  const marks = ref<IntentMark[]>([])
  /** 正在读取本地存储 */
  const loading = ref(false)
  /** 本地存储不可用等错误提示 */
  const error = ref('')
  /** 达到上限时的一次性提示 */
  const limitNotice = ref('')

  /** 已打意向标记的教学班代码 */
  const intents = computed(() => intentCodes(marks.value))

  /** 意向数量 */
  const intentCount = computed(() => intents.value.length)

  /** 某教学班是否已打意向标记 */
  function hasIntent(classCode: string): boolean {
    return intents.value.includes(classCode)
  }

  /** 读取某学期的标记；读取失败只提示，不阻塞查询 */
  async function load(target: string): Promise<void> {
    semester.value = target
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

  /** 落库：添加或删除单条（失败只提示，内存状态保留） */
  async function persist(result: ToggleResult, classCode: string): Promise<void> {
    const current = result.next.find((mark) => mark.classCode === classCode)

    try {
      if (current) {
        await addMark(current)
      } else {
        await deleteMark(semester.value, classCode)
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

  /** 场景变化（如切换学期）时清除一次性提示 */
  function clearNotice(): void {
    limitNotice.value = ''
  }

  return {
    semester,
    marks,
    loading,
    error,
    limitNotice,
    intents,
    intentCount,
    hasIntent,
    load,
    toggleIntentOf,
    clearNotice,
  }
})
