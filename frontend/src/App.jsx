import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/useStore'
import AppLayout from './components/AppLayout'

const LoginPage      = lazy(() => import('./pages/LoginPage'))
const UploadPage     = lazy(() => import('./pages/UploadPage'))
const ResultsPage    = lazy(() => import('./pages/ResultsPage'))
const DashboardPage  = lazy(() => import('./pages/DashboardPage'))
const AdminPage      = lazy(() => import('./pages/AdminPage'))
const ActivityPage   = lazy(() => import('./pages/ActivityPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const CasesPage      = lazy(() => import('./pages/CasesPage'))
const SettingsPage   = lazy(() => import('./pages/SettingsPage'))
const BlockchainPage = lazy(() => import('./pages/BlockchainPage'))

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a0a' }}>
      <div className="spin" style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #111', borderTopColor:'var(--neon-green)' }} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(0,0,0,0.9)',
            color: '#fff',
            border: '1px solid #222',
            borderRadius: 0,
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)'
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <div className="tech-overlay" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardPage />} />
            <Route path="upload"     element={<UploadPage />} />
            <Route path="blockchain" element={<BlockchainPage />} />
            <Route path="results/:id" element={<ResultsPage />} />
            <Route path="admin"      element={<AdminPage />} />
            <Route path="activity"   element={<ActivityPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="cases"      element={<CasesPage />} />
            <Route path="settings"   element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
