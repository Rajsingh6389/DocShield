import React, { useEffect, useState } from 'react'
import { casesApi } from '../api/client'
import { Briefcase, Eye, CheckCircle, XCircle, AlertTriangle, Shield, Search, Terminal, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function CasesPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchCases = async () => {
    try {
      const { data } = await casesApi.list({ status: filter !== 'all' ? filter : undefined })
      setCases(data)
    } catch {
      toast.error('ERROR: DATA_FETCH_FAILURE_CASES')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
  }, [filter])

  const updateStatus = async (id, status) => {
    try {
      await casesApi.update(id, { status })
      setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c))
      toast.success(`CASE_${id.slice(0,8)}_MODIFIED: ${status.toUpperCase()}`)
    } catch {
      toast.error('ERROR: STATUS_UPDATE_FAILURE')
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <Briefcase size={14} color="var(--neon-green)" />
          <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700 }}>REVIEW_QUEUE::INCIDENT_MGMT_v1.0</span>
        </div>
        <h2 className="glitch" style={{ fontSize: '1.75rem', fontWeight: 900 }}>INCIDENT_QUEUE</h2>
        <p className="page-subtitle typewriter" style={{ width: 'fit-content' }}>REVIEW_PENDING_FORGERY_FLAGS_AND_INVESTIGATIONS</p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)', padding: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Filter size={14} color="#444" />
            <span style={{ fontSize: '0.7rem', color: '#444', fontWeight: 800 }}>FILTER_NODES:</span>
          </div>
          {['all', 'pending', 'under_review', 'resolved', 'dismissed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                background: filter === status ? 'rgba(0,255,65,0.1)' : 'transparent',
                boxShadow: filter === status ? 'inset 0 0 0 1px var(--neon-green)' : 'inset 0 0 0 1px var(--border-ghost)',
                color: filter === status ? 'var(--neon-green)' : '#333',
                fontSize: '0.65rem',
                padding: '4px 8px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {status.toUpperCase().replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)', boxShadow: 'inset 0 -1px 0 var(--border-ghost)', paddingBottom: 'var(--sp-3)' }}>
          <Terminal size={16} color="var(--neon-cyan)" />
          <h3 style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)' }}>CURRENT_INCIDENT_STREAM</h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-12)', gap: 'var(--sp-4)' }}>
             <div className="spin" style={{ width: 24, height: 24, border: '2px solid #111', borderTopColor: 'var(--neon-green)' }} />
             <div style={{ fontSize: '0.7rem', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>PARSING_QUEUE...</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>CASE_ID</th><th className="mobile-hide">CREATED</th><th>FRAUD_SCORE</th><th>STATUS</th><th>ACTIONS</th>
              </tr></thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign:'center', color:'#333', padding:'var(--sp-12)' }}>[ NO_CASES_ALLOCATED ]</td></tr>
                ) : cases.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--neon-cyan)', fontWeight: 800, fontSize: '0.7rem' }}>
                      #{c.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="mobile-hide" style={{ color: '#444', fontSize: '0.7rem' }}>
                      {format(new Date(c.created_at), 'yyyy-MM-dd')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                        <div style={{ flex: 1, height: 4, background: '#111', maxWidth: 60 }}>
                          <div style={{ height: '100%', width: `${c.document?.fraud_score || 0}%`, background: (c.document?.fraud_score || 0) > 70 ? 'var(--neon-red)' : 'var(--neon-yellow)' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#fff' }}>{c.document?.fraud_score || 0}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${c.status === 'resolved' ? 'authentic' : c.status === 'dismissed' ? 'forged' : 'processing'}`} style={{ fontSize: '0.6rem' }}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        <button className="btn btn-sm" onClick={() => navigate(`/results/${c.document_id}`)} style={{ padding: '2px 6px' }}>
                          <Eye size={12} />
                        </button>
                        {c.status !== 'resolved' && (
                          <button className="btn btn-sm" onClick={() => updateStatus(c.id, 'resolved')} style={{ padding: '2px 6px', color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }}>
                            <CheckCircle size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
