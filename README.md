# Hydrangea（课程查询与选课排课系统）

## 当前可用功能

- 后端提供课程查询接口 `GET /api/classes`，支持：
  - 关键词模糊搜索（匹配课程名称、代码、教师等文本字段）
  - 按课程类型、课程性质、开课部门、培养层次筛选
  - 分页查询
  - 数据为内置种子数据（seed.ts），暂未接入真实数据库

> 前端目前仅为脚手架默认页面，暂无实际功能。

## 本地部署

### 环境要求

- Node.js（建议 20+）
- pnpm

### 安装依赖

在项目根目录执行：

```bash
pnpm install
```

### 启动后端

```bash
pnpm dev:server
```

后端默认运行在 `http://localhost:3000`，接口前缀为 `/api`。

### 验证接口

浏览器或命令行访问：

```
http://localhost:3000/api/classes
```
url 参数参考 `apps/server/src/classes.service.ts` 中的 `QueryClassesParams` 接口定义。

其中 `semester` 为必填参数

