import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 监听所有网卡：本机用 localhost，其他设备/隧道用 http://<本机IP>:5173
    host: true,
    // 端口被占用时直接报错，避免悄悄换端口导致放行/分享的地址失效
    strictPort: true,
    port: 5173,
    // 允许通过隧道域名访问（Cloudflare/ngrok 等临时域名不固定，故不做白名单）
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
