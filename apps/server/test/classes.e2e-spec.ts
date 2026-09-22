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
      .query({ semester: '2026-2027-1' })
      .expect(200);

    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.items.length).toBe(res.body.total);
    // 校验升序
    const codes = res.body.items.map((i: { classCode: string }) => i.classCode);
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
  });

  it('关键词搜索命中课程名称', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', keyword: '数据结构' })
      .expect(200);

    expect(res.body.total).toBe(2); // A001、A002 都是数据结构
    expect(res.body.items.every((i: { courseName: string }) => i.courseName.includes('数据结构'))).toBe(true);
  });

  it('关键词匹配所有文本字段（含备注）', async () => {
    // A001 出现在 A001 的 classCode、A002 与 H001 的 remark 中，共命中 3 条
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', keyword: 'A001' })
      .expect(200);

    expect(res.body.total).toBe(3);
    const codes = res.body.items.map((i: { classCode: string }) => i.classCode);
    expect(codes).toContain('A001');
    expect(codes).toContain('A002');
    expect(codes).toContain('H001');
  });

  it('关键词单独命中教学班代码', async () => {
    // E001 只出现在自己的 classCode 中，备注无引用，恰好命中 1 条
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', keyword: 'E001' })
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].classCode).toBe('E001');
  });

  it('按培养层次筛选', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', level: '研究生' })
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].classCode).toBe('E001');
  });

  it('按开课部门筛选', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', department: '计算机科学与技术学院' })
      .expect(200);

    // A001、A002、E001、H001、I001 共 5 条
    expect(res.body.total).toBe(5);
  });

  it('分页生效', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', page: 1, pageSize: 3 })
      .expect(200);

    expect(res.body.items.length).toBe(3);
    expect(res.body.total).toBe(10);
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