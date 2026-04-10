import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, FolderSearch, Link2, Settings, ShieldCheck, Activity, Bell, Search } from 'lucide-react'
import { useAuthStore, useUIStore } from '../store/useStore'
import { motion } from 'framer-motion'

const LINKS = [
  { path: '/dashboard', label: 'DashBoard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/cases', label: 'INCIDENT_REPORTS', icon: FolderSearch },
  { path: '/blockchain', label: 'ON_CHAIN_LEDGER', icon: Link2 },
  { path: '/activity', label: 'LOGS', icon: Activity },
  { path: '/notifications', label: 'ALERTS', icon: Bell },
  { path: '/intel', label: 'Telegram Service', icon: Search },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const { sidebarOpen } = useUIStore()

  const links = [...LINKS]
  if (user?.role === 'admin') {
    links.push({ path: '/admin', label: 'ADMINISTRATION', icon: ShieldCheck })
  }
  links.push({ path: '/settings', label: 'CONFIGURATION', icon: Settings })

  return (
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-obsidian-800/95 backdrop-blur-xl border-r border-white/5
      flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0 relative">
        <ShieldCheck className="w-6 h-6 text-cyber-green mr-3" />
        <span className="font-hud font-bold text-white tracking-[0.1em] sm:tracking-[0.2em] shadow-cyber-green">DOCUSHIELD</span>
        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyber-green to-transparent w-full" />
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1 custom-scrollbar">
        {links.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `
              relative flex items-center px-3 py-3 rounded-lg text-xs font-mono font-bold tracking-widest uppercase
              transition-all duration-200 group
              ${isActive ? 'text-cyber-green bg-cyber-green/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyber-green rounded-r drop-shadow-[0_0_8px_rgba(0,255,65,0.8)]"
                  />
                )}
                <Icon size={18} className={`mr-3 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 bg-obsidian-900/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
          <span className="text-[10px] font-mono text-gray-500 tracking-wider">SYSTEM_STATUS_NOMINAL</span>
        </div>
        <div className="h-1 w-full bg-obsidian-900 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-cyber-green"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}
