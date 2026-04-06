import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { analysisApi, documentsApi } from '../api/client'
import { getWsStatusUrl, API_BASE_URL } from '../urls/api'
import { Download, RefreshCw, ArrowLeft, AlertTriangle, CheckCircle, XCircle, Eye, Zap, Shield, FileText, Cpu, Terminal } from 'lucide-react'
import toast from 'react-hot-toast'

const VERDICT_CONFIG = {
  authentic:  { color:'var(--neon-green)',  icon:'[ SECURE ]', label:'AUTHENTIC' },
  suspicious: { color:'var(--neon-yellow)', icon:'[ WARNING ]', label:'SUSPICIOUS' },
  forged:     { color:'var(--neon-red)',    icon:'[ MALICIOUS ]', label:'FORGED' },
  pending:    { color:'#444',            icon:'[ SCANNING ]', label:'PENDING' },
}

function GaugeChart({ score }) {
  const pct = Math.min(Math.max(score || 0, 0), 100)
  const color = pct < 35 ? 'var(--neon-green)' : pct < 65 ? 'var(--neon-yellow)' : 'var(--neon-red)'
  const r = 60, stroke = 6, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div style={{ textAlign:'center', position: 'relative' }}>
      <svg width={140} height={140} viewBox="0 0 160 160">
        <circle cx={80} cy={80} r={r} fill="none" stroke="#111" strokeWidth={stroke} />
        <circle cx={80} cy={80} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="square" 
          style={{ 
            transformOrigin:'50% 50%', transform:'rotate(-90deg)', 
            transition:'stroke-dashoffset 1s ease',
            filter: `drop-shadow(0 0 5px ${color})`
          }} />
        <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill={color} fontSize={28} fontWeight={900} fontFamily="var(--font-mono)">{pct.toFixed(0)}%</text>
      </svg>
      <div style={{ fontSize: '0.6rem', color: '#444', fontWeight: 700, marginTop: -10 }}>THREAT_INDEX</div>
    </div>
  )
}

function SignalBar({ signal }) {
  const pct = (signal.score * 100).toFixed(1)
  const color = signal.score < 0.2 ? 'var(--neon-green)' : signal.score < 0.4 ? 'var(--neon-cyan)' : signal.score < 0.65 ? 'var(--neon-yellow)' : 'var(--neon-red)'
  return (
    <div style={{ marginBottom:'var(--sp-4)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#555', textTransform: 'uppercase' }}>{signal.name}</span>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)' }}>
          <span style={{ fontSize:'0.7rem', color: color, fontWeight: 700 }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height:4, background:'#111', overflow:'hidden', border: '1px solid #222' }}>
        <div style={{ 
          height:'100%', width:`${pct}%`, background:color, 
          transition:'width 1s ease',
          boxShadow: `0 0 8px ${color}88`
        }} />
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
  const [showHeatmap, setShowHeatmap] = useState(true) // Show fraud overlay by default
  const [polling, setPolling] = useState(false)
  const ws = useRef(null)
  const apiBase = API_BASE_URL.replace(/\/api$/, '')

  useEffect(() => {
    const load = async () => {
      try {
        const [d, r] = await Promise.allSettled([
          documentsApi.get(id),
          analysisApi.result(id),
        ])
        if (d.status === 'fulfilled') setDoc(d.value.data)
        if (r.status === 'fulfilled') setResult(r.value.data)
      } catch {}
      setLoading(false)
    }
    load()

    let pollInterval = null;
    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(async () => {
        try {
          const r = await analysisApi.status(id);
          if (r.data.status === 'completed') {
            const res = await analysisApi.result(id);
            setResult(res.data);
            setPolling(false);
            clearInterval(pollInterval);
          } else if (r.data.status === 'processing') {
            setPolling(true);
          }
        } catch {}
      }, 3000);
    };

    try {
      const wsUrl = getWsStatusUrl(id);
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.status === 'completed') {
          analysisApi.result(id).then(r => { 
            setResult(r.data); 
            setPolling(false);
            if (pollInterval) clearInterval(pollInterval);
          }).catch(() => {});
        }
        if (data.status === 'processing') setPolling(true);
      };
      ws.current.onerror = () => startPolling();
    } catch {
      startPolling();
    }

    return () => {
      ws.current?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [id])

  if (loading) return (
    <div style={{ display:'flex', flexDirection: 'column', alignItems:'center', justifyContent: 'center', padding:'var(--sp-12)', gap: 'var(--sp-4)' }}>
      <RefreshCw size={32} className="spin" color="var(--neon-green)" />
      <div style={{ fontSize: '0.8rem', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>INITIATING_SEQUENCE...</div>
    </div>
  )

  const verdict = result?.verdict || 'pending'
  const vc = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.pending

  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'flex-start', flexWrap: 'wrap', gap:'var(--sp-4)', marginBottom:'var(--sp-8)' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ padding: '0.4rem' }}>
          <ArrowLeft size={14}/> BACK
        </button>
        <div style={{ flex:1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
            <Shield size={14} color="var(--neon-green)" />
            <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700 }}>VERIFICATION_ID: {id?.slice(0,12)}</span>
          </div>
          <h2 className="glitch" style={{ fontSize: '1.5rem', fontWeight: 900 }}>ANALYSIS_REPORT :: {id.slice(0, 8).toUpperCase()}</h2>
          <p className="page-subtitle typewriter" style={{ width: 'fit-content' }}>NEURAL_SCAN_COMPLETED_ON_TARGET_ASSET</p>
          {doc && <p className="page-subtitle" style={{ color: 'var(--neon-cyan)' }}>{doc.original_filename}</p>}
        </div>
        {result?.report_url && (
          <a href={result.report_url.startsWith('http') ? result.report_url : `${apiBase}${result.report_url}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
            <Download size={14}/> DOWNLOAD_RAW
          </a>
        )}
      </div>

      {polling && (
        <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-3)', padding:'var(--sp-4)', background:'rgba(0,255,65,0.05)', border:'1px solid var(--neon-green)', marginBottom:'var(--sp-6)', borderRadius: 0 }}>
          <RefreshCw size={16} className="spin" color="var(--neon-green)" />
          <span style={{ color:'var(--neon-green)', fontSize:'0.75rem', fontWeight:700, fontFamily: 'var(--font-mono)' }}>
            SYSTEM::SCANNING_IN_PROGRESS... TELEMETRY_AUTO_REFRESH_ENABLED
          </span>
        </div>
      )}

      {result ? (
        <div style={{ display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap:'var(--sp-8)' }}>
          {/* Left: Score + signals */}
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-6)' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-10)', borderBottom: `2px solid ${vc.color}` }}>
              <GaugeChart score={result.fraud_score} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: '#444', fontWeight: 700, marginBottom: 'var(--sp-2)' }}>VERDICT</div>
                <div style={{ fontSize:'1.25rem', fontWeight:900, color:vc.color, textShadow: `0 0 10px ${vc.color}44` }}>
                  {vc.icon} {vc.label}
                </div>
                <div style={{ marginTop:'var(--sp-4)', fontSize:'0.75rem', color:'#555' }}>
                   DETECTED_CLASS: <span style={{ color:'#ccc' }}>{result.forgery_type?.replace(/_/g,' ').toUpperCase()}</span>
                </div>
                {result.processing_time_seconds && (
                   <div style={{ fontSize:'0.65rem', color:'#333', marginTop:'var(--sp-2)' }}>
                      TIME_TO_VERIFY: {result.processing_time_seconds}S
                   </div>
                )}
              </div>
            </div>

            {/* AI Explainer Card */}
            {result.ai_explainer && (
              <div className="card" style={{ 
                background: '#000', 
                border: '1px solid var(--neon-green)', 
                position: 'relative',
                paddingTop: 'var(--sp-8)',
                marginBottom: 'var(--sp-6)'
              }}>
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, 
                  height: '24px', background: 'rgba(0,255,65,0.1)', 
                  display: 'flex', alignItems: 'center',
                  borderBottom: '1px solid var(--neon-green)',
                  padding: '0 var(--sp-3)',
                  gap: 'var(--sp-2)'
                }}>
                  <Terminal size={10} color="var(--neon-green)" />
                  <span style={{ fontSize: '0.6rem', color: 'var(--neon-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>AI_LOGIC_SESSION_ACTIVE</span>
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '4px', 
                    background: 'rgba(0,255,65,0.1)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--neon-green)',
                    flexShrink: 0
                  }}>
                    <Cpu size={18} color="var(--neon-green)" className="pulse-neon" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '0.75rem', marginBottom: 'var(--sp-3)', color: '#fff', letterSpacing: '2px' }}>AI_EXPLAINER_ENGINE</h3>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      fontSize: '0.75rem', 
                      color: 'var(--neon-green)', 
                      fontFamily: 'var(--font-mono)',
                      lineHeight: '1.4',
                      background: 'rgba(0,255,65,0.02)',
                      padding: 'var(--sp-3)',
                      borderLeft: '2px solid var(--neon-green)',
                      margin: 0
                    }}>
                      {result.ai_explainer}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)' }}>
                <Zap size={14} color="var(--neon-green)" />
                <h3 style={{ fontSize: '0.85rem', color:'var(--neon-green)' }}>SIGNAL_DECOMPOSITION</h3>
              </div>
              {result.signals?.map((s, i) => <SignalBar key={i} signal={s} />)}
            </div>
          </div>

          {/* Right: Document viewer */}
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-6)' }}>
            <div className="card" style={{ minHeight:400, display:'flex', flexDirection:'column', border: '1px solid #222' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--sp-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <Eye size={14} color="var(--neon-cyan)" />
                  <h3 style={{ fontSize: '0.85rem', color:'var(--neon-cyan)' }}>VISUAL_INSPECTION</h3>
                </div>
                {result.heatmap_url && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowHeatmap(!showHeatmap)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}>
                    {showHeatmap ? 'SWITCH_TO_ORIGINAL' : 'ENHANCE_HEATMAP'}
                  </button>
                )}
              </div>
              <div style={{ flex:1, background:'#050505', borderRadius: 0, border: '1px solid #111', display:'flex', alignItems:'center', justifyContent:'center', position: 'relative', overflow:'hidden' }}>
                {result.heatmap_url && showHeatmap ? (
                  <img src={result.heatmap_url.startsWith('http') ? result.heatmap_url : `${apiBase}${result.heatmap_url}`} alt="XAI Heatmap" style={{ maxWidth:'100%', maxHeight:500, filter: 'contrast(1.2) brightness(1.1)' }} />
                ) : (
                  <div style={{ textAlign:'center', color:'#333', padding:'var(--sp-8)' }}>
                    <FileText size={48} style={{ marginBottom:'var(--sp-4)', opacity:0.1 }} />
                    <p style={{ fontSize:'0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {result.heatmap_url ? 'CLICK "ENHANCE_HEATMAP" FOR ANOMALY_DETECTION' : 'PREVIEW_NOT_AVAILABLE'}
                    </p>
                  </div>
                )}
                <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.5rem', color: '#222' }}>SCAN_LAYER_v2.1</div>
                
                {/* Visual Legend Overlay */}
                {showHeatmap && result.heatmap_url && (
                  <div style={{ 
                    position:'absolute', bottom:10, left:10, 
                    background:'rgba(0,0,0,0.8)', border:'1px solid #333', 
                    padding:'6px 10px', fontSize:'0.6rem', color:'#888',
                    display:'flex', gap:'12px', zIndex: 10,
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{ width:8, height:8, background:'rgb(255, 165, 0)', boxShadow:'0 0 4px orange' }}></div> OCR
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{ width:8, height:8, background:'rgb(255, 0, 0)', boxShadow:'0 0 4px red' }}></div> CLONE
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{ width:8, height:8, background:'rgb(0, 255, 255)', boxShadow:'0 0 4px cyan' }}></div> HEATMAP
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '0.85rem', color:'#555', marginBottom:'var(--sp-4)' }}>METADATA_EXTRACT</h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'var(--sp-4)' }}>
                {[
                  ['DOC_TYPE', doc?.doc_type?.toUpperCase()],
                  ['AUTH_STATUS', doc?.status?.toUpperCase()],
                  ['PAYLOAD_SIZE', doc?.file_size ? `${(doc.file_size/1024).toFixed(1)} KB` : '---'],
                  ['ENCODING', doc?.mime_type || 'RAW'],
                ].map(([k,v]) => (
                  <div key={k} style={{ border: '1px solid #111', padding:'var(--sp-3)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize:'0.6rem', color:'#444', fontWeight:700 }}>{k}</div>
                    <div style={{ fontSize:'0.75rem', color:'#999', fontWeight:600, marginTop:4, fontFamily: 'var(--font-mono)' }}>{v || 'NULL'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign:'center', padding:'var(--sp-20)', border: '1px dashed #222' }}>
          <RefreshCw size={40} className="spin" color="#222" style={{ marginBottom:'var(--sp-6)' }} />
          <h3 style={{ color:'#444', fontSize:'0.9rem' }}>AWAITING_ANALYSIS_COMPLETION</h3>
          <p style={{ color:'#222', fontSize:'0.7rem', marginTop:'var(--sp-3)', fontFamily: 'var(--font-mono)' }}>
            CHANNEL_ACTIVE :: STREAMING_VIA_WEBSOCKET_01
          </p>
        </div>
      )}
    </div>
  )
}
