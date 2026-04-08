import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, XCircle, Zap, Terminal, Cpu, Activity } from 'lucide-react'
import { documentsApi } from '../api/client'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Loader } from '../components/ui/Loader'

const ACCEPTED = { 'image/*': ['.jpg','.jpeg','.png','.tiff','.bmp'], 'application/pdf': ['.pdf'] }

const PHASES = ['UPLOADING', 'SCANNING', 'THREAT DETECTION', 'VERIFICATION', 'REPORT GENERATION']

const FAKE_LOGS = [
  '[SYS] Initializing Quantum Analysis Uplink...',
  '[SYS] Routing document to secure sandbox ENCLAVE_9...',
  '[ELA] Running Error Level Analysis (Pixel recompression)...',
  '[OCR] Extracting and verifying text integrity...',
  '[ML] Neural clone detection in progress...',
  '[NET] Connecting to decentralized ledger...',
  '[VERIFY] Cryptographic hash check passed.',
  '[SYS] Finalizing telemetry and constructing HUD...'
]

export default function UploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([]) 
  const [uploading, setUploading] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [logs, setLogs] = useState([])

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.map(f => ({ file: f, status: 'idle', progress: 0, docId: null }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true, accept: ACCEPTED, maxSize: 20 * 1024 * 1024, disabled: uploading
  })

  // Simulated fake terminal logs effect
  useEffect(() => {
    if (uploading) {
      setLogs([])
      setPhaseIndex(0)
      let logIdx = 0
      
      const logInterval = setInterval(() => {
        if (logIdx < FAKE_LOGS.length) {
          setLogs(prev => [...prev, FAKE_LOGS[logIdx]])
          logIdx++
          // Roughly map log index to phase index (just for UI)
          if (logIdx === 2) setPhaseIndex(1)
          if (logIdx === 4) setPhaseIndex(2)
          if (logIdx === 6) setPhaseIndex(3)
        } else {
          clearInterval(logInterval)
        }
      }, 800)

      return () => clearInterval(logInterval)
    }
  }, [uploading])

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
        setPhaseIndex(4) // Report phase
        setFiles(prev => prev.map((f, fi) => fi === idx ? { ...f, status: 'done', docId: data.id } : f))
      } catch {
        setFiles(prev => prev.map((f, fi) => fi === idx ? { ...f, status: 'error' } : f))
        toast.error(`ERROR_UPLINK_FAILURE: ${toUpload[i].file.name.toUpperCase()}`)
      }
    }
    setTimeout(() => { setUploading(false) }, 1000)
  }

  const clear = () => !uploading && setFiles([])
  const idleCount = files.filter(f => f.status === 'idle').length

  return (
    <div className="relative pb-24">
      {/* Header */}
      <div className="mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={14} className="text-cyber-green animate-pulse" />
          <span className="text-[10px] font-mono text-cyber-cyan tracking-widest uppercase">Uplink_Status: READY</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black font-hud text-white tracking-widest neon-text-glow uppercase">Secure_Upload</h2>
        <p className="text-gray-400 text-sm font-mono mt-1 opacity-80 uppercase">INITIALIZING_QUANTUM_ANALYSIS_UPLINK</p>
      </div>

      <AnimatePresence mode="wait">
        {!uploading ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className={`
              border-dashed border-2 mb-8 transition-colors text-center cursor-pointer p-12
              ${isDragActive ? 'border-cyber-green bg-cyber-green/5' : 'border-white/10 bg-obsidian-800/40 hover:border-cyber-cyan/30'}
            `}>
              <div {...getRootProps()} className="flex flex-col items-center justify-center outline-none min-h-[200px]">
                <input {...getInputProps()} />
                <motion.div 
                  animate={isDragActive ? { y: [0, -10, 0] } : {}} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 bg-cyber-cyan/10 rounded-full flex items-center justify-center mb-6"
                >
                  <Upload size={32} className={isDragActive ? 'text-cyber-green' : 'text-cyber-cyan'} />
                </motion.div>
                <h3 className={`text-xl font-hud font-bold tracking-widest uppercase mb-2 ${isDragActive ? 'text-cyber-green neon-text-glow' : 'text-white'}`}>
                  {isDragActive ? '>>> TARGET_LOCK_CORE_DNA <<<' : 'INITIATE_DOCUMENT_UPLINK'}
                </h3>
                <p className="text-sm font-mono text-gray-500 uppercase">
                  {isDragActive ? 'SOURCE_READY_FOR_TRANSMISSION' : 'DRAG_AND_DROP_LEGAL_ASSETS_HERE_OR_CLICK_TO_SCAN'}
                </p>
                <div className="flex gap-2 justify-center mt-6">
                  {['JPG','PNG','PDF','TIFF','BMP'].map(fmt => (
                    <span key={fmt} className="text-[10px] font-mono tracking-wider bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-400">
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
          >
            {/* Fake Terminal & Progress */}
            <Card className="flex flex-col border-cyber-cyan/30 shadow-[0_0_30px_rgba(0,229,255,0.1)] relative overflow-hidden">
              <div className="absolute inset-0 cyber-grid opacity-10 animate-scanline pointer-events-none" />
              
              <h3 className="text-sm font-bold font-hud tracking-widest text-cyber-cyan mb-6 flex items-center gap-2 relative z-10">
                <Terminal size={18} />
                LIVE_ANALYSIS_STREAM
              </h3>
              
              {/* Stepper */}
              <div className="flex flex-col gap-4 mb-8 relative z-10">
                {PHASES.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold font-mono transition-colors
                      ${i < phaseIndex ? 'bg-cyber-green text-black border-cyber-green' : 
                        i === phaseIndex ? 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]' : 
                        'bg-obsidian-900 text-gray-600 border-white/10'}
                    `}>
                      {i < phaseIndex ? <CheckCircle size={12} /> : i + 1}
                    </div>
                    <span className={`text-xs font-mono tracking-widest ${i <= phaseIndex ? 'text-white' : 'text-gray-600'}`}>{p}</span>
                    {i === phaseIndex && <Loader size="sm" className="ml-auto scale-50" />}
                  </div>
                ))}
              </div>

              {/* Terminal Logs */}
              <div className="mt-auto bg-black border border-white/10 rounded overflow-hidden relative z-10 h-40 flex flex-col justify-end p-4 font-mono text-[10px] text-cyber-green/80">
                {logs.map((log, i) => (
                  <motion.div key={i} initial={{ opacity:0, x:-5 }} animate={{ opacity:1, x:0 }}>
                    {log}
                  </motion.div>
                ))}
                <div className="w-2 h-3 bg-cyber-green animate-pulse mt-1" />
              </div>
            </Card>

            {/* Skeleton Loading Panel */}
            <Card className="flex flex-col gap-6">
              <h3 className="text-sm font-bold font-hud tracking-widest text-white mb-2">NEURAL_DECONSTRUCTION</h3>
              
              {/* Skeleton Cards */}
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/5 rounded border border-white/5 p-4 flex gap-4 overflow-hidden relative">
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }} 
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                  />
                  <div className="w-12 h-12 bg-white/10 rounded shrink-0" />
                  <div className="flex-1 flex flex-col justify-center gap-2">
                    <div className="h-3 w-3/4 bg-white/10 rounded" />
                    <div className="h-2 w-1/2 bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Buffer */}
      {files.length > 0 && !uploading && (
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <h3 className="font-hud font-bold tracking-widest text-white uppercase">TRANSMISSION_BUFFER [{files.length}]</h3>
            <Button variant="danger" size="sm" onClick={clear}>PURGE</Button>
          </div>
          <div className="flex flex-col gap-3">
             {files.map((item, i) => (
               <div key={i} className={`
                 flex items-center gap-4 p-3 rounded bg-obsidian-900 border-l-2
                 ${item.status === 'done' ? 'border-cyber-green' : item.status === 'error' ? 'border-cyber-red' : 'border-cyber-cyan'}
               `}>
                 <FileText size={18} className={item.status === 'done' ? 'text-cyber-green' : 'text-cyber-cyan'} />
                 <div className="flex-1 min-w-0">
                   <div className="text-xs font-bold text-gray-300 font-mono truncate uppercase">{item.file.name}</div>
                   <div className="text-[10px] text-gray-500 font-mono mt-1">{(item.file.size/1024/1024).toFixed(2)} MB</div>
                 </div>
                 {item.status === 'done' && item.docId && (
                   <Button size="sm" onClick={() => navigate(`/results/${item.docId}`)}>OPEN_REPORT</Button>
                 )}
               </div>
             ))}
          </div>
        </Card>
      )}

      {/* Action Bar */}
      <div className="flex gap-4 items-center">
        {idleCount > 0 && !uploading && (
          <Button onClick={uploadAll} className="w-64">
            <Zap size={18} className="mr-2" />
            EXECUTE DEEP SCAN
          </Button>
        )}
      </div>
    </div>
  )
}
