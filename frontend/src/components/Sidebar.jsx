import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Shield, LayoutDashboard, Upload, Folder,
  Settings, Activity, LogOut, ChevronLeft,
  X, Bell, Briefcase, ShieldAlert, Database
} from 'lucide-react'
import { useAuthStore, useUIStore } from '../store/useStore'

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'DASHBOARD', roles: ['admin', 'reviewer', 'auditor'] },
    { to: '/upload',    icon: Upload,          label: 'UPLINK',    roles: ['admin', 'reviewer', 'auditor'] },
    { to: '/blockchain', icon: Database,        label: 'BLOCKCHAIN', roles: ['admin', 'reviewer', 'auditor'] },
    { to: '/notifications', icon: Bell,        label: 'ALERTS',    roles: ['admin', 'reviewer', 'auditor'] },
    { to: '/cases',     icon: Briefcase,       label: 'INCIDENTS', roles: ['admin', 'reviewer'] },
    { to: '/admin',     icon: ShieldAlert,     label: 'ROOT_ADM',  roles: ['admin'] },
    { to: '/activity',  icon: Activity,        label: 'AUDIT_LOG', roles: ['admin', 'auditor'] },
    { to: '/settings',  icon: Settings,        label: 'SETTINGS',  roles: ['admin', 'reviewer', 'auditor'] },
  ]

  const filteredNav = navItems.filter(item => !item.roles || (user && item.roles.includes(user.role)))

  return (
    <aside 
      className="sidebar"
      style={{ 
        width: sidebarOpen ? 240 : 68,
        position: window.innerWidth < 768 ? 'fixed' : 'relative',
        height: '100%',
        left: window.innerWidth < 768 && !sidebarOpen ? -240 : 0,
        background: '#0a0a0a',
        borderRight: '1px solid #111',
        zIndex: 1000,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Brand */}
      <div className="sidebar-header" style={{ padding: 'var(--sp-6) var(--sp-4)', borderBottom: '1px solid #111' }}>
        <div style={{ 
          width: 32, height: 32, 
          background: 'var(--neon-green)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--glow-green)'
        }}>
          <Shield size={18} color="#000" />
        </div>
        {sidebarOpen && (
          <div style={{ display:'flex', flexDirection:'column', marginLeft: 12 }}>
            <span className="glitch" style={{ fontSize:'0.85rem', fontWeight:900, color:'#fff', letterSpacing:'0.1em' }}>DOCUSHIELD</span>
            <span className="typewriter" style={{ fontSize:'0.55rem', color:'var(--neon-green)', fontWeight:800, width:'fit-content' }}>SYSTEM_v2.0.4</span>
          </div>
        )}
        {window.innerWidth < 768 && sidebarOpen && (
          <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: '#333' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" style={{ padding: 'var(--sp-4) 0' }}>
        {filteredNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 24px',
              color: isActive ? 'var(--neon-green)' : '#444',
              textDecoration: 'none',
              fontSize: '0.7rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              borderLeft: isActive ? '3px solid var(--neon-green)' : '3px solid transparent',
              background: isActive ? 'rgba(0,255,65,0.02)' : 'transparent',
              transition: 'all 0.2s',
              textShadow: isActive ? 'var(--glow-green)' : 'none'
            })}
          >
            <Icon size={18} />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Collapse */}
      <div style={{ padding: 'var(--sp-4)', borderTop: '1px solid #111', marginTop: 'auto' }}>
        {sidebarOpen && user && (
          <div style={{ 
            padding: 'var(--sp-3)', 
            background: '#050505', 
            marginBottom: 'var(--sp-3)',
            border: '1px solid #111'
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--neon-cyan)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.full_name?.toUpperCase()}
            </div>
            <div style={{ fontSize: '0.55rem', color: '#444', fontWeight: 800 }}>
              [{user.role?.toUpperCase()}]
            </div>
          </div>
        )}
        
        <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', padding: '0.4rem', border: '1px solid #222', fontSize: '0.6rem' }}>
          <LogOut size={14} />
          {sidebarOpen && <span style={{ marginLeft: 8 }}>TERMINATE</span>}
        </button>

        {window.innerWidth >= 768 && (
          <button onClick={toggleSidebar} style={{
            width: '100%', marginTop: 'var(--sp-2)', background: 'none', border: 'none',
            color: '#222', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: sidebarOpen ? 'flex-end' : 'center', padding: 'var(--sp-2)',
          }}>
            <ChevronLeft size={16} style={{ transform: sidebarOpen ? 'none' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
          </button>
        )}
      </div>
    </aside>
  )
}
