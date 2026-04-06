import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu, User, Zap } from 'lucide-react'
import { useUIStore, useAuthStore } from '../store/useStore'
import { notificationsApi } from '../api/client'

const TITLES = {
  '/dashboard': 'CORE_SYSTEM_DASHBOARD',
  '/upload': 'SECURE_DATA_UPLINK',
  '/admin': 'ROOT_ADMIN_TERMINAL',
  '/activity': 'AUDIT_TRAIL_LOG_STREAM',
  '/notifications': 'PRIORITY_SIGNAL_FEED',
  '/cases': 'INCIDENT_REVIEW_QUEUE',
  '/settings': 'SECURITY_PROTOCOL_CONFIG',
}

export default function Topbar() {
  const { toggleSidebar } = useUIStore()
  const { user } = useAuthStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    notificationsApi.list(true)
      .then(r => setUnread(r.data.length))
      .catch(() => {})
  }, [pathname])

  const title = TITLES[pathname] || TITLES[Object.keys(TITLES).find(k => pathname.startsWith(k)) || ''] || 'DOCUSHIELD_OS'

  return (
    <header className="topbar" style={{ background: '#0a0a0a', borderBottom: '1px solid #111', zIndex: 900 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <button 
            onClick={toggleSidebar} 
            className="btn btn-sm mobile-only" 
            style={{ padding: '0.4rem', border: '1px solid #222', color: '#444' }}
          >
            <Menu size={18} />
          </button>
          <button 
            onClick={toggleSidebar} 
            className="mobile-hide"
            style={{ background: 'none', border: 'none', color: '#222', cursor: 'pointer' }}
          >
            <Menu size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div style={{ width: 4, height: 20, background: 'var(--neon-green)', boxShadow: 'var(--glow-green)' }} />
            <h1 className="glitch" style={{ fontSize: '0.9rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>
              {pathname.split('/').pop()?.toUpperCase() || 'COMMAND_CENTER'}
            </h1>
            <div className="blink" style={{ fontSize: '0.6rem', color: 'var(--neon-red)', fontWeight: 800, marginLeft: 'var(--sp-2)' }}>• LIVE_SIGNAL</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)' }}>
          {/* Status indicator */}
          <div className="mobile-hide" style={{ fontSize: '0.6rem', color: '#333', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
            <span style={{ color: 'var(--neon-green)' }}>●</span> LINK_ESTABLISHED
          </div>

          <button 
            onClick={() => navigate('/notifications')}
            style={{ position: 'relative', background: 'none', border: 'none', color: unread > 0 ? 'var(--neon-yellow)' : '#444', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--neon-red)', boxShadow: 'var(--glow-red)',
                border: '2px solid #0a0a0a'
              }} />
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', borderLeft: '1px solid #111', paddingLeft: 'var(--sp-6)' }}>
            <div style={{ textAlign: 'right' }} className="mobile-hide">
               <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>{user?.full_name?.toUpperCase()}</div>
               <div style={{ fontSize: '0.5rem', color: '#333', fontWeight: 800 }}>S_ID::{user?.id?.slice(0,8).toUpperCase()}</div>
            </div>
            <div 
              onClick={() => navigate('/settings')}
              style={{
                width: 32, height: 32, 
                background: '#050505', border: '1px solid #111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#333', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#333'}
            >
              <User size={16} />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
