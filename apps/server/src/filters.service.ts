import { Injectable } from '@nestjs/common';
import { seedClasses } from './seed.js';

/** 筛选项响应（DESIGN §3.3） */
export interface FilterOptions {
    /** 课程类型选项 */
    courseTypes: string[];
    /** 课程性质选项 */
    courseNatures: string[];
    /** 开课部门选项 */
    departments: string[];
}

/**
 * 按出现次数归类（纯函数）
 *
 * 去重并统计出现次数：出现次数降序，同次数按名称升序（中文按拼音比较）。
 * 空白值不参与统计。
 */
export function rankByFrequency(values: string[]): string[] {
    const counts = new Map<string, number>();
    for (const value of values) {
        const key = value.trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
        .map(([value]) => value);
}

/** 空筛选项（学期不可用时返回，每次返回新对象避免共享可变数组） */
function emptyOptions(): FilterOptions {
    return { courseTypes: [], courseNatures: [], departments: [] };
}

@Injectable()
export class FiltersService {
    /**
     * 获取指定学期的筛选项（PRD §6.2：三项选项随数据自动适应）
     *
     * - 三项选项均取自该学期数据中**实际出现过的值**，不手工维护；
     * - 排序：出现次数降序，同次数按名称升序；
     * - 培养层次**不在本接口返回**（固定三个，由前端维护，DESIGN §3.3）；
     * - 学期缺失或该学期无数据时返回空选项。
     */
    queryFiltersBySemester(semester: string): FilterOptions {
        const classes = seedClasses.filter((cls) => cls.semester === semester);
        if (classes.length === 0) return emptyOptions();

        return {
            courseTypes: rankByFrequency(classes.map((c) => c.courseType)),
            courseNatures: rankByFrequency(classes.map((c) => c.courseNature)),
            departments: rankByFrequency(classes.map((c) => c.department)),
        };
    }
}
