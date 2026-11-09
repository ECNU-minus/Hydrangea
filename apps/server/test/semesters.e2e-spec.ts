import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { seedSemesters } from './../src/seed.js';
import { currentSemester, sortSemestersDesc } from './../src/semesters.service.js';

describe('SemestersController (e2e)', () => {
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

  it('返回可用学期列表与当前学期', async () => {
    const res = await request(app.getHttpServer()).get('/api/semesters').expect(200);

    expect(Object.keys(res.body).sort()).toEqual(['current', 'semesters']);
    expect(res.body.semesters).toEqual(sortSemestersDesc(seedSemesters));
    expect(res.body.semesters.length).toBe(seedSemesters.length);
  });

  it('学期按最新在前排列', async () => {
    const res = await request(app.getHttpServer()).get('/api/semesters').expect(200);

    expect(res.body.semesters[0]).toBe('2026-2027-2');
    expect(res.body.semesters).toEqual(
      [...res.body.semesters].sort((a: string, b: string) => a.localeCompare(b)).reverse(),
    );
  });

  it('当前学期取自可用学期，且为包含今天的学期', async () => {
    const res = await request(app.getHttpServer()).get('/api/semesters').expect(200);

    expect(res.body.semesters).toContain(res.body.current);
    expect(res.body.current).toBe(currentSemester(seedSemesters, new Date()));
  });

  it('每个学期都能据此查询课程（学期与课程数据一致）', async () => {
    const semesters = await request(app.getHttpServer()).get('/api/semesters').expect(200);

    for (const semester of semesters.body.semesters) {
      const res = await request(app.getHttpServer())
        .get('/api/classes')
        .query({ semester, pageSize: 100 })
        .expect(200);

      expect(res.body.total).toBeGreaterThan(0);
      expect(
        res.body.items.every((item: { classCode: string }) => typeof item.classCode === 'string'),
      ).toBe(true);
    }
  });
});
