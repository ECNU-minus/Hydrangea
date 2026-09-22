/**
 * 种子数据（seed data）
 *
 * 目的：在爬虫与 SQLite 就绪前，用硬编码的假数据打通后端查询接口，
 * 使前端可以据此开发搜索、筛选、标记、排课等功能。
 *
 * 注意：
 * - 字段结构必须与 docs/DESIGN.md §2.1 数据模型保持一致。
 * - 本文件为临时过渡方案，待爬虫 + SQLite 接入后替换。
 * - 数据覆盖多种场景，便于测试：不同培养层次、课程类型/性质/部门、
 *   连续/不连续/单双周、多段上课时间、以及存在时间冲突的课程。
 */

export interface SeedSchedule {
  /** 星期几（1=周一 … 7=周日） */
  day: number;
  /** 节次区间起点（1–14，含端点） */
  start: number;
  /** 节次区间终点（1–14，含端点） */
  end: number;
  /** 该时间段的上课地点 */
  location: string;
}

export interface SeedClass {
  /** 教学班代码，唯一，默认排序依据 */
  classCode: string;
  /** 课程代码（与大纲 id 无关） */
  courseCode: string;
  /** 课程名称 */
  courseName: string;
  /** 总学时 */
  totalHours: number;
  /** 学分 */
  credits: number;
  /** 授课教师 */
  teacher: string;
  /** 上课时间（多段） */
  schedule: SeedSchedule[];
  /** 实际开课周（可能不连续、可能单/双周） */
  weeks: number[];
  /** 培养层次 */
  level: string;
  /** 课程类型（仅筛选） */
  courseType: string;
  /** 课程性质（仅筛选） */
  courseNature: string;
  /** 开课部门（仅筛选） */
  department: string;
  /** 教学组成 */
  teachingComposition: string;
  /** 备注 */
  remark: string;
  /** 课程大纲 id 参数（用于拼接链接） */
  syllabusId: number;
}

/** 当前可用的学期列表 */
export const seedSemesters: string[] = ['2026-2027-1'];

/** 种子课程数据 */
export const seedClasses: SeedClass[] = [
  {
    classCode: 'A001',
    courseCode: 'CS101',
    courseName: '数据结构',
    totalHours: 48,
    credits: 3,
    teacher: '张三',
    schedule: [{ day: 1, start: 1, end: 2, location: '教 101' }],
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    level: '本科生',
    courseType: '专业',
    courseNature: '必修',
    department: '计算机科学与技术学院',
    teachingComposition: '2026级1班',
    remark: '',
    syllabusId: 100001,
  },
  {
    classCode: 'A002',
    courseCode: 'CS101',
    courseName: '数据结构',
    totalHours: 48,
    credits: 3,
    teacher: '李四',
    schedule: [{ day: 3, start: 6, end: 8, location: '实验楼 302' }],
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    level: '本科生',
    courseType: '专业',
    courseNature: '必修',
    department: '计算机科学与技术学院',
    teachingComposition: '2026级2班',
    remark: '与 A001 为同一课程的不同教学班',
    syllabusId: 100001,
  },
  {
    classCode: 'B001',
    courseCode: 'MATH201',
    courseName: '高等数学（一）',
    totalHours: 64,
    credits: 4,
    teacher: '王五',
    schedule: [
      { day: 1, start: 3, end: 4, location: '教 201' },
      { day: 4, start: 1, end: 2, location: '教 201' },
    ],
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    level: '本科生',
    courseType: '通识',
    courseNature: '必修',
    department: '数学学院',
    teachingComposition: '2026级1班',
    remark: '',
    syllabusId: 100002,
  },
  {
    classCode: 'C001',
    courseCode: 'PHY101',
    courseName: '大学物理',
    totalHours: 48,
    credits: 3,
    teacher: '赵六',
    schedule: [{ day: 2, start: 6, end: 8, location: '物理楼 101' }],
    weeks: [1, 3, 5, 7, 9, 11, 13, 15],
    level: '本科生',
    courseType: '通识',
    courseNature: '选修',
    department: '物理与电子科学学院',
    teachingComposition: '2026级1班',
    remark: '仅单周上课',
    syllabusId: 100003,
  },
  {
    classCode: 'D001',
    courseCode: 'ENG102',
    courseName: '大学英语（二）',
    totalHours: 32,
    credits: 2,
    teacher: '钱七',
    schedule: [{ day: 5, start: 3, end: 4, location: '外语楼 205' }],
    weeks: [2, 4, 6, 8, 10, 12, 14, 16],
    level: '本科生',
    courseType: '通识',
    courseNature: '必修',
    department: '外语学院',
    teachingComposition: '2026级1班',
    remark: '仅双周上课',
    syllabusId: 100004,
  },
  {
    classCode: 'E001',
    courseCode: 'AI501',
    courseName: '机器学习',
    totalHours: 48,
    credits: 3,
    teacher: '孙八',
    schedule: [{ day: 3, start: 1, end: 3, location: '计算机楼 501' }],
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    level: '研究生',
    courseType: '专业',
    courseNature: '选修',
    department: '计算机科学与技术学院',
    teachingComposition: '2026级研究生',
    remark: '',
    syllabusId: 100005,
  },
  {
    classCode: 'F001',
    courseCode: 'ECON301',
    courseName: '微观经济学',
    totalHours: 48,
    credits: 3,
    teacher: '周九',
    schedule: [{ day: 4, start: 6, end: 8, location: '经管楼 301' }],
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    level: '辅修、微专业',
    courseType: '通识',
    courseNature: '选修',
    department: '经济与管理学院',
    teachingComposition: '辅修班',
    remark: '辅修课程',
    syllabusId: 100006,
  },
  {
    classCode: 'G001',
    courseCode: 'PE101',
    courseName: '体育（篮球）',
    totalHours: 32,
    credits: 1,
    teacher: '吴十',
    schedule: [{ day: 6, start: 1, end: 2, location: '体育馆' }],
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    level: '本科生',
    courseType: '通识',
    courseNature: '必修',
    department: '体育与健康学院',
    teachingComposition: '2026级1班',
    remark: '',
    syllabusId: 100007,
  },
  {
    classCode: 'H001',
    courseCode: 'CS201',
    courseName: '操作系统',
    totalHours: 48,
    credits: 3,
    teacher: '张三',
    schedule: [{ day: 1, start: 1, end: 2, location: '教 101' }],
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    level: '本科生',
    courseType: '专业',
    courseNature: '必修',
    department: '计算机科学与技术学院',
    teachingComposition: '2026级1班',
    remark: '与 A001 时间冲突（同为周一第 1-2 节）',
    syllabusId: 100008,
  },
  {
    classCode: 'I001',
    courseCode: 'CS301',
    courseName: '计算机网络',
    totalHours: 48,
    credits: 3,
    teacher: '李四',
    schedule: [{ day: 3, start: 6, end: 8, location: '实验楼 302' }],
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    level: '本科生',
    courseType: '专业',
    courseNature: '必修',
    department: '计算机科学与技术学院',
    teachingComposition: '2026级2班',
    remark: '与 A002 时间冲突（同为周三第 6-8 节）',
    syllabusId: 100009,
  },
];