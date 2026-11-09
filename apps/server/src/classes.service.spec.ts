import { ClassesService, normalizeFilter } from './classes.service.js';

describe('normalizeFilter', () => {
  it('未传参数返回空数组（表示不限）', () => {
    expect(normalizeFilter(undefined)).toEqual([]);
  });

  it('空串与纯空白视为不限', () => {
    expect(normalizeFilter('')).toEqual([]);
    expect(normalizeFilter('   ')).toEqual([]);
    expect(normalizeFilter(['', '  '])).toEqual([]);
  });

  it('单值包装为数组并去除首尾空白', () => {
    expect(normalizeFilter(' 本科生 ')).toEqual(['本科生']);
  });

  it('多值保持原顺序', () => {
    expect(normalizeFilter(['传播学院', '地理科学学院'])).toEqual([
      '传播学院',
      '地理科学学院',
    ]);
  });

  it('重复值与空值被剔除', () => {
    expect(normalizeFilter(['通识', ' 通识 ', '', '专业'])).toEqual(['通识', '专业']);
  });
});

describe('ClassesService 多值筛选', () => {
  const service = new ClassesService();
  const SEMESTER = '2026-2027-1';

  const codes = (params: Parameters<ClassesService['query']>[0]) =>
    service.query({ semester: SEMESTER, pageSize: 100, ...params }).items.map(
      (i) => i.classCode,
    );

  it('单值传法与多值传法结果一致', () => {
    expect(codes({ department: '传播学院' })).toEqual(codes({ department: ['传播学院'] }));
  });

  it('同一项内多值取「或」，结果按教学班代码升序', () => {
    const result = codes({ department: ['传播学院', '地理科学学院'] });
    expect(result.length).toBe(16);
    const sorted = [...result].sort((a, b) => a.localeCompare(b));
    expect(result).toEqual(sorted);
  });

  it('不同项之间取「与」', () => {
    const single = codes({ department: '传播学院', courseNature: ['选修'] });
    expect(single.length).toBe(6);
    // 与「仅部门筛选」的结果应是子集
    const byDepartments = codes({ department: ['传播学院', '地理科学学院'] });
    expect(byDepartments).toEqual(expect.arrayContaining(single));
  });

  it('多维度多值组合', () => {
    const result = codes({
      courseType: ['通识'],
      courseNature: ['必修', '选修'],
      department: ['传播学院', '地理科学学院'],
    });
    expect(result.length).toBe(6);
  });

  it('互斥组合返回空结果', () => {
    // 历史学系两条均为「专业」
    expect(codes({ department: ['历史学系'], courseType: ['通识'] })).toEqual([]);
  });

  it('空数组与空串均表示该项不限', () => {
    const all = codes({});
    expect(codes({ department: [] })).toEqual(all);
    expect(codes({ courseType: ['', '  '] })).toEqual(all);
  });

  it('多值不改变未匹配任何值时返回空结果的行为', () => {
    expect(codes({ department: ['不存在的学院', '也不存在'] })).toEqual([]);
  });
});
