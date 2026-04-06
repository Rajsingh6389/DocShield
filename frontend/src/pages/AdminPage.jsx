import React, { useEffect, useState } from 'react'
import { adminApi } from '../api/client'
import { Users, Shield, BarChart2, RefreshCw, Terminal, Zap, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'var(--sp-2) var(--sp-4)',
      background: active ? 'rgba(0,255,65,0.1)' : 'transparent',
      color: active ? 'var(--neon-green)' : '#444',
      border: active ? '1px solid var(--neon-green)' : '1px solid transparent',
      cursor:'pointer',
      borderRadius: 0,
      fontWeight: 800,
      fontSize:'0.7rem',
      fontFamily: 'var(--font-mono)',
      transition:'all var(--t-fast)',
      textShadow: active ? 'var(--glow-green)' : 'none'
    }}>{label}</button>
  )
}

export default function AdminPage() {
  const [tab, setTab ] = useState('users')
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
      toast.success(`USER_${user.id.slice(0,8)}_STATUS: ${user.is_active ? 'OFFLINE' : 'ONLINE'}`)
    } catch { toast.error('ERROR: STATE_TRANSITION_FAILED') }
  }

  const changeRole = async (user, role) => {
    try {
      await adminApi.setRole(user.id, role)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u))
      toast.success(`USER_${user.id.slice(0,8)}_AUTH: LEVEL_UPGRADED`)
    } catch { toast.error('ERROR: AUTH_MOD_FAILURE') }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <Shield size={14} color="var(--neon-green)" />
          <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700 }}>ROOT_ACCESS_GRANTED :: ADM_v2.0</span>
        </div>
        <h2 className="glitch" style={{ fontSize: '1.75rem', fontWeight: 900 }}>SYSTEM_ADMIN_LEVEL_0</h2>
        <p className="page-subtitle typewriter" style={{ width: 'fit-content' }}>MANAGE_USER_PERMISSIONS_AND_NETWORK_STATS</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'var(--sp-2)', marginBottom:'var(--sp-8)' }}>
        <Tab label="[ NETWORK_USERS ]" active={tab==='users'}  onClick={() => setTab('users')}  />
        <Tab label="[ TELEMETRY_STATS ]" active={tab==='stats'}  onClick={() => setTab('stats')}  />
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-12)', gap: 'var(--sp-4)' }}>
           <RefreshCw size={32} className="spin" color="var(--neon-green)" />
           <div style={{ fontSize: '0.8rem', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>RETRIEVING_DATA...</div>
        </div>
      )}

      {!loading && tab === 'users' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)', borderBottom: '1px solid #111', paddingBottom: 'var(--sp-3)' }}>
            <Users size={16} color="var(--neon-cyan)" />
            <h3 style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)' }}>ACTIVE_NODES [{users.length}]</h3>
          </div>
          
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>IDENTIFIER</th><th className="mobile-hide">EMAIL_UPLINK</th><th>AUTH_LEVEL</th><th>STATUS</th><th>FA_2</th><th>ACTIONS</th>
              </tr></thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>{user.full_name?.toUpperCase()}</td>
                    <td className="mobile-hide" style={{ color:'#444', fontSize: '0.75rem' }}>{user.email}</td>
                    <td>
                      <select value={user.role} onChange={(e) => changeRole(user, e.target.value)}
                        style={{ background:'#050505', border:'1px solid #222', color:'var(--neon-cyan)', fontSize:'0.65rem', padding:'2px 5px', cursor:'pointer', fontFamily: 'var(--font-mono)' }}>
                        <option value="admin">ADMIN</option>
                        <option value="reviewer">REVIEWER</option>
                        <option value="auditor">AUDITOR</option>
                      </select>
                    </td>
                    <td><span className={`badge badge-${user.is_active ? 'authentic' : 'forged'}`} style={{ fontSize: '0.6rem' }}>{user.is_active ? 'VALID' : 'OFFLINE'}</span></td>
                    <td><span style={{ color: user.totp_enabled ? 'var(--neon-green)' : '#333', fontSize: '0.8rem' }}><ShieldCheck size={14} /></span></td>
                    <td>
                      <button 
                        className="btn btn-sm"
                        onClick={() => toggleActive(user)} 
                        style={{ 
                          fontSize:'0.6rem', padding: '0.2rem 0.5rem',
                          background: user.is_active ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,65,0.1)',
                          color: user.is_active ? 'var(--neon-red)' : 'var(--neon-green)',
                          border: `1px solid ${user.is_active ? 'var(--neon-red)' : 'var(--neon-green)'}`
                        }}>
                        {user.is_active ? 'TERMINATE' : 'RESTORE'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'stats' && stats && (
        <div className="responsive-grid">
          {[
            ['TOTAL_SAMPLES', stats.total_documents, 'var(--neon-cyan)'],
            ['MALICIOUS_DETECTED', stats.forged, 'var(--neon-red)'],
            ['ANOMALY_FLAGGED', stats.suspicious, 'var(--neon-yellow)'],
            ['SECURE_CLEARED', stats.authentic, 'var(--neon-green)'],
            ['CURRENT_PROCESSING', stats.processing, 'var(--neon-cyan)'],
            ['AVG_TRT_SCORE', `${stats.avg_fraud_score}%`, 'var(--neon-yellow)'],
          ].map(([label, value, color]) => (
            <div key={label} className="card" style={{ borderLeft:`2px solid ${color}` }}>
              <div style={{ fontSize: '0.65rem', color: '#555', fontWeight: 800, marginBottom: 'var(--sp-2)' }}>{label}</div>
              <div style={{ fontSize:'1.75rem', fontWeight:900, color: color, textShadow: `0 0 10px ${color}44` }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
