import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

/**
 * App mode switch — cùng một repository, hai giao diện:
 *
 *   VITE_APP_MODE=public  → Public Web (src/public/PublicApp) — cho khách hàng
 *   (mặc định / giá trị khác) → Admin (src/App) — giữ nguyên như trước
 *
 * Cả hai nhánh đều được dynamic-import → Vite tách chunk riêng:
 * bundle Public KHÔNG tải code Admin và ngược lại.
 *
 * Vercel: tạo project thứ hai trỏ vào cùng repo, thêm env
 * VITE_APP_MODE=public (hoặc build command `npm run build:public`).
 */
async function bootstrap() {
  const isPublicMode = import.meta.env.VITE_APP_MODE === 'public'
  const Root = isPublicMode
    ? (await import('./public/PublicApp')).default
    : (await import('./App')).default

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </React.StrictMode>
  )
}

bootstrap()
