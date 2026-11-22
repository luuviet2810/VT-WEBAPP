import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // URL Backend Production chính thức trên Render
  const PRODUCTION_API_URL = 'https://vt-webapp.onrender.com'

  let apiUrl = process.env.VITE_API_URL || env.VITE_API_URL || ''

  if (mode === 'production') {
    // Trong production, nếu thiếu URL hoặc trỏ nhầm localhost thì ép buộc dùng URL Render chính thức
    if (!apiUrl || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      apiUrl = PRODUCTION_API_URL
    }
  } else {
    // Development mode
    if (!apiUrl) {
      apiUrl = 'http://localhost:3001'
    }
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
  }
})


