import React, { useEffect, useState } from 'react'
import { casesApi } from '../api/client'
import { Briefcase, Eye, CheckCircle, XCircle, AlertTriangle, Shield, Search, Terminal, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

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
    <div className="relative">
      <div className="mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase size={14} className="text-cyber-green animate-pulse" />
          <span className="text-[10px] font-mono text-cyber-cyan tracking-widest uppercase">REVIEW_QUEUE::INCIDENT_MGMT_v1.0</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black font-hud text-white tracking-widest neon-text-glow uppercase">INCIDENT_QUEUE</h2>
        <p className="text-gray-400 text-sm font-mono mt-1 opacity-80 uppercase">REVIEW_PENDING_FORGERY_FLAGS_AND_INVESTIGATIONS</p>
      </div>

      {/* Filter Bar */}
      <Card className="mb-8 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter size={14} />
            <span className="text-[10px] font-bold font-hud tracking-widest uppercase">FILTER_NODES:</span>
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'under_review', 'resolved', 'dismissed'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`
                  px-3 py-1 text-[10px] font-mono font-bold tracking-widest uppercase transition-all duration-300 border
                  ${filter === status 
                    ? 'bg-cyber-green/10 border-cyber-green text-cyber-green shadow-[0_0_10px_rgba(0,255,149,0.2)]' 
                    : 'bg-transparent border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'}
                `}
              >
                {status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col">
        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
          <Terminal size={16} className="text-cyber-cyan" />
          <h3 className="text-sm font-bold font-hud tracking-widest text-cyber-cyan uppercase">CURRENT_INCIDENT_STREAM</h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-8 h-8 border-2 border-white/5 border-t-cyber-green rounded-full animate-spin" />
             <div className="text-[10px] font-mono text-cyber-green tracking-widest uppercase">PARSING_QUEUE...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b-2 border-white/5 text-gray-500">
                  <th className="pb-4 font-bold tracking-wider">CASE_ID</th>
                  <th className="pb-4 font-bold tracking-wider hidden md:table-cell">CREATED</th>
                  <th className="pb-4 font-bold tracking-wider">FRAUD_SCORE</th>
                  <th className="pb-4 font-bold tracking-wider">STATUS</th>
                  <th className="pb-4 font-bold tracking-wider text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {cases.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-600 uppercase tracking-widest">[ NO_CASES_ALLOCATED ]</td></tr>
                ) : cases.map(c => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-4 font-bold text-cyber-cyan">
                      #{c.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 text-gray-500 hidden md:table-cell">
                      {format(new Date(c.created_at), 'yyyy-MM-dd')}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-black border border-white/5 rounded-full overflow-hidden min-w-[60px]">
                          <div 
                            style={{ width: `${c.document?.fraud_score || 0}%` }}
                            className={`h-full ${ (c.document?.fraud_score || 0) > 70 ? 'bg-cyber-red shadow-[0_0_8px_rgba(255,51,102,0.5)]' : 'bg-cyber-yellow shadow-[0_0_8px_rgba(255,184,0,0.5)]'}`} 
                          />
                        </div>
                        <span className="font-bold text-[10px] w-8">{c.document?.fraud_score || 0}%</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`
                        px-2 py-0.5 text-[9px] font-black tracking-widest rounded uppercase
                        ${c.status === 'resolved' ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30' : 
                          c.status === 'dismissed' ? 'bg-cyber-red/10 text-cyber-red border border-cyber-red/30' : 
                          'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30'}
                      `}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/results/${c.document_id}`)}
                          className="px-2"
                        >
                          <Eye size={14} />
                        </Button>
                        {c.status !== 'resolved' && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => updateStatus(c.id, 'resolved')}
                            className="px-2 border-cyber-green/50 text-cyber-green hover:bg-cyber-green hover:text-black"
                          >
                            <CheckCircle size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
