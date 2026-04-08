import React, { useEffect, useState } from 'react'
import { adminApi } from '../api/client'
import { format } from 'date-fns'
import { RefreshCw, Activity, Terminal, ArrowLeft, ArrowRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

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
    <div className="relative">
      <div className="mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={14} className="text-cyber-green animate-pulse" />
          <span className="text-[10px] font-mono text-cyber-cyan tracking-widest uppercase">LOG_STREAM::ACCESS_LOG_v1.0</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black font-hud text-white tracking-widest neon-text-glow uppercase">AUDIT_LOG_STREAM</h2>
        <p className="text-gray-400 text-sm font-mono mt-1 opacity-80 uppercase">HISTORICAL_TRACE_OF_ALL_SYSTEM_ACCESS_AND_MODIFICATIONS</p>
      </div>

      <Card className="flex flex-col">
        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
          <Terminal size={16} className="text-cyber-cyan" />
          <h3 className="text-sm font-bold font-hud tracking-widest text-cyber-cyan uppercase">RAW_ACTIVITY_FEED</h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <RefreshCw size={32} className="text-cyber-green animate-spin" />
             <div className="text-xs font-mono text-cyber-green tracking-widest uppercase">STREAMING_LOGS...</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs md:text-sm">
                <thead>
                  <tr className="border-b-2 border-white/5 text-gray-500">
                    <th className="pb-4 font-bold tracking-wider">TIMESTAMP</th>
                    <th className="pb-4 font-bold tracking-wider">ACTION</th>
                    <th className="pb-4 font-bold tracking-wider hidden md:table-cell">RESOURCE</th>
                    <th className="pb-4 font-bold tracking-wider">ID</th>
                    <th className="pb-4 font-bold tracking-wider hidden lg:table-cell">UPLINK_IP</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-gray-600 font-mono text-sm leading-none">[ NULL_SET ]</td></tr>
                  ) : logs.map(log => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-4 text-gray-500 whitespace-nowrap">
                        {log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '--:--:--'}
                      </td>
                      <td className="py-4">
                        <span className={`
                          px-2 py-0.5 text-[9px] font-black tracking-widest rounded uppercase
                          ${log.action.includes('delete') || log.action.includes('forged') || log.action.includes('fraud') ? 'bg-cyber-red/10 text-cyber-red border border-cyber-red/30' : 
                            log.action.includes('login') ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30' : 
                            'bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/30'}
                        `}>
                          {log.action.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td className="py-4 hidden md:table-cell text-gray-500 uppercase">{log.resource_type || '--'}</td>
                      <td className="py-4 text-cyber-cyan font-bold">
                        {log.resource_id ? `0x${log.resource_id.slice(0, 8)}` : '--'}
                      </td>
                      <td className="py-4 hidden lg:table-cell text-gray-600 font-mono">{log.ip_address || '0.0.0.0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-center items-center gap-8 mt-8 pt-6 border-t border-white/5">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1,p-1))} 
                disabled={page===1}
              >
                <ArrowLeft size={14} className="mr-1" /> PREV_CHUNK
              </Button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1">DATA_SEGMENT</span>
                <span className="text-sm font-black font-mono text-white">[{page.toString().padStart(2, '0')}]</span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setPage(p => p+1)} 
                disabled={logs.length < 50}
              >
                NEXT_CHUNK <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
