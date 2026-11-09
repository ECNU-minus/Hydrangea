import { FiltersService, rankByFrequency } from './filters.service.js';
import { seedClasses } from './seed.js';

/** 统计某学期内某字段取值出现的次数（用种子数据作独立参照） */
const countIn = (
  semester: string,
  key: 'courseType' | 'courseNature' | 'department',
  value: string,
) =>
  seedClasses.filter((c) => c.semester === semester && c[key] === value).length;

/** 某学期某字段的实际取值集合（升序） */
const distinctIn = (
  semester: string,
  key: 'courseType' | 'courseNature' | 'department',
) =>
  [
    ...new Set(
      seedClasses.filter((c) => c.semester === semester).map((c) => c[key]),
    ),
  ].sort((a, b) => a.localeCompare(b));

const EMPTY = { courseTypes: [], courseNatures: [], departments: [] };

describe('rankByFrequency', () => {
  it('去重并按出现次数降序', () => {
    expect(rankByFrequency(['a', 'b', 'b', 'c', 'c', 'c'])).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('空白值不参与统计', () => {
    expect(rankByFrequency(['通识', '  ', '', '通识', '专业'])).toEqual([
      '通识',
      '专业',
    ]);
  });

  it('同次数时按名称升序，不依赖输入顺序', () => {
    expect(rankByFrequency(['专业', '通识'])).toEqual(['通识', '专业']);
    expect(rankByFrequency(['通识', '专业'])).toEqual(['通识', '专业']);
  });

  it('空数组返回空数组', () => {
    expect(rankByFrequency([])).toEqual([]);
  });
});

describe('FiltersService', () => {
  const service = new FiltersService();
  const SEMESTER = '2026-2027-1';

  it('三项选项取自该学期数据，按出现次数降序', () => {
    const options = service.queryFiltersBySemester(SEMESTER);

    expect(options.courseTypes).toEqual(['通识', '专业']); // 21 : 15
    expect(options.courseNatures).toEqual(['必修', '选修']); // 20 : 16

    const counts = options.departments.map((d) =>
      countIn(SEMESTER, 'department', d),
    );
    // 频次单调不增
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(options.departments[0]).toBe('传播学院'); // 13 条，出现最多
  });

  it('选项与数据中的实际取值集合完全一致（不增不减）', () => {
    const options = service.queryFiltersBySemester(SEMESTER);

    expect(options.departments.length).toBe(19);
    expect([...options.departments].sort((a, b) => a.localeCompare(b))).toEqual(
      distinctIn(SEMESTER, 'department'),
    );
    expect([...options.courseTypes].sort((a, b) => a.localeCompare(b))).toEqual(
      distinctIn(SEMESTER, 'courseType'),
    );
    expect(
      [...options.courseNatures].sort((a, b) => a.localeCompare(b)),
    ).toEqual(distinctIn(SEMESTER, 'courseNature'));
  });

  it('选项随学期变化', () => {
    const nextOptions = service.queryFiltersBySemester('2026-2027-2');
    expect(nextOptions.departments.length).toBe(6);
    expect(nextOptions.departments).toContain('音乐学院'); // 仅该学期出现
    // 与 2026-2027-1 的 19 项不同，且与该学期实际取值完全一致
    expect([...nextOptions.departments].sort((a, b) => a.localeCompare(b))).toEqual(
      distinctIn('2026-2027-2', 'department'),
    );

    expect(
      service.queryFiltersBySemester('2025-2026-1').departments,
    ).toContain('哲学系');
  });

  it('不返回培养层次选项（固定三个，由前端维护）', () => {
    expect(Object.keys(service.queryFiltersBySemester(SEMESTER)).sort()).toEqual(
      ['courseNatures', 'courseTypes', 'departments'],
    );
  });

  it('学期缺失或不可用时返回空选项', () => {
    expect(service.queryFiltersBySemester('')).toEqual(EMPTY);
    expect(service.queryFiltersBySemester('9999-9999-9')).toEqual(EMPTY);
    expect(
      service.queryFiltersBySemester(undefined as unknown as string),
    ).toEqual(EMPTY);
  });

  it('每次返回的数组互不共享（调用方改动不污染下次结果）', () => {
    const first = service.queryFiltersBySemester('');
    first.courseTypes.push('污染');
    expect(service.queryFiltersBySemester('').courseTypes).toEqual([]);
  });
});
