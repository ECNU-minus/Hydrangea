import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('ClassesController (e2e) · 单个教学班', () => {
  let app: INestApplication;
  let semester: string;
  let classCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api'); // 与 main.ts 保持一致
    await app.init();

    const list = await request(app.getHttpServer())
      .get('/api/classes')
      .query({ semester: '2026-2027-1', pageSize: 1 })
      .expect(200);
    semester = '2026-2027-1';
    classCode = list.body.items[0].classCode;
  });

  afterAll(async () => {
    await app.close();
  });

  it('命中时返回单个教学班详情', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/classes/${classCode}`)
      .query({ semester })
      .expect(200);

    expect(res.body.classCode).toBe(classCode);
    expect(typeof res.body.courseName).toBe('string');
    expect(res.body.syllabusUrl).toContain('byyt.ecnu.edu.cn');
  });

  it('缺少 semester 时返回 400', async () => {
    const res = await request(app.getHttpServer()).get(`/api/classes/${classCode}`).expect(400);

    expect(String(res.body.message)).toContain('semester');
  });

  it('该学期无此教学班时返回 404', async () => {
    await request(app.getHttpServer())
      .get('/api/classes/NOT-EXIST-99')
      .query({ semester })
      .expect(404);
  });

  it('教学班代码从别的学期查不到（跨学期隔离）', async () => {
    await request(app.getHttpServer())
      .get(`/api/classes/${classCode}`)
      .query({ semester: '2025-2026-2' })
      .expect(404);
  });
});
