import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

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
});