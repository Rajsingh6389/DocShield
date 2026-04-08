import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, documentsApi } from '../api/client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Activity, ShieldAlert, Zap, ShieldCheck, ArrowRight, Terminal } from 'lucide-react'
import { format } from 'date-fns'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { motion } from 'framer-motion'
import { Loader } from '../components/ui/Loader'

function StatCard({ icon: Icon, label, value, color, trend, isCritical, delay }) {
  const shadowColor = isCritical ? 'rgba(255,0,60,0.1)' : color === 'var(--neon-green)' ? 'rgba(0,255,65,0.1)' : 'rgba(0,229,255,0.1)';
  const borderClass = isCritical ? 'border-l-cyber-red' : color === 'var(--neon-green)' ? 'border-l-cyber-green' : color === 'var(--neon-yellow)' ? 'border-l-cyber-yellow' : 'border-l-cyber-cyan';
  const textClass = isCritical ? 'text-cyber-red' : color === 'var(--neon-green)' ? 'text-cyber-green' : color === 'var(--neon-yellow)' ? 'text-cyber-yellow' : 'text-cyber-cyan';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card hover 
        className={`flex flex-col gap-3 border-l-[4px] ${borderClass} h-full ${isCritical ? 'bg-cyber-red/5' : ''}`}
      >
        {isCritical && (
          <div className="absolute top-2 right-3 text-[10px] text-cyber-red font-bold animate-pulse">
            CRITICAL_SIGNAL
          </div>
        )}
        <div className="flex items-center gap-2">
           <Icon size={16} className={textClass} />
           <div className="text-xs text-gray-400 font-bold uppercase tracking-widest font-mono">{label}</div>
        </div>
        <div className="flex items-end justify-between mt-auto">
          <div className={`text-3xl font-black font-mono leading-none ${textClass} drop-shadow-[0_0_10px_currentColor]`}>
            {value ?? '0x00'}
          </div>
          {trend && (
            <div className={`text-[10px] font-bold font-mono ${isCritical ? 'text-cyber-red' : 'text-gray-500'}`}>
              [{trend}]
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminApi.stats(), documentsApi.list({ page:1, page_size:10 })])
      .then(([s, d]) => { setStats(s.data); setDocs(d.data.items || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pieData = stats ? [
    { name: 'AUTHENTIC', value: stats.authentic, color: '#00FF41' },
    { name: 'SUSPICIOUS', value: stats.suspicious, color: '#F3FF00' },
    { name: 'FORGED', value: stats.forged, color: '#FF003C' },
  ].filter(d => d.value > 0) : []

  return (
    <div className="relative">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Terminal size={14} className="text-cyber-green" />
          <span className="text-[10px] font-mono text-cyber-cyan tracking-widest uppercase">Uplink_Established :: Session_Active</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black font-hud text-white tracking-widest neon-text-glow">DASHBOARD_OVERVIEW</h2>
        <p className="text-gray-400 text-sm font-mono mt-1 opacity-80">MONITORING_NETWORK_INTEGRITY_AND_DOCUMENT_TELEMETRY</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
             <Loader size="lg" text="GATHERING_TELEMETRY..." />
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              label="SAMPLES_ANALYZED" 
              value={stats?.total_documents} 
              icon={Activity} 
              color="var(--neon-cyan)" 
              trend="+12%_SYNC"
              delay={0.1}
            />
            <StatCard 
              label="FORGERIES_BLOCKED" 
              value={stats?.forged} 
              icon={ShieldAlert} 
              color="var(--neon-red)" 
              trend="CRITICAL"
              isCritical
              delay={0.2}
            />
            <StatCard 
              label="SUSPICIOUS_NODES" 
              value={stats?.suspicious} 
              icon={Zap} 
              color="var(--neon-yellow)" 
              trend="WARNING"
              delay={0.3}
            />
            <StatCard 
              label="AUTHENTIC_VERIFIED" 
              value={stats?.authentic} 
              icon={ShieldCheck} 
              color="var(--neon-green)" 
              trend="SECURE"
              delay={0.4}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent documents */}
            <Card className="lg:col-span-2 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <h3 className="text-sm font-hud font-bold tracking-widest text-white">RECENT_TRANSFERS</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/upload')} className="text-[10px]">
                  UPLOAD_NEW <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
              
              {docs.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-mono text-sm">
                  [ NO_DATA_AVAILABLE ]
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left font-mono text-xs md:text-sm">
                    <thead>
                      <tr className="border-b-2 border-white/5 text-gray-500">
                        <th className="pb-4 font-bold tracking-wider">FILENAME</th>
                        <th className="pb-4 font-bold tracking-wider hidden md:table-cell">TYPE</th>
                        <th className="pb-4 font-bold tracking-wider">STATUS</th>
                        <th className="pb-4 font-bold tracking-wider">TIMESTAMP</th>
                        <th className="pb-4"></th>
                      </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="show" className="text-gray-300">
                      {docs.map(doc => (
                        <motion.tr 
                          variants={itemVariants}
                          key={doc.id} 
                          onClick={() => navigate(`/results/${doc.id}`)}
                          className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                        >
                          <td className="py-4 text-cyber-cyan font-semibold truncate max-w-[150px] md:max-w-xs pr-4">{doc.original_filename}</td>
                          <td className="py-4 hidden md:table-cell text-gray-500">{doc.doc_type || 'RAW'}</td>
                          <td className="py-4">
                            <span className={`
                              px-2 py-1 text-[10px] font-bold tracking-widest rounded uppercase
                              ${doc.status === 'authentic' ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30' : 
                                doc.status === 'forged' ? 'bg-cyber-red/10 text-cyber-red border border-cyber-red/30' : 
                                'bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/30'}
                            `}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="py-4 text-gray-500">
                            {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'HH:mm:ss') : '--:--:--'}
                          </td>
                          <td className="py-4 text-right pr-4">
                            <ArrowRight size={14} className="inline-block text-gray-600 group-hover:text-cyber-green transition-colors" />
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Pie chart */}
            <Card className="flex flex-col">
              <h3 className="text-sm font-hud font-bold tracking-widest text-cyber-green mb-6 pb-4 border-b border-white/5">THREAT_LEVEL_DIST</h3>
              {pieData.length > 0 ? (
                <div className="flex-1 flex flex-col justify-center">
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: 'rgba(10,15,13,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                          itemStyle={{ color: '#00FF41' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-4 mt-6">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center justify-between pl-3 border-l-2" style={{ borderLeftColor: d.color }}>
                        <span className="text-xs font-mono font-bold tracking-widest text-gray-400">{d.name}</span>
                        <span className="font-bold text-sm" style={{ color: d.color }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 font-mono text-sm">[ NULL ]</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
