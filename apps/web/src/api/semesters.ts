/**
 * 学期 API 客户端
 *
 * 对应后端 `GET /api/semesters`（DESIGN.md §3.1）。
 */

/** 学期列表响应 */
export interface SemestersResponse {
  /** 可用学期，最新在前 */
  semesters: string[]
  /** 当前学期（包含今天的学期；无匹配时为最新学期） */
  current: string
}

/** 获取可用学期列表与当前学期 */
export async function querySemesters(): Promise<SemestersResponse> {
  const res = await fetch('/api/semesters')
  if (!res.ok) {
    throw new Error(`获取学期列表失败：HTTP ${res.status}`)
  }
  return (await res.json()) as SemestersResponse
}
