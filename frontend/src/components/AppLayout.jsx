import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useUIStore } from '../store/useStore'

export default function AppLayout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const location = useLocation()

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 768 && sidebarOpen) {
      toggleSidebar()
    }
  }, [location])

  return (
    <div className="app-container">
      <Sidebar />
      
      {/* Mobile Overlay */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          onClick={toggleSidebar}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 95, backdropFilter: 'blur(4px)'
          }}
        />
      )}

      <div className="main-content">
        <Topbar />
        <main className="page-container">
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
