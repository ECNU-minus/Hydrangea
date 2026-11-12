/**
 * 后端课程查询 API 客户端
 *
 * 对应后端 `apps/server/src/classes.service.ts` 的查询接口 `GET /api/classes`。
 * 类型定义与后端响应保持一致（DESIGN.md §3.2）。
 */

/** 单段上课时间（DESIGN.md §2.2） */
export interface Schedule {
  /** 星期几（1=周一 … 7=周日） */
  day: number;
  /** 节次区间起点（1–14，含端点） */
  start: number;
  /** 节次区间终点（1–14，含端点） */
  end: number;
  /** 该时间段的上课地点 */
  location: string;
}

/** 查询参数（DESIGN.md §3.2） */
export interface QueryClassesParams {
  /** 学期标识（必填） */
  semester: string;
  /** 关键词（模糊匹配所有文本字段） */
  keyword?: string;
  /** 课程类型筛选（多选，同一项内为「或」） */
  courseType?: string[];
  /** 课程性质筛选（多选，同一项内为「或」） */
  courseNature?: string[];
  /** 开课部门筛选（多选，同一项内为「或」） */
  department?: string[];
  /** 培养层次筛选（多选，同一项内为「或」） */
  level?: string[];
  /** 页码（默认 1） */
  page?: number;
  /** 每页条数（默认 20） */
  pageSize?: number;
}

/** 响应中的单条教学班（不含仅筛选字段，PRD §3.1.2） */
export interface ClassItem {
  classCode: string;
  courseCode: string;
  courseName: string;
  totalHours: number;
  credits: number;
  teacher: string;
  schedule: Schedule[];
  weeks: number[];
  level: string;
  teachingComposition: string;
  remark: string;
  syllabusUrl: string;
}

/** 分页响应（DESIGN.md §3.2） */
export interface QueryClassesResult {
  total: number;
  page: number;
  pageSize: number;
  items: ClassItem[];
}

/** 查询教学班（GET /api/classes） *//** 查询教学班（GET /api/classes） */
export async function queryClasses(
  params: QueryClassesParams,
): Promise<QueryClassesResult> {
  const url = new URL('/api/classes', window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    // 多选筛选以「重复查询参数」传递（DESIGN.md §3.2）；空数组表示该项不限，直接省略
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== '') url.searchParams.append(key, String(v));
      }
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`查询课程失败：HTTP ${res.status}`);
  }
  return (await res.json()) as QueryClassesResult;
}

/**
 * 查询单个教学班（GET /api/classes/:classCode?semester=，DESIGN §3.5）
 *
 * 教学班代码跨学期重复，故必须带学期。该学期查不到时后端返回 404，
 * 这里转成 `null`——意向列表据此渲染占位条目（PRD §3.2.8）。
 */
export async function queryClass(semester: string, classCode: string): Promise<ClassItem | null> {
  const url = new URL(`/api/classes/${encodeURIComponent(classCode)}`, window.location.origin);
  url.searchParams.set('semester', semester);

  const res = await fetch(url.toString());
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`获取教学班失败：HTTP ${res.status}`);
  }

  return (await res.json()) as ClassItem;
}