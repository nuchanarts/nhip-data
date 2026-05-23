import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base = '/nhip-data/' สำหรับ GitHub Pages (repo: nuchanarts/nhip-data)
// override ผ่าน env BASE_PATH ได้หากต้อง deploy ที่อื่น
export default defineConfig({
  base: process.env.BASE_PATH || '/nhip-data/',
  plugins: [react()],
  server: {
    proxy: {
      '/gsheet': {
        target: 'https://docs.google.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/gsheet/, ''),
        followRedirects: true,
      }
    }
  }
})
