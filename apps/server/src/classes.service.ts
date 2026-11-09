import { Injectable } from '@nestjs/common';
import { seedClasses, seedSemesters, type SeedClass, type SeedSchedule} from './seed.js';

/**
 * 单项筛选参数
 *
 * 兼容三种传法：单值（`?level=本科生`）、重复查询参数（`?level=本科生&level=研究生`）、
 * 数组（服务间直接调用）。同一项内多值为「或」，不同项之间为「与」（PRD §3.1.2）。
 */
export type FilterParam = string | string[] | undefined;

/** 查询参数 */
export interface QueryClassesParams {
    /** 学期标识（必填） */
    semester: string;
    /** 关键词（模糊匹配所有文本字段） */
    keyword?: string;
    /** 课程类型筛选（多值） */
    courseType?: FilterParam;
    /** 课程性质筛选（多值） */
    courseNature?: FilterParam;
    /** 开课部门筛选（多值） */
    department?: FilterParam;
    /** 培养层次筛选（多值） */
    level?: FilterParam;
    /** 页码（默认 1） */
    page?: number;
    /** 每页条数（默认 20） */
    pageSize?: number;
}

/**
 * 归一化单项筛选参数（纯函数）
 *
 * 将单值 / 重复参数 / 数组统一为字符串数组，并剔除空串、空白与重复值。
 * 返回**空数组**表示该项不限（等同于未传该参数）。
 */
export function normalizeFilter(value: FilterParam): string[] {
    if (value === undefined || value === null) return [];

    const raw = Array.isArray(value) ? value : [value];
    const cleaned = raw
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter((v) => v !== '');

    return [...new Set(cleaned)];
}

/** 响应中的单条教学班（不含仅筛选字段） */
export interface ClassItem {
    classCode: string;
    courseCode: string;
    courseName: string;
    totalHours: number;
    credits: number;
    teacher: string;
    schedule: SeedSchedule[];
    weeks: number[];
    level: string;
    teachingComposition: string;
    remark: string;
    syllabusUrl: string;
}

/** 分页响应 */
export interface QueryClassesResult {
    total: number;
    page: number;
    pageSize: number;
    items: ClassItem[];
}

/** 课程大纲链接前缀（PRD §3.1.5） */
const SYLLABUS_URL_PREFIX =
    'https://byyt.ecnu.edu.cn/student/for-std/lesson-search/teaching-syllabus-zh/page/form/';

@Injectable()
export class ClassesService {
    /**
     * 查询教学班（PRD §3.1）
     * - 关键词模糊匹配所有文本字段
     * - 仅支持四项筛选：课程类型、课程性质、开课部门、培养层次（每项均可多选）
     * - 固定按教学班代码升序
     * - 分页
     */
    query(params: QueryClassesParams): QueryClassesResult {
        const {
            semester,
            keyword,
            courseType,
            courseNature,
            department,
            level,
            page = 1,
            pageSize = 20,
        } = params;

        // 1. 学期过滤（DESIGN §2.1/§2.5）：仅返回该学期的教学班；
        //    学期不在可用列表中时返回空结果。
        if (!seedSemesters.includes(semester)) {
            return { total: 0, page, pageSize, items: [] };
        }

        let list = seedClasses.filter((c) => c.semester === semester);

        // 2. 关键词模糊匹配所有文本字段（PRD §3.1. 1）
        const kw = keyword?.trim().toLowerCase();
        if (kw) {
            list = list.filter((c) => this.matchKeyword(c, kw));
        }

        // 3. 四项筛选（PRD §3.1.2）：同一项内多值取「或」，不同项之间取「与」；
        //    归一化后为空数组即该项不限。
        const courseTypes = normalizeFilter(courseType);
        const courseNatures = normalizeFilter(courseNature);
        const departments = normalizeFilter(department);
        const levels = normalizeFilter(level);

        if (courseTypes.length) list = list.filter((c) => courseTypes.includes(c.courseType));
        if (courseNatures.length) list = list.filter((c) => courseNatures.includes(c.courseNature));
        if (departments.length) list = list.filter((c) => departments.includes(c.department));
        if (levels.length) list = list.filter((c) => levels.includes(c.level));

        // 4. 固定按教学班代码升序（PRD §3.1.3）
        list.sort((a, b) => a.classCode.localeCompare(b.classCode));

        // 5. 分页
        const total = list.length;
        const start = (page - 1) * pageSize;
        const paged = list.slice(start, start + pageSize);

        return {
            total,
            page,
            pageSize,
            items: paged.map((c) => this.toItem(c)),
        };
    }

    /** 关键词匹配：命中任一文本字段即算匹配 */
    private matchKeyword(c: SeedClass, kw: string): boolean {
        const haystack = [
            c.classCode,
            c.courseCode,
            c.courseName,
            c.teacher,
            c.level,
            c.courseType,
            c.courseNature,
            c.department,
            c.teachingComposition,
            c.remark,
            ...c.schedule.map((s) => s.location),
        ]
            .join(' ')
            .toLowerCase();
        return haystack.includes(kw);
    }

    /** 转换为响应条目（剔除仅筛选字段，拼接大纲链接） */
    private toItem(c: SeedClass): ClassItem {
        return {
            classCode: c.classCode,
            courseCode: c.courseCode,
            courseName: c.courseName,
            totalHours: c.totalHours,
            credits: c.credits,
            teacher: c.teacher,
            schedule: c.schedule,
            weeks: c.weeks,
            level: c.level,
            teachingComposition: c.teachingComposition,
            remark: c.remark,
            syllabusUrl: `${SYLLABUS_URL_PREFIX}${c.syllabusId}`,
        };
    }
}
