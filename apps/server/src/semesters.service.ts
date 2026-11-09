import { Injectable } from '@nestjs/common';
import { seedSemesters } from './seed.js';

/** 学期标识解析结果（`YYYY-YYYY+1-N`，N=1 第一学期、N=2 第二学期） */
export interface SemesterParts {
    /** 起始学年（如 2026-2027 的 2026） */
    startYear: number;
    /** 结束学年（如 2026-2027 的 2027） */
    endYear: number;
    /** 学期序号：1 = 第一学期，2 = 第二学期 */
    half: 1 | 2;
}

/** 学期列表响应（DESIGN §3.1） */
export interface SemestersResponse {
    /** 可用学期，按学期先后**倒序**（最新在前） */
    semesters: string[];
    /** 当前学期：包含今天的学期；没有匹配则取最新学期；列表为空时为空串 */
    current: string;
}

const SEMESTER_PATTERN = /^(\d{4})-(\d{4})-([12])$/;

/**
 * 解析学期标识（纯函数）
 *
 * 合法格式为 `起始学年-结束学年-学期序号`，且结束学年必须为起始学年 + 1。
 * 非法格式返回 `null`。
 */
export function parseSemester(semester: string): SemesterParts | null {
    const matched = SEMESTER_PATTERN.exec((semester ?? '').trim());
    if (!matched) return null;

    const startYear = Number(matched[1]);
    const endYear = Number(matched[2]);
    if (endYear !== startYear + 1) return null;

    return { startYear, endYear, half: matched[3] === '1' ? 1 : 2 };
}

/**
 * 学期覆盖的时间区间（含首尾）
 *
 * - 第一学期：起始学年 9/1 – 结束学年 1/31
 * - 第二学期：结束学年 2/1 – 7/31
 */
export function semesterRange(parts: SemesterParts): { start: Date; end: Date } {
    if (parts.half === 1) {
        return {
            start: new Date(parts.startYear, 8, 1, 0, 0, 0, 0),
            end: new Date(parts.endYear, 0, 31, 23, 59, 59, 999),
        };
    }

    return {
        start: new Date(parts.endYear, 1, 1, 0, 0, 0, 0),
        end: new Date(parts.endYear, 6, 31, 23, 59, 59, 999),
    };
}

/** 判断某个日期是否落在该学期内（纯函数） */
export function semesterContains(semester: string, date: Date): boolean {
    const parts = parseSemester(semester);
    if (!parts) return false;

    const { start, end } = semesterRange(parts);
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

/** 学期倒序比较（最新在前）；无法解析的标识退化为字符串比较 */
export function compareSemesterDesc(a: string, b: string): number {
    const partsA = parseSemester(a);
    const partsB = parseSemester(b);
    if (!partsA || !partsB) return a.localeCompare(b);

    return partsB.startYear - partsA.startYear || partsB.half - partsA.half;
}

/** 学期列表倒序（不修改入参） */
export function sortSemestersDesc(semesters: string[]): string[] {
    return [...semesters].sort(compareSemesterDesc);
}

/**
 * 当前学期（PRD §3.6.5）
 *
 * 取包含 `date` 的学期；若没有学期包含该日期（如学期之间的假期），
 * 回退到最新的学期；列表为空时返回空串。
 */
export function currentSemester(semesters: string[], date: Date): string {
    const sorted = sortSemestersDesc(semesters);
    return sorted.find((semester) => semesterContains(semester, date)) ?? sorted[0] ?? '';
}

@Injectable()
export class SemestersService {
    /** 可用学期列表 + 当前学期 */
    list(now: Date = new Date()): SemestersResponse {
        return {
            semesters: sortSemestersDesc(seedSemesters),
            current: currentSemester(seedSemesters, now),
        };
    }
}
