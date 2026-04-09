import React, { useEffect, useState } from 'react'
import { adminApi } from '../api/client'
import { Users, Shield, BarChart2, RefreshCw, Terminal, Zap, ShieldCheck, Activity, UserPlus, Server } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Loader } from '../components/ui/Loader'

export default function AdminPage() {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([adminApi.users(), adminApi.stats()])
      .then(([u, s]) => { setUsers(u.data); setStats(s.data) })
      .catch(() => toast.error('SYSTEM_ERROR: ACCESS_DENIED_OR_NETWORK_FAILURE'))
      .finally(() => setLoading(false))
  }, [])

  const toggleActive = async (user) => {
    try {
      await adminApi.setActive(user.id, !user.is_active)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      toast.success(`USER_${user.id.slice(0, 8)}_STATUS_UPDATED`)
    } catch { toast.error('ERROR: STATE_TRANSITION_FAILED') }
  }

  const changeRole = async (user, role) => {
    try {
      await adminApi.setRole(user.id, role)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u))
      toast.success(`USER_${user.id.slice(0, 8)}_AUTH_UPGRADED`)
    } catch { toast.error('ERROR: AUTH_MOD_FAILURE') }
  }

  return (
    <div className="relative pb-20">
      {/* Header */}
      <div className="mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-cyber-green animate-pulse" />
          <span className="text-[10px] font-mono text-cyber-cyan tracking-widest uppercase">ROOT_ACCESS_GRANTED :: ADM_v2.0</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black font-hud text-white tracking-[0.1em] sm:tracking-widest neon-text-glow uppercase break-words">SYSTEM_ADMIN_LEVEL_0</h2>
        <p className="text-gray-400 text-sm font-mono mt-1 opacity-80 uppercase">MANAGE_USER_PERMISSIONS_AND_NETWORK_STATS</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-black/20 p-1 border border-white/5 rounded-lg w-fit">
        {['users', 'stats'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`
              px-6 py-2 text-[10px] font-hud font-bold tracking-widest uppercase transition-all relative
              ${tab === t ? 'text-cyber-green' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            {t === 'users' ? '[ NETWORK_USERS ]' : '[ TELEMETRY_STATS ]'}
            {tab === t && (
              <motion.div 
                layoutId="activeTab" 
                className="absolute inset-0 bg-cyber-green/10 border border-cyber-green/30 px-6 py-2"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-32 gap-4"
          >
            <Loader size="lg" />
            <div className="text-[10px] font-mono text-cyber-green tracking-widest uppercase animate-pulse">RETRIEVING_DATA_FROM_SECURE_NODES...</div>
          </motion.div>
        ) : tab === 'users' ? (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-cyber-cyan" />
                  <h3 className="text-sm font-bold font-hud tracking-widest text-cyber-cyan uppercase">ACTIVE_NODES [{users.length}]</h3>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-cyber-green" /> ONLINE</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-cyber-red" /> TERMINATED</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/5">
                      <th className="pb-4 font-bold tracking-wider">IDENTIFIER</th>
                      <th className="pb-4 font-bold tracking-wider hidden lg:table-cell">EMAIL_UPLINK</th>
                      <th className="pb-4 font-bold tracking-wider hidden sm:table-cell">AUTH_LEVEL</th>
                      <th className="pb-4 font-bold tracking-wider">STATUS</th>
                      <th className="pb-4 font-bold tracking-wider text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    {users.map(user => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="py-4 font-bold text-white group-hover:text-cyber-cyan transition-colors">
                          {user.full_name?.toUpperCase() || 'ANONYMOUS_NODE'}
                        </td>
                        <td className="py-4 text-gray-500 hidden lg:table-cell group-hover:text-gray-400">
                          {user.email}
                        </td>
                        <td className="py-4 hidden sm:table-cell">
                          <select 
                            value={user.role} 
                            onChange={(e) => changeRole(user, e.target.value)}
                            className="bg-black/40 border border-white/10 text-cyber-cyan text-[10px] px-2 py-1 rounded outline-none focus:border-cyber-cyan transition-colors font-mono"
                          >
                            <option value="admin">ADMIN</option>
                            <option value="reviewer">REVIEWER</option>
                            <option value="auditor">AUDITOR</option>
                          </select>
                        </td>
                        <td className="py-4">
                          <span className={`
                            px-2 py-0.5 text-[9px] font-black tracking-widest rounded uppercase
                            ${user.is_active ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30' : 'bg-cyber-red/10 text-cyber-red border border-cyber-red/30'}
                          `}>
                            {user.is_active ? 'VALID' : 'OFFLINE'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <Button 
                            variant={user.is_active ? "danger" : "secondary"} 
                            size="sm" 
                            onClick={() => toggleActive(user)}
                            className="text-[9px] h-7 px-3"
                          >
                            {user.is_active ? 'TERMINATE' : 'RESTORE'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              { label: 'TOTAL_SAMPLES', value: stats?.total_documents, color: 'text-cyber-cyan', icon: Activity },
              { label: 'MALICIOUS_DETECTED', value: stats?.forged, color: 'text-cyber-red', icon: Zap },
              { label: 'ANOMALY_FLAGGED', value: stats?.suspicious, color: 'text-cyber-yellow', icon: Shield },
              { label: 'SECURE_CLEARED', value: stats?.authentic, color: 'text-cyber-green', icon: ShieldCheck },
              { label: 'CURRENT_PROCESSING', value: stats?.processing, color: 'text-cyber-cyan', icon: Server },
              { label: 'AVG_TRT_SCORE', value: `${stats?.avg_fraud_score}%`, color: 'text-cyber-yellow', icon: BarChart2 },
            ].map((s, i) => (
              <Card key={i} className="group hover:border-white/20 transition-all duration-500">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-hud font-bold text-gray-500 tracking-widest uppercase">{s.label}</span>
                  <s.icon size={16} className={`${s.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                </div>
                <div className={`text-3xl font-black font-mono ${s.color} group-hover:scale-105 transition-transform origin-left`}>
                  {s.value ?? '---'}
                </div>
                <div className="mt-4 flex items-center gap-1">
                  <div className="grow h-[1px] bg-white/5 group-hover:bg-white/10 transition-colors" />
                  <span className="text-[8px] font-mono text-gray-700 uppercase tracking-tighter">TELEMETRY_DATA_STABLE</span>
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
