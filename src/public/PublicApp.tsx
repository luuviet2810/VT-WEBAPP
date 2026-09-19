import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SITE_CONFIG } from './contactConfig'
import PublicHeader from './components/PublicHeader'
import PublicFooter from './components/PublicFooter'
import ContactBubble from './components/ContactBubble'
import Home from './pages/Home'
import VehicleDetailPage from './pages/VehicleDetailPage'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/**
 * PUBLIC WEB root — chỉ được bootstrap khi VITE_APP_MODE=public
 * (xem main.tsx). Không auth, không store Admin, READ-ONLY.
 */
export default function PublicApp() {
  useEffect(() => {
    document.title = `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <PublicHeader />
              <Home />
            </>
          }
        />
        <Route path="/xe/:id" element={<VehicleDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PublicFooter />
      <ContactBubble />
    </div>
  )
}
