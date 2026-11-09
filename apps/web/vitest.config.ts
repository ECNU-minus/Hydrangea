import { defineConfig } from 'vitest/config'

/** 前端单元测试（DESIGN §10：core/ 纯函数用 Vitest） */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
})
