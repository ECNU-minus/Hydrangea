import {
  SemestersService,
  currentSemester,
  parseSemester,
  semesterContains,
  sortSemestersDesc,
} from './semesters.service.js';
import { seedSemesters } from './seed.js';

/** 构造本地时间日期（月份从 0 开始，便于书写边界） */
const date = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12, 0, 0);

describe('parseSemester', () => {
  it('解析合法的学期标识', () => {
    expect(parseSemester('2026-2027-1')).toEqual({ startYear: 2026, endYear: 2027, half: 1 });
    expect(parseSemester('2026-2027-2')).toEqual({ startYear: 2026, endYear: 2027, half: 2 });
    expect(parseSemester(' 2025-2026-1 ')).toEqual({ startYear: 2025, endYear: 2026, half: 1 });
  });

  it('非法格式返回 null', () => {
    expect(parseSemester('')).toBeNull();
    expect(parseSemester('2026-2027')).toBeNull();
    expect(parseSemester('2026-2027-3')).toBeNull();
    expect(parseSemester('2026-2028-1')).toBeNull(); // 结束学年必须为起始学年 + 1
    expect(parseSemester('abc')).toBeNull();
  });
});

describe('semesterContains', () => {
  it('第一学期为 9/1 至次年 1/31', () => {
    expect(semesterContains('2026-2027-1', date(2026, 9, 1))).toBe(true);
    expect(semesterContains('2026-2027-1', date(2027, 1, 31))).toBe(true);
    expect(semesterContains('2026-2027-1', date(2026, 8, 31))).toBe(false);
    expect(semesterContains('2026-2027-1', date(2027, 2, 1))).toBe(false);
  });

  it('第二学期为 2/1 至 7/31', () => {
    expect(semesterContains('2026-2027-2', date(2027, 2, 1))).toBe(true);
    expect(semesterContains('2026-2027-2', date(2027, 7, 31))).toBe(true);
    expect(semesterContains('2026-2027-2', date(2027, 8, 1))).toBe(false);
    expect(semesterContains('2026-2027-2', date(2026, 11, 9))).toBe(false);
  });

  it('非法学期标识不包含任何日期', () => {
    expect(semesterContains('9999-9999-9', date(2026, 11, 9))).toBe(false);
  });
});

describe('sortSemestersDesc', () => {
  it('按学期先后倒序排列', () => {
    expect(
      sortSemestersDesc(['2025-2026-1', '2026-2027-2', '2025-2026-2', '2026-2027-1']),
    ).toEqual(['2026-2027-2', '2026-2027-1', '2025-2026-2', '2025-2026-1']);
  });

  it('不修改入参', () => {
    const input = ['2025-2026-1', '2026-2027-1'];
    sortSemestersDesc(input);
    expect(input).toEqual(['2025-2026-1', '2026-2027-1']);
  });
});

describe('currentSemester', () => {
  it('取包含今天的学期（2026-11-09 属于 2026-2027-1）', () => {
    expect(currentSemester(seedSemesters, date(2026, 11, 9))).toBe('2026-2027-1');
    expect(currentSemester(seedSemesters, date(2027, 3, 15))).toBe('2026-2027-2');
  });

  it('没有学期包含该日期时回退到最新学期', () => {
    // 8 月为学期之间的假期
    expect(currentSemester(seedSemesters, date(2027, 8, 15))).toBe('2026-2027-2');
    expect(currentSemester(seedSemesters, date(2030, 5, 1))).toBe('2026-2027-2');
  });

  it('列表为空时返回空串', () => {
    expect(currentSemester([], date(2026, 11, 9))).toBe('');
  });
});

describe('SemestersService', () => {
  const service = new SemestersService();

  it('返回按倒序排列的可用学期与当前学期', () => {
    const result = service.list(date(2026, 11, 9));

    expect(result.semesters).toEqual([
      '2026-2027-2',
      '2026-2027-1',
      '2025-2026-2',
      '2025-2026-1',
    ]);
    expect(result.current).toBe('2026-2027-1');
  });

  it('可用学期覆盖种子数据的全部学期', () => {
    const result = service.list(date(2026, 11, 9));

    expect([...result.semesters].sort((a, b) => a.localeCompare(b))).toEqual(
      [...seedSemesters].sort((a, b) => a.localeCompare(b)),
    );
  });
});
