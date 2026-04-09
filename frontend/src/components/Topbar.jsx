import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut, ShieldCheck, User } from 'lucide-react'
import { useAuthStore, useUIStore } from '../store/useStore'
import { Button } from './ui/Button'
import { motion } from 'framer-motion'

const TITLES = {
  '/dashboard': 'COMMAND_CENTER',
  '/upload': 'UPLOAD_UPLINK',
  '/cases': 'INCIDENT_REPORTS',
  '/blockchain': 'ON_CHAIN_LEDGER',
  '/admin': 'SYSTEM_ADMINISTRATION',
  '/settings': 'NODE_CONFIGURATION',
  '/activity': 'TELEMETRY_LOGS',
  '/notifications': 'SYSTEM_ALERTS',
  '/results': 'ANALYSIS_OUTCOME'
}

export default function Topbar() {
  const { pathname } = useLocation()
  const { user, logout: clearAuth } = useAuthStore()
  const { toggleSidebar } = useUIStore()
  const navigate = useNavigate()

  const title = TITLES[pathname] || TITLES[Object.keys(TITLES).find(k => pathname.startsWith(k)) || ''] || 'DOCUSHIELD_OS'

  const logout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <header className="h-16 shrink-0 bg-obsidian-800/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-6 relative z-30">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent" />
      
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
        >
          <Menu size={20} />
        </button>
        
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <h1 className="text-[10px] sm:text-sm md:text-base font-hud font-bold tracking-[0.1em] sm:tracking-[0.2em] text-white">
            {title}
          </h1>
          <div className="text-[10px] text-cyber-cyan font-mono tracking-widest hidden sm:block">
            STATUS: ACTIVE // LATENCY &lt; 30ms
          </div>
        </motion.div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden sm:flex items-center gap-3 bg-obsidian-900 border border-white/5 rounded-full pl-2 pr-4 py-1.5 shadow-inner">
            <div className="w-6 h-6 rounded-full bg-cyber-green/10 flex items-center justify-center border border-cyber-green/30">
              <User size={12} className="text-cyber-green" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-mono leading-none tracking-widest uppercase">{user.role}</span>
              <span className="text-xs font-bold text-white leading-none mt-0.5">{user.full_name}</span>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={logout} className="text-cyber-red hover:text-white">
          <LogOut size={16} className="md:mr-2" />
          <span className="hidden md:inline font-hud tracking-widest">DISCONNECT</span>
        </Button>
      </div>
    </header>
  )
}
