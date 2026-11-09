import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { seedClasses } from './../src/seed.js';

/** 某学期某字段的实际取值集合（升序），作为独立参照 */
const distinctIn = (
  semester: string,
  key: 'courseType' | 'courseNature' | 'department',
) =>
  [
    ...new Set(
      seedClasses.filter((c) => c.semester === semester).map((c) => c[key]),
    ),
  ].sort((a, b) => a.localeCompare(b));

/**
 * 统计某学期内某字段取值的出现次数
 * （用于校验「按出现次数降序」，不依赖 ICU 的同频次排序细节）
 */
const countIn = (
  semester: string,
  key: 'courseType' | 'courseNature' | 'department',
  value: string,
) =>
  seedClasses.filter((c) => c.semester === semester && c[key] === value).length;

describe('FiltersController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api'); // 与 main.ts 保持一致
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('返回三项筛选项，且不含培养层次', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/filters')
      .query({ semester: '2026-2027-1' })
      .expect(200);

    expect(Object.keys(res.body).sort()).toEqual([
      'courseNatures',
      'courseTypes',
      'departments',
    ]);
    expect(res.body.courseTypes).toEqual(['通识', '专业']);
    expect(res.body.courseNatures).toEqual(['必修', '选修']);
    expect(res.body.departments.length).toBe(19);
    expect(res.body.departments[0]).toBe('传播学院'); // 出现 13 次，最多
  });

  it('选项与种子数据中的实际取值完全一致', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/filters')
      .query({ semester: '2026-2027-1' })
      .expect(200);

    const sortZh = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b));
    expect(sortZh(res.body.departments)).toEqual(distinctIn('2026-2027-1', 'department'));
    expect(sortZh(res.body.courseTypes)).toEqual(distinctIn('2026-2027-1', 'courseType'));
    expect(sortZh(res.body.courseNatures)).toEqual(
      distinctIn('2026-2027-1', 'courseNature'),
    );
  });

  it('选项按出现次数降序排列', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/filters')
      .query({ semester: '2026-2027-1' })
      .expect(200);

    const counts = res.body.departments.map((d: string) =>
      countIn('2026-2027-1', 'department', d),
    );
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(counts[0]).toBe(13);
  });

  it('选项按学期生成：切换学期后选项随之变化', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/filters')
      .query({ semester: '2026-2027-2' })
      .expect(200);

    expect(res.body.departments.length).toBe(6);
    expect(res.body.departments).toContain('音乐学院'); // 仅该学期出现
    expect([...res.body.departments].sort((a: string, b: string) => a.localeCompare(b))).toEqual(
      distinctIn('2026-2027-2', 'department'),
    );
  });

  it('学期缺失返回空选项', async () => {
    const res = await request(app.getHttpServer()).get('/api/filters').expect(200);

    expect(res.body).toEqual({
      courseTypes: [],
      courseNatures: [],
      departments: [],
    });
  });

  it('无效学期返回空选项', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/filters')
      .query({ semester: '9999-9999-9' })
      .expect(200);

    expect(res.body).toEqual({
      courseTypes: [],
      courseNatures: [],
      departments: [],
    });
  });
});
