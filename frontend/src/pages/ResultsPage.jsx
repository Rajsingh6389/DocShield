import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { analysisApi, documentsApi } from '../api/client'
import { getWsStatusUrl, API_BASE_URL } from '../urls/api'
import { Download, ArrowLeft, Eye, Zap, Shield, FileText, Cpu, Terminal, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Loader } from '../components/ui/Loader'

const VERDICT_CONFIG = {
  authentic:  { color:'text-cyber-green',   bg:'bg-cyber-green/10',    border: 'border-cyber-green',    icon: CheckCircle, label:'AUTHENTIC' },
  suspicious: { color:'text-cyber-yellow',  bg:'bg-cyber-yellow/10',   border: 'border-cyber-yellow',   icon: AlertTriangle, label:'SUSPICIOUS' },
  forged:     { color:'text-cyber-red',     bg:'bg-cyber-red/10',      border: 'border-cyber-red',      icon: XCircle, label:'FORGED' },
  pending:    { color:'text-gray-500',      bg:'bg-gray-500/10',       border: 'border-gray-500',       icon: Loader, label:'PENDING' },
}

function GaugeChart({ score, colorClass }) {
  const pct = Math.min(Math.max(score || 0, 0), 100)
  const r = 60, stroke = 8, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={160} height={160} viewBox="0 0 160 160" className="transform -rotate-90">
        <circle cx={80} cy={80} r={r} fill="none" className="stroke-obsidian-700" strokeWidth={stroke} />
        <motion.circle 
          cx={80} cy={80} r={r} fill="none" 
          className={colorClass.replace('text-', 'stroke-')} 
          strokeWidth={stroke}
          strokeDasharray={circ} 
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black font-mono tracking-tighter ${colorClass} drop-shadow-[0_0_10px_currentColor]`}>{pct.toFixed(0)}</span>
        <span className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">SCORE</span>
      </div>
    </div>
  )
}

function SignalBar({ signal }) {
  const pct = (signal.score * 100).toFixed(1)
  const colorClass = signal.score < 0.2 ? 'bg-cyber-green' : signal.score < 0.4 ? 'bg-cyber-cyan' : signal.score < 0.65 ? 'bg-cyber-yellow' : 'bg-cyber-red'
  const textClass = signal.score < 0.2 ? 'text-cyber-green' : signal.score < 0.4 ? 'text-cyber-cyan' : signal.score < 0.65 ? 'text-cyber-yellow' : 'text-cyber-red'

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">{signal.name}</span>
        <span className={`text-[10px] font-bold ${textClass}`}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-obsidian-900 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full ${colorClass} shadow-[0_0_8px_currentColor]`}
        />
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [polling, setPolling] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const ws = useRef(null)
  const fetchedResult = useRef(false)  // Guard against duplicate result fetches
  const apiBase = API_BASE_URL.replace(/\/api$/, '')

  useEffect(() => {
    let pollInterval = null
    let maxPollTimer = null
    fetchedResult.current = false

    const stopPolling = () => {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
      if (maxPollTimer) { clearTimeout(maxPollTimer); maxPollTimer = null }
      setPolling(false)
    }

    const fetchResult = async () => {
      if (fetchedResult.current) return  // Prevent duplicate fetches
      fetchedResult.current = true
      stopPolling()
      ws.current?.close()
      try {
        const res = await analysisApi.result(id)
        setResult(res.data)
      } catch {
        fetchedResult.current = false  // Allow retry on failure
        startPolling()
      }
    }

    const fetchDoc = async () => {
      try {
        const d = await documentsApi.get(id)
        setDoc(d.data)
        return d.data
      } catch { return null }
    }

    const startPolling = () => {
      if (pollInterval) return
      setPolling(true)
      pollInterval = setInterval(async () => {
        try {
          const r = await analysisApi.status(id)
          const status = r.data.status
          if (status === 'completed') {
            await fetchResult()
          } else if (status === 'failed') {
            await fetchDoc()
            stopPolling()
          }
        } catch {}
      }, 3000)
      // Safety timeout: stop polling after 5 minutes to avoid infinite loop
      maxPollTimer = setTimeout(() => { stopPolling() }, 5 * 60 * 1000)
    }

    const load = async () => {
      try {
        const [d, r] = await Promise.allSettled([
          documentsApi.get(id),
          analysisApi.result(id),
        ])
        if (d.status === 'fulfilled') setDoc(d.value.data)
        if (r.status === 'fulfilled') {
          setResult(r.value.data)
          setLoading(false)
          return
        }
        // Result not ready — check if still processing
        const docData = d.status === 'fulfilled' ? d.value.data : null
        if (docData?.status === 'failed') {
          setLoading(false)
          return
        }
      } catch {}
      setLoading(false)

      // Try WebSocket first, fall back to polling
      try {
        const wsUrl = getWsStatusUrl(id)
        ws.current = new WebSocket(wsUrl)
        ws.current.onopen = () => { startPolling() } // Start polling as backup alongside WS
        ws.current.onmessage = async (e) => {
          const data = JSON.parse(e.data)
          if (data.status === 'completed') {
            await fetchResult()
          } else if (data.status === 'failed') {
            await fetchDoc()
            stopPolling()
          } else if (data.status === 'processing' || data.status === 'queued') {
            setPolling(true)
          }
        }
        ws.current.onerror = () => { if (!fetchedResult.current) startPolling() }
        ws.current.onclose = () => { if (!fetchedResult.current) startPolling() }
      } catch {
        startPolling()
      }
    }

    load()

    return () => {
      ws.current?.close()
      stopPolling()
    }
  }, [id])

  if (loading || polling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <Loader size="lg" text={polling ? 'ANALYSIS_IN_PROGRESS...' : 'INITIATING_UPLINK...'} />
      </div>
    )
  }

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await analysisApi.retry(id)
      setDoc(d => ({ ...d, status: 'queued' }))
      setPolling(true)
      // Re-start polling after retry
      const pollRef = setInterval(async () => {
        try {
          const r = await analysisApi.status(id)
          if (r.data.status === 'completed') {
            clearInterval(pollRef)
            const res = await analysisApi.result(id)
            setResult(res.data)
            setPolling(false)
          } else if (r.data.status === 'failed') {
            clearInterval(pollRef)
            const d = await documentsApi.get(id)
            setDoc(d.data)
            setPolling(false)
          }
        } catch {}
      }, 3000)
    } catch {}
    setRetrying(false)
  }

  if (doc?.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <XCircle size={64} className="text-cyber-red animate-pulse" />
        <h2 className="text-2xl font-black font-hud text-white tracking-widest uppercase">ANALYSIS_FAILED</h2>
        <p className="text-gray-400 font-mono text-sm max-w-md text-center">
          The secure uplink encountered a critical error during signal processing.
        </p>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleRetry} disabled={retrying}>
            {retrying ? 'RETRYING...' : '⟳ RETRY_ANALYSIS'}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/upload')}>
            RE_UPLOAD
          </Button>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <Loader size="lg" text="FINALIZING_STREAMS..." />
        <Button variant="ghost" size="sm" onClick={handleRetry} disabled={retrying} className="opacity-60 hover:opacity-100">
          {retrying ? 'RETRYING...' : '⟳ Force Retry Analysis'}
        </Button>
      </div>
    )
  }

  const verdict = result?.verdict || 'pending'
  const vc = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.pending
  const VerdictIcon = vc.icon

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-24"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-white/5 pb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 -ml-4 z-40 relative px-0 hover:px-2">
            <ArrowLeft size={16} className="mr-2" /> [ BACK ]
          </Button>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-cyber-green" />
            <span className="text-[10px] font-mono text-cyber-cyan tracking-widest">SESSION_ID: {id?.slice(0,12)}</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black font-hud text-white tracking-[0.1em] sm:tracking-widest neon-text-glow uppercase break-words">ANALYSIS_REPORT_v3</h2>
          {doc && <p className="text-gray-400 text-sm font-mono mt-1 opacity-80 uppercase">SOURCE: {doc.original_filename}</p>}
        </div>
        
        {result?.report_url && (
          <Button 
            onClick={() => window.open(result.report_url.startsWith('http') ? result.report_url : `${apiBase}${result.report_url}`, '_blank')}
            className="shrink-0"
          >
            <Download size={16} className="mr-2" /> EXPORT_BINARY_REPORT
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Verdict & Details */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Main Verdict Card */}
          <Card className={`border-l-4 ${vc.border} ${vc.bg} relative overflow-hidden flex flex-col sm:flex-row items-center gap-8 p-8`}>
            {/* Background glow */}
            <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] pointer-events-none opacity-20 ${vc.bg.replace('/10', '')}`} />
            
            <GaugeChart score={result.fraud_score} colorClass={vc.color} />
            
            <div className="flex-1 flex flex-col justify-center text-center sm:text-left z-10">
              <h3 className="text-xs font-bold font-hud tracking-widest text-gray-300 uppercase mb-2">THREAT_VERDICT</h3>
              <div className={`text-2xl lg:text-3xl font-black tracking-widest ${vc.color} drop-shadow-[0_0_15px_currentColor] flex items-center justify-center sm:justify-start gap-3`}>
                <VerdictIcon className="w-8 h-8" />
                {vc.label}
              </div>
              <div className="mt-4 bg-black/50 border border-white/10 px-3 py-1.5 rounded inline-block self-center sm:self-start">
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-widest">
                  CLASS: {result.forgery_type?.replace(/_/g,' ') || 'CLEAN'}
                </span>
              </div>
            </div>
          </Card>

          {/* AI Explainer */}
          {result.ai_explainer && (
            <Card className="border-t-2 border-cyber-cyan p-0 overflow-hidden">
              <div className="bg-cyber-cyan/10 px-4 py-2 border-b border-cyber-cyan/20 flex items-center gap-2">
                <Terminal size={14} className="text-cyber-cyan pulse" />
                <span className="text-[10px] font-bold font-mono tracking-widest text-cyber-cyan uppercase">NEURAL_EXPLAINER_SYNC::READY</span>
              </div>
              <div className="p-6 bg-[rgba(0,255,65,0.02)]">
                <p className="text-xs font-mono text-cyber-green leading-relaxed whitespace-pre-wrap">
                  {result.ai_explainer}
                </p>
              </div>
            </Card>
          )}

          {/* Signals */}
          <Card>
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <Zap size={16} className="text-cyber-yellow" />
              <h3 className="text-sm font-bold font-hud tracking-widest text-white uppercase">TELEMETRY_DATA_STREAMS</h3>
            </div>
            <div className="flex flex-col gap-4">
              {result.signals?.map((s, i) => <SignalBar key={i} signal={s} />)}
            </div>
          </Card>

          {/* Malware Scan Results */}
          {result.malware_details && (
            <Card className={`border-t-2 ${result.malware_score > 0.1 ? 'border-cyber-red' : 'border-cyber-green'} overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Shield size={14} className={result.malware_score > 0.1 ? 'text-cyber-red' : 'text-cyber-green'} />
                  <span className="text-[10px] font-bold font-hud tracking-widest text-white uppercase">VIRUSTOTAL_SECURITY_SCAN</span>
                </div>
                {result.malware_details.link && (
                  <a href={result.malware_details.link} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-cyber-cyan hover:underline">
                    VIEW_VT_REPORT ↗
                  </a>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">DETECTION_STATS</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black font-mono ${result.malware_score > 0.1 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                        {result.malware_details.malicious || 0}
                      </span>
                      <span className="text-gray-600 text-xs font-bold font-mono">/ {result.malware_details.total_engines || '--'} ENGINES</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-full ${result.malware_score > 0.1 ? 'bg-cyber-red/20 text-cyber-red shadow-[0_0_15px_rgba(255,46,99,0.3)]' : 'bg-cyber-green/20 text-cyber-green shadow-[0_0_15px_rgba(0,255,65,0.3)]'}`}>
                    {result.malware_score > 0.1 ? <AlertTriangle size={24} /> : <Shield size={24} />}
                  </div>
                </div>
                
                {result.malware_details.status === 'not_found' ? (
                  <div className="bg-obsidian-900 border border-white/5 p-3 rounded">
                    <p className="text-[10px] font-mono text-gray-400 italic">No historical scan found for this file hash. Signal remains neutral.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-obsidian-900 border border-white/5 p-2 rounded">
                      <div className="text-[8px] text-gray-500 font-bold uppercase mb-1">SUSPICIOUS</div>
                      <div className="text-sm font-bold font-mono text-cyber-yellow">{result.malware_details.suspicious || 0}</div>
                    </div>
                    <div className="bg-obsidian-900 border border-white/5 p-2 rounded">
                      <div className="text-[8px] text-gray-500 font-bold uppercase mb-1">CLEAN/TOTAL</div>
                      <div className="text-sm font-bold font-mono text-gray-400">{(result.malware_details.total_engines || 0) - (result.malware_details.malicious || 0) - (result.malware_details.suspicious || 0)}</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

        </div>

        {/* Right Column: Visualizer & Metadata */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          <Card className="flex flex-col h-[400px] sm:h-[600px] p-0 overflow-hidden border border-white/10">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-obsidian-800">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-cyber-cyan" />
                <h3 className="text-sm font-bold font-hud tracking-widest text-cyber-cyan">VISUAL_SENSOR_ARRAY</h3>
              </div>
              {result.heatmap_url && (
                <Button variant="secondary" size="sm" onClick={() => setShowHeatmap(!showHeatmap)}>
                  {showHeatmap ? 'VIEW_RAW' : 'VIEW_ANOMALIES'}
                </Button>
              )}
            </div>
            
            <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden grouped">
              {/* Scanline overlay */}
              <div className="absolute inset-0 cyber-grid opacity-10 animate-scanline pointer-events-none z-20" />
              
              {result.heatmap_url && showHeatmap ? (
                <motion.img 
                  initial={{ scale: 1.05, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  src={result.heatmap_url.startsWith('http') ? result.heatmap_url : `${apiBase}${result.heatmap_url}`} 
                  alt="XAI Heatmap" 
                  className="max-w-full max-h-full object-contain relative z-10 contrast-125" 
                />
              ) : (
                <div className="text-center text-gray-600 flex flex-col items-center">
                  <FileText size={64} className="mb-4 opacity-20" />
                  <p className="text-xs font-mono tracking-widest">AWAITING_VISUAL_HANDSHAKE...</p>
                </div>
              )}

              {/* Legend */}
              <AnimatePresence>
                {showHeatmap && result.heatmap_url && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-black/80 backdrop-blur border border-cyber-cyan/30 p-2 sm:p-3 rounded z-30 shadow-[0_0_15px_rgba(0,229,255,0.15)] flex flex-col gap-1 sm:gap-2"
                  >
                    <div className="text-[8px] sm:text-[10px] font-bold font-mono text-cyber-cyan tracking-widest uppercase mb-1">SENSOR_LEGEND</div>
                    <div className="flex items-center gap-2 text-[8px] sm:text-[10px] text-white font-mono">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-orange-500 rounded-full shadow-[0_0_5px_orange]" /> OCR_NOISE
                    </div>
                    <div className="flex items-center gap-2 text-[8px] sm:text-[10px] text-white font-mono">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full shadow-[0_0_5px_red]" /> RECLONE_PXL
                    </div>
                    <div className="flex items-center gap-2 text-[8px] sm:text-[10px] text-white font-mono">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-cyan-500 rounded-full shadow-[0_0_5px_cyan]" /> STRUCT_ANOMALY
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Metadata */}
          <Card>
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <Cpu size={16} className="text-gray-400" />
              <h3 className="text-sm font-bold font-hud tracking-widest text-gray-300 uppercase">SOURCE_METADATA</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { k: 'ASSET_TYPE', v: doc?.doc_type?.toUpperCase() },
                { k: 'INTEGRITY', v: doc?.status?.toUpperCase() },
                { k: 'FILE_BYTES', v: doc?.file_size ? `${(doc.file_size/1024).toFixed(1)} KB` : '---' },
                { k: 'MIME_TYPE', v: doc?.mime_type || 'RAW' },
              ].map(({k, v}, i) => (
                <div key={k} className="bg-obsidian-900/50 border border-white/5 p-4 relative overflow-hidden rounded">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyber-cyan opacity-50" />
                  <div className="text-[10px] font-bold text-gray-500 tracking-widest font-mono uppercase mb-1">{k}</div>
                  <div className="text-xs font-bold text-gray-200 font-mono tracking-wider truncate uppercase">{v || 'NULL'}</div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </motion.div>
  )
}
