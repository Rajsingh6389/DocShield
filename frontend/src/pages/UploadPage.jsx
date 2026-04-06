import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, XCircle, Loader, Zap, Terminal, ShieldAlert, Cpu } from 'lucide-react'
import { documentsApi } from '../api/client'
import toast from 'react-hot-toast'

const ACCEPTED = { 'image/*': ['.jpg','.jpeg','.png','.tiff','.bmp'], 'application/pdf': ['.pdf'] }

function FileRow({ file, status, progress, docId, onNavigate }) {
  const color = status === 'done' ? 'var(--neon-green)' : status === 'error' ? 'var(--neon-red)' : 'var(--neon-cyan)'
  
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-4)', padding:'var(--sp-3) var(--sp-4)', background:'rgba(0,0,0,0.2)', border:`1px solid #111`, borderLeft: `2px solid ${color}`, marginBottom:'var(--sp-3)' }}>
      <FileText size={18} color={color} style={{ flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'0.75rem', fontWeight:700, color: '#ccc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily: 'var(--font-mono)' }}>
          {file.name.toUpperCase()}
        </div>
        <div style={{ fontSize:'0.6rem', color:'#444', fontFamily: 'var(--font-mono)' }}>
          SIZE: {(file.size / 1024 / 1024).toFixed(2)} MB
        </div>
        {status === 'uploading' && (
          <div style={{ height:2, background:'#111', marginTop:8, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progress}%`, background:color, transition:'width 0.3s ease', boxShadow: `0 0 5px ${color}` }} />
          </div>
        )}
      </div>
      <div style={{ flexShrink:0 }}>
        {status === 'idle' && <span style={{ fontSize: '0.6rem', color: '#444', fontWeight: 800 }}>[ READY ]</span>}
        {status === 'uploading' && <Loader size={14} className="spin" color="var(--neon-cyan)" />}
        {status === 'done' && <CheckCircle size={16} color="var(--neon-green)" />}
        {status === 'error' && <XCircle size={16} color="var(--neon-red)" />}
      </div>
      {status === 'done' && docId && (
        <button className="btn btn-sm" onClick={() => onNavigate(docId)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}>OPEN_REPORT</button>
      )}
    </div>
  )
}

export default function UploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([]) 
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.map(f => ({ file: f, status: 'idle', progress: 0, docId: null }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true, accept: ACCEPTED, maxSize: 20 * 1024 * 1024,
  })

  const uploadAll = async () => {
    setUploading(true)
    const toUpload = files.filter(f => f.status === 'idle')
    for (let i = 0; i < toUpload.length; i++) {
      const idx = files.findIndex(f => f === toUpload[i])
      setFiles(prev => prev.map((f, fi) => fi === idx ? { ...f, status: 'uploading' } : f))
      try {
        const fd = new FormData()
        fd.append('file', toUpload[i].file)
        const { data } = await documentsApi.upload(fd, (p) => {
          setFiles(prev => prev.map((f, fi) => fi === idx ? { ...f, progress: p } : f))
        })
        setFiles(prev => prev.map((f, fi) => fi === idx ? { ...f, status: 'done', docId: data.id } : f))
      } catch {
        setFiles(prev => prev.map((f, fi) => fi === idx ? { ...f, status: 'error' } : f))
        toast.error(`ERROR_UPLINK_FAILURE: ${toUpload[i].file.name.toUpperCase()}`)
      }
    }
    setUploading(false)
  }

  const clear = () => setFiles([])
  const idleCount = files.filter(f => f.status === 'idle').length

  return (
    <div className="fade-in scanline">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <Zap size={14} color="var(--neon-green)" />
          <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>UPLINK_READY :: WAITING_FOR_SIGNAL</span>
        </div>
        <h2 className="glitch" style={{ fontSize: '1.75rem', fontWeight: 900 }}>UPLOAD_UPLINK</h2>
        <p className="page-subtitle typewriter" style={{ width: 'fit-content' }}>TRANSMIT_DOCUMENTS_FOR_DEEP_NEURAL_SCANNING</p>
      </div>

      <div className="dashboard-grid">
        <div className="card neon-border-flow" style={{ gridColumn: 'span 2' }}>
          <div 
            {...getRootProps()} 
            className={`upload-zone ${isDragActive ? 'active' : ''}`}
            style={{ 
              border: '2px dashed #222',
              background: isDragActive ? 'rgba(0,255,65,0.05)' : 'rgba(5,5,5,0.5)',
              padding: 'var(--sp-12)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <input {...getInputProps()} />
            {isDragActive && <div style={{ position:'absolute', inset:0, background: 'rgba(0,255,65,0.05)', animation: 'pulse 1s infinite' }} />}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--sp-4)', position:'relative', zIndex:1 }}>
              <div className={isDragActive ? 'spin' : ''}>
                 <Upload size={48} color={isDragActive ? 'var(--neon-green)' : '#333'} />
              </div>
              <div>
                <p style={{ color: isDragActive ? 'var(--neon-green)' : '#ccc', fontWeight:900, fontSize:'0.9rem', marginBottom:4, fontFamily: 'var(--font-mono)' }}>
                  {isDragActive ? '>>> SIGNAL_LOCKED <<<' : 'DRAG_ANALYSIS_TARGET_HERE'}
                </p>
                <p style={{ color:'#444', fontSize:'0.7rem', fontWeight:800, fontFamily: 'var(--font-mono)' }}>JPG | PNG | PDF | TIFF | BMP  ::  MAX_LIMIT_20MB</p>
              </div>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'var(--sp-6)', borderBottom: '1px solid #111', paddingBottom: 'var(--sp-3)' }}>
              <h3 style={{ fontSize: '0.8rem', color:'var(--neon-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>TRANSMISSION_QUEUE [{files.length}]</h3>
              {!uploading && <button className="btn btn-secondary btn-sm" onClick={clear} style={{ fontSize: '0.65rem' }}>ABORT_ALL</button>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {files.map((item, i) => (
                <FileRow key={i} {...item} onNavigate={(id) => navigate(`/results/${id}`)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:'var(--sp-4)', alignItems:'center', marginTop: 'var(--sp-6)' }}>
        {idleCount > 0 && (
          <button className="btn btn-lg" onClick={uploadAll} disabled={uploading}>
            <Zap size={18} />
            {uploading ? 'TRANSMITTING...' : `EXECUTE_ANALYSIS [${idleCount}]`}
          </button>
        )}
        {files.length > 0 && files.some(f => f.status === 'done') && (
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            RETURN_TO_COMMAND_CENTER
          </button>
        )}
      </div>

      <div className="card" style={{ marginTop:'var(--sp-10)', borderTop: '2px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
           <Cpu size={14} color="#555" />
           <h4 style={{ fontWeight:800, color:'#555', fontSize:'0.75rem', fontFamily: 'var(--font-mono)' }}>ANALYSIS_PROTOCOLS_ACTIVE</h4>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'var(--sp-3)' }}>
          {['ERROR_LEVEL_ELA','CLONE_MAP_DETECTION','OCR_ANOMALY_SCAN','EXIF_METADATA_EXTRACT','XAI_HEATMAP_GEN','PDF_INTEGRITY_CHECK'].map(t => (
            <div key={t} style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)', fontSize:'0.65rem', color:'#333', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color:'var(--neon-green)' }}>[OK]</span> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
