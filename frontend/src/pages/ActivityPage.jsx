import React, { useEffect, useState } from 'react'
import { adminApi } from '../api/client'
import { format } from 'date-fns'
import { RefreshCw, Activity, Terminal, ArrowLeft, ArrowRight } from 'lucide-react'

export default function ActivityPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    adminApi.auditLogs(page)
      .then(r => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <Activity size={14} color="var(--neon-green)" />
          <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700 }}>LOG_STREAM::ACCESS_LOG_v1.0</span>
        </div>
        <h2 className="glitch" style={{ fontSize: '1.75rem', fontWeight: 900 }}>AUDIT_LOG_STREAM</h2>
        <p className="page-subtitle typewriter" style={{ width: 'fit-content' }}>HISTORICAL_TRACE_OF_ALL_SYSTEM_ACCESS_AND_MODIFICATIONS</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)', boxShadow: 'inset 0 -1px 0 var(--border-ghost)', paddingBottom: 'var(--sp-3)' }}>
          <Terminal size={16} color="var(--neon-cyan)" />
          <h3 style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)' }}>RAW_ACTIVITY_FEED</h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-12)', gap: 'var(--sp-4)' }}>
             <RefreshCw size={32} className="spin" color="var(--neon-green)" />
             <div style={{ fontSize: '0.8rem', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>STREAMING_LOGS...</div>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>TIMESTAMP</th><th>ACTION_EXECUTED</th><th className="mobile-hide">RESOURCE</th><th>RESOURCE_ID</th><th className="mobile-hide">UPLINK_IP</th>
                </tr></thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign:'center', color:'#333', padding:'var(--sp-12)' }}>[ NULL_SET ]</td></tr>
                  ) : logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize:'0.7rem', color:'#444', whiteSpace:'nowrap' }}>
                        {log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '--:--:--'}
                      </td>
                      <td>
                        <span className={`badge badge-${log.action.includes('delete') || log.action.includes('forged') || log.action.includes('fraud') ? 'forged' : log.action.includes('login') ? 'authentic' : 'processing'}`} style={{ fontSize: '0.6rem' }}>
                          {log.action.replace(/_/g,' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="mobile-hide" style={{ color:'#555', fontSize:'0.75rem' }}>{log.resource_type?.toUpperCase() || '--'}</td>
                      <td style={{ color:'var(--neon-cyan)', fontSize:'0.7rem' }}>
                        {log.resource_id ? `0x${log.resource_id.slice(0, 8)}` : '--'}
                      </td>
                      <td className="mobile-hide" style={{ color:'#444', fontSize:'0.75rem' }}>{log.ip_address || '0.0.0.0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ display:'flex', justifyContent:'center', alignItems: 'center', gap:'var(--sp-6)', marginTop:'var(--sp-8)' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setPage(p => Math.max(1,p-1))} 
                disabled={page===1}
                style={{ fontSize: '0.65rem' }}
              >
                <ArrowLeft size={14} /> PREV_CHUNK
              </button>
              <span style={{ color:'#444', fontSize:'0.75rem', fontWeight: 800 }}>SEGMENT [{page}]</span>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setPage(p => p+1)} 
                disabled={logs.length < 50}
                style={{ fontSize: '0.65rem' }}
              >
                NEXT_CHUNK <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
