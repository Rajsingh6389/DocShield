import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, documentsApi } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { FileText, AlertTriangle, CheckCircle, Shield, TrendingUp, Clock, Upload, ArrowRight, Zap, Terminal, Activity, ShieldAlert, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'

function StatCard({ icon: Icon, label, value, color, trend, isCritical }) {
  return (
    <div className="card" style={{ 
      display:'flex', flexDirection: 'column', gap:'var(--sp-3)', 
      borderLeft:`2px solid ${color}`,
      position: 'relative',
      overflow: 'hidden',
      background: isCritical ? 'rgba(255,0,0,0.02)' : 'rgba(0,0,0,0.4)'
    }}>
      {isCritical && <div className="blink" style={{ position:'absolute', top:5, right:10, fontSize:'0.5rem', color:'var(--neon-red)', fontWeight:900 }}>CRITICAL_SIGNAL</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
         <Icon size={14} color={color} />
         <div style={{ fontSize:'0.65rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{label}</div>
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div style={{ fontSize:'1.75rem', fontWeight:900, color: color, textShadow: `0 0 10px ${color}44`, fontFamily: 'var(--font-mono)' }}>
          {value ?? '0x00'}
        </div>
        {trend && (
          <div style={{ fontSize:'0.55rem', color: isCritical ? 'var(--neon-red)' : '#444', fontWeight:800, fontFamily: 'var(--font-mono)' }}>
            [{trend}]
          </div>
        )}
      </div>
    </div>
  )
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
    { name: 'AUTHENTIC', value: stats.authentic, color: 'var(--neon-green)' },
    { name: 'SUSPICIOUS', value: stats.suspicious, color: 'var(--neon-yellow)' },
    { name: 'FORGED', value: stats.forged, color: 'var(--neon-red)' },
  ].filter(d => d.value > 0) : []

  return (
    <div className="fade-in scanline" style={{ position: 'relative' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <Terminal size={14} color="var(--neon-green)" />
          <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>UPLINK_ESTABLISHED :: SESSION_ACTIVE</span>
        </div>
        <h2 className="glitch" style={{ fontSize: '1.75rem', fontWeight: 900 }}>DASHBOARD_OVERVIEW</h2>
        <p className="page-subtitle typewriter" style={{ width: 'fit-content' }}>MONITORING_NETWORK_INTEGRITY_AND_DOCUMENT_TELEMETRY</p>
      </div>

      {/* Stats grid */}
      <div className="responsive-grid" style={{ marginBottom:'var(--sp-8)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)' }}>
        <StatCard 
          label="SAMPLES_ANALYZED" 
          value={stats?.total_documents} 
          icon={Activity} 
          color="var(--neon-cyan)" 
          trend="+12%_SYNC"
        />
        <StatCard 
          label="FORGERIES_BLOCKED" 
          value={stats?.forged} 
          icon={ShieldAlert} 
          color="var(--neon-red)" 
          trend="CRITICAL"
          isCritical
        />
        <StatCard 
          label="SUSPICIOUS_NODES" 
          value={stats?.suspicious} 
          icon={Zap} 
          color="var(--neon-yellow)" 
          trend="WARNING"
        />
        <StatCard 
          label="AUTHENTIC_VERIFIED" 
          value={stats?.authentic} 
          icon={ShieldCheck} 
          color="var(--neon-green)" 
          trend="SECURE"
        />
      </div>

      <div className="dashboard-grid">
        {/* Recent documents */}
        <div className="card" style={{ gridArea: 'table' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--sp-6)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-3)' }}>
            <h3 style={{ fontSize: '0.9rem', color:'var(--neon-green)' }}>RECENT_TRANSFERS</h3>
            <button className="btn btn-sm" onClick={() => navigate('/upload')}>
              UPLOAD_NEW <ArrowRight size={14} />
            </button>
          </div>
          
          {loading ? (
            [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height:40, marginBottom:'var(--sp-2)' }} />)
          ) : docs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'var(--sp-12)', color:'#333' }}>
              <p>[ NO_DATA_AVAILABLE ]</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>FILENAME</th><th className="mobile-hide">TYPE</th><th>STATUS</th><th>TIMESTAMP</th><th></th>
                </tr></thead>
                <tbody>
                  {docs.map(doc => (
                    <tr key={doc.id} onClick={() => navigate(`/results/${doc.id}`)}>
                      <td style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>{doc.original_filename}</td>
                      <td className="mobile-hide"><span style={{ color: '#555' }}>{doc.doc_type || 'RAW'}</span></td>
                      <td><span className={`badge badge-${doc.status}`}>{doc.status}</span></td>
                      <td style={{ color:'#444' }}>
                        {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'HH:mm:ss') : '--:--:--'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <ArrowRight size={14} color="#333" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="card" style={{ gridArea: 'chart' }}>
          <h3 style={{ fontSize: '0.9rem', color:'var(--neon-green)', marginBottom:'var(--sp-6)' }}>THREAT_LEVEL_DIST</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#000', border: '1px solid var(--border)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}
                    itemStyle={{ color: 'var(--neon-green)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-3)', marginTop:'var(--sp-4)' }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderLeft: `2px solid ${d.color}`, paddingLeft: 'var(--sp-3)' }}>
                    <span style={{ fontSize:'0.7rem', color: '#555' }}>{d.name}</span>
                    <span style={{ fontWeight:700, color: d.color, fontSize:'0.8rem' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'var(--sp-8)', color:'#333' }}>[ NULL ]</div>
          )}
        </div>
      </div>
    </div>
  )
}
