import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 后端地址：默认本地 5236 端口，可用环境变量覆盖（用于联调其他实例）
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5236'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
})
