import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { seedClasses } from './../src/seed.js';

/** 拼接重复查询参数（形如 `department=A&department=B`，与前端多选筛选的请求形态一致） */
const repeated = (key: string, values: string[]) =>
  values.map((v) => `${key}=${encodeURIComponent(v)}`).join('&');

/** 按学期 + 条件推导期望的教学班代码（升序），与接口的学期过滤行为一致 */
const expectedCodesIn = (
  semester: string,
  match: (c: (typeof seedClasses)[number]) => boolean,
) =>
  seedClasses
    .filter((c) => c.semester === semester && match(c))
    .map((c) => c.classCode)
    .sort((a, b) => a.localeCompare(b));

describe('ClassesController (e2e)', () => {
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

  it('返回全部课程（按教学班代码升序）', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', pageSize: 100 })
      .expect(200);

    expect(res.body.total).toBe(36);
    expect(res.body.items.length).toBe(res.body.total);
    // 校验升序
    const codes = res.body.items.map((i: { classCode: string }) => i.classCode);
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
  });

  it('关键词搜索命中课程名称', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', keyword: '地理科学导论' })
      .expect(200);

    expect(res.body.total).toBe(2); // GEOG1101.01、GEOG1101.02 都是地理科学导论
    expect(res.body.items.every((i: { courseName: string }) => i.courseName.includes('地理科学导论'))).toBe(true);
  });

  it('关键词匹配所有文本字段（含教学组成）', async () => {
    // GEOG1101 出现在 GEOG1101.01、GEOG1101.02 的 classCode 与 courseCode 中，共命中 2 条
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', keyword: 'GEOG1101' })
      .expect(200);

    expect(res.body.total).toBe(2);
    const codes = res.body.items.map((i: { classCode: string }) => i.classCode);
    expect(codes).toContain('GEOG1101.01');
    expect(codes).toContain('GEOG1101.02');
  });

  it('关键词单独命中教学班代码', async () => {
    // CHEM1113.01 只出现在自己的 classCode 中（courseCode 为 CHEM1113），恰好命中 1 条
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', keyword: 'CHEM1113.01' })
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].classCode).toBe('CHEM1113.01');
  });

  it('按培养层次筛选', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', level: '本科生' })
      .expect(200);

    expect(res.body.total).toBe(36); // 种子数据全部为本科生
  });

  it('按开课部门筛选', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', department: '传播学院' })
      .expect(200);

    // 传播学院共 13 条
    expect(res.body.total).toBe(13);
  });

  it('分页生效', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', page: 1, pageSize: 3 })
      .expect(200);

    expect(res.body.items.length).toBe(3);
    expect(res.body.total).toBe(36);
  });

  it('响应不含仅筛选字段（courseType/courseNature/department）', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1' })
      .expect(200);

    const item = res.body.items[0];
    expect(item).not.toHaveProperty('courseType');
    expect(item).not.toHaveProperty('courseNature');
    expect(item).not.toHaveProperty('department');
  });

  it('响应包含 syllabusUrl', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1' })
      .expect(200);

    expect(res.body.items[0].syllabusUrl).toMatch(/\/form\/\d+$/);
  });

  it('无效学期返回空结果', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '9999-9999-9' })
      .expect(200);

    expect(res.body.total).toBe(0);
    expect(res.body.items).toEqual([]);
  });

  it('多选筛选：同一项内多值为「或」（重复查询参数）', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/api/classes?semester=2026-2027-1&pageSize=100&${repeated('department', [
          '传播学院',
          '地理科学学院',
        ])}`,
      )
      .expect(200);

    // 传播学院 13 + 地理科学学院 3
    expect(res.body.total).toBe(16);
    expect(res.body.items.map((i: { classCode: string }) => i.classCode)).toEqual(
      expectedCodesIn(
        '2026-2027-1',
        (c) => c.department === '传播学院' || c.department === '地理科学学院',
      ),
    );
  });

  it('多选筛选：不同项之间为「与」', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/api/classes?semester=2026-2027-1&pageSize=100&courseNature=${encodeURIComponent(
          '选修',
        )}&${repeated('department', ['传播学院', '地理科学学院'])}`,
      )
      .expect(200);

    expect(res.body.total).toBe(6); // 传播学院选修 6 条，地理科学学院无选修
    expect(res.body.items.map((i: { classCode: string }) => i.classCode)).toEqual(
      expectedCodesIn(
        '2026-2027-1',
        (c) =>
          c.courseNature === '选修' &&
          (c.department === '传播学院' || c.department === '地理科学学院'),
      ),
    );
  });

  it('多选筛选：多维度多值组合', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/api/classes?semester=2026-2027-1&pageSize=100&courseType=${encodeURIComponent(
          '通识',
        )}&${repeated('courseNature', ['必修', '选修'])}&${repeated('department', [
          '传播学院',
          '地理科学学院',
        ])}`,
      )
      .expect(200);

    expect(res.body.total).toBe(6);
  });

  it('多选筛选：空值与重复值被忽略', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/api/classes?semester=2026-2027-1&pageSize=100&courseType=&${repeated(
          'courseType',
          ['通识', '通识', ''],
        )}`,
      )
      .expect(200);

    expect(res.body.total).toBe(21); // 通识 21 条，重复与空值不影响结果
  });

  it('多选筛选：互斥组合返回空结果', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/api/classes?semester=2026-2027-1&${repeated('department', [
          '历史学系',
        ])}&${repeated('courseType', ['通识'])}`,
      )
      .expect(200);

    expect(res.body.total).toBe(0);
  });

  it('按学期过滤：仅返回该学期的教学班', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2025-2026-1', pageSize: 100 })
      .expect(200);

    expect(res.body.total).toBe(5);
    expect(
      res.body.items.every((i: { classCode: string }) =>
        expectedCodesIn('2025-2026-1', () => true).includes(i.classCode),
      ),
    ).toBe(true);
  });

  it('教学班代码跨学期重复：同一代码在不同学期各自独立返回', async () => {
    // COMM1502.01 在 2026-2027-1 / 2026-2027-2 / 2025-2026-2 / 2025-2026-1 均存在
    const semesters = ['2026-2027-1', '2026-2027-2', '2025-2026-2', '2025-2026-1'];

    for (const semester of semesters) {
      const res = await request(app.getHttpServer())
        .get('/api/classes')
        .query({ semester, keyword: 'COMM1502.01' })
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.items[0].classCode).toBe('COMM1502.01');
    }
  });
});