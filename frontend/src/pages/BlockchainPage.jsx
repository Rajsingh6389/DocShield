import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Database, ShieldCheck, ShieldAlert, Upload, Loader, CheckCircle, Zap, Terminal, Hash } from 'lucide-react'
import { blockchainApi } from '../api/client'
import { useAuthStore } from '../store/useStore'
import toast from 'react-hot-toast'

const ACCEPTED = { 'image/*': ['.jpg','.jpeg','.png','.tiff','.bmp'], 'application/pdf': ['.pdf'] }

export default function BlockchainPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  
  const [registering, setRegistering] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState(null)
  
  const [regFile, setRegFile] = useState(null)
  const [verifyFile, setVerifyFile] = useState(null)

  const onDropRegister = useCallback((acc) => setRegFile(acc[0]), [])
  const onDropVerify = useCallback((acc) => {
    setVerifyFile(acc[0])
    setResult(null)
  }, [])

  const { getRootProps: getRegProps, getInputProps: getRegInput, isDragActive: isRegActive } = useDropzone({ 
    onDrop: onDropRegister, multiple: false, accept: ACCEPTED 
  })
  
  const { getRootProps: getVerProps, getInputProps: getVerInput, isDragActive: isVerActive } = useDropzone({ 
    onDrop: onDropVerify, multiple: false, accept: ACCEPTED 
  })

  const handleRegister = async () => {
    if (!regFile) return
    setRegistering(true)
    const fd = new FormData()
    fd.append('file', regFile)
    try {
      const { data } = await blockchainApi.register(fd)
      toast.success('DOCUMENT_REGISTERED_ON_BLOCKCHAIN')
      setRegFile(null)
    } catch (err) {
      toast.error('REGISTRATION_FAILED: ' + (err.response?.data?.detail || 'SYSTEM_ERROR'))
    } finally {
      setRegistering(false)
    }
  }

  const handleVerify = async () => {
    if (!verifyFile) return
    setVerifying(true)
    const fd = new FormData()
    fd.append('file', verifyFile)
    try {
      const { data } = await blockchainApi.verify(fd)
      setResult(data)
    } catch (err) {
      toast.error('VERIFICATION_FAILED: ' + (err.response?.data?.detail || 'SYSTEM_ERROR'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fade-in scanline">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <Database size={14} color="var(--neon-cyan)" />
          <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>BLOCKCHAIN_LEDGER :: INTEGRITY_SERVICE</span>
        </div>
        <h2 className="glitch" style={{ fontSize: '1.75rem', fontWeight: 900 }}>BLOCKCHAIN_VERIFY</h2>
        <p className="page-subtitle typewriter" style={{ width: 'fit-content' }}>IMMUTABLE_DOCUMENT_REGISTRATION_AND_HASH_VALIDATION_PROTOCOL</p>
      </div>

      <div className="dashboard-grid">
        {/* Admin Register Section */}
        {isAdmin && (
          <div className="card neon-border-flow">
            <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-3)', marginBottom:'var(--sp-6)' }}>
               <ShieldCheck size={20} color="var(--neon-green)" />
               <h3 style={{ fontSize:'0.9rem', color:'#fff', fontWeight:900, fontFamily: 'var(--font-mono)' }}>ADMIN_REGISTRATION</h3>
            </div>
            
            <div {...getRegProps()} className={`upload-zone ${isRegActive ? 'active' : ''}`} style={{ padding:'var(--sp-8)', border:'1px dashed #222', background:'rgba(0,0,0,0.3)', textAlign:'center', cursor:'pointer' }}>
               <input {...getRegInput()} />
               {regFile ? (
                 <div style={{ color:'var(--neon-green)', fontSize:'0.75rem', fontWeight:800, fontFamily: 'var(--font-mono)' }}>
                    {regFile.name.toUpperCase()} [READY]
                 </div>
               ) : (
                 <div style={{ color:'#444', fontSize:'0.7rem', fontWeight:800, fontFamily: 'var(--font-mono)' }}>
                    DROP_MASTER_DOCUMENT_TO_REGISTER
                 </div>
               )}
            </div>

            <button 
              className="btn btn-lg" 
              style={{ width:'100%', marginTop:'var(--sp-4)' }} 
              disabled={!regFile || registering}
              onClick={handleRegister}
            >
               {registering ? <Loader size={16} className="spin" /> : <Zap size={16} />}
               {registering ? 'REGISTERING...' : 'REGISTER_ON_BLOCKCHAIN'}
            </button>
          </div>
        )}

        {/* User Verify Section */}
        <div className={`card ${isAdmin ? '' : 'neon-border-flow'}`} style={{ gridColumn: isAdmin ? 'auto' : 'span 2' }}>
           <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-3)', marginBottom:'var(--sp-6)' }}>
               <Hash size={20} color="var(--neon-cyan)" />
               <h3 style={{ fontSize:'0.9rem', color:'#fff', fontWeight:900, fontFamily: 'var(--font-mono)' }}>INTEGRITY_CHECK</h3>
            </div>

            <div {...getVerProps()} className={`upload-zone ${isVerActive ? 'active' : ''}`} style={{ padding:'var(--sp-8)', border:'1px dashed #222', background:'rgba(0,0,0,0.3)', textAlign:'center', cursor:'pointer' }}>
               <input {...getVerInput()} />
               {verifyFile ? (
                 <div style={{ color:'var(--neon-cyan)', fontSize:'0.75rem', fontWeight:800, fontFamily: 'var(--font-mono)' }}>
                    {verifyFile.name.toUpperCase()} [LOADED]
                 </div>
               ) : (
                 <div style={{ color:'#444', fontSize:'0.7rem', fontWeight:800, fontFamily: 'var(--font-mono)' }}>
                    UPLOAD_DOCUMENT_FOR_VERIFICATION
                 </div>
               )}
            </div>

            <button 
              className="btn btn-secondary btn-lg" 
              style={{ width:'100%', marginTop:'var(--sp-4)', borderColor:'var(--neon-cyan)', color:'var(--neon-cyan)' }} 
              disabled={!verifyFile || verifying}
              onClick={handleVerify}
            >
               {verifying ? <Loader size={16} className="spin" /> : <ShieldCheck size={16} />}
               {verifying ? 'VERIFYING...' : 'VERIFY_INTEGRITY'}
            </button>
        </div>

        {/* Result Section */}
        {result && (
          <div className="card fade-in" style={{ gridColumn: 'span 2', borderLeft: `4px solid ${result.verified ? 'var(--neon-green)' : 'var(--neon-red)'}` }}>
             <div style={{ display:'flex', alignItems:'flex-start', gap:'var(--sp-6)' }}>
                <div style={{ 
                  width:60, height:60, borderRadius:0, 
                  background: result.verified ? 'rgba(0,255,65,0.05)' : 'rgba(255,49,49,0.05)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: `inset 0 0 0 1px ${result.verified ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                  boxShadow: result.verified ? 'var(--glow-green)' : 'var(--glow-red)'
                }}>
                   {result.verified ? <ShieldCheck size={32} color="var(--neon-green)" /> : <ShieldAlert size={32} color="var(--neon-red)" />}
                </div>
                <div style={{ flex:1 }}>
                   <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-3)', marginBottom:'var(--sp-2)' }}>
                      <span style={{ 
                        fontSize:'0.6rem', padding:'2px 6px', 
                        background: result.verified ? 'var(--neon-green)' : 'var(--neon-red)', 
                        color:'#000', fontWeight:900, fontFamily: 'var(--font-mono)' 
                      }}>
                        STATUS::{result.status}
                      </span>
                      <span style={{ fontSize:'0.65rem', color:'#444', fontFamily: 'var(--font-mono)' }}>TIMESTAMP: {new Date().toISOString()}</span>
                   </div>
                   <h4 style={{ color:'#fff', fontWeight:900, fontSize:'1.1rem', marginBottom:'var(--sp-2)' }}>
                      {result.verified ? 'DOCUMENT_INTEGRITY_CONFIRMED' : 'TAMPER_ANOMALY_DETECTED'}
                   </h4>
                   <p style={{ color:'#888', fontSize:'0.75rem', lineHeight:1.5 }}>{result.message}</p>
                   
                   {result.verified && (
                     <div style={{ marginTop:'var(--sp-4)', padding:'var(--sp-3)', background:'var(--bg-card-h)', boxShadow:'inset 0 0 0 1px var(--border-ghost)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                           <Terminal size={12} color="var(--neon-cyan)" />
                           <span style={{ fontSize:'0.6rem', color:'var(--neon-cyan)', fontWeight:800, fontFamily: 'var(--font-mono)' }}>BLOCKCHAIN_TX_DATA</span>
                        </div>
                        <div style={{ fontSize:'0.6rem', color:'#444', fontFamily: 'var(--font-mono)', overflowWrap:'break-word' }}>
                           TX_ID: {result.transaction_id}<br/>
                           ORIGINAL_NAME: {result.original_filename}<br/>
                           REGISTERED_AT: {new Date(result.registered_at).toLocaleString()}
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="card" style={{ marginTop:'var(--sp-10)', borderTop: '2px solid #222' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
            <Terminal size={14} color="#555" />
            <h4 style={{ fontWeight:800, color:'#555', fontSize:'0.75rem', fontFamily: 'var(--font-mono)' }}>LEDGER_PROTOCOLS</h4>
         </div>
         <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'var(--sp-3)' }}>
            {[
              'SHA256_HASH_VERIFICATION',
              'IMMUTABLE_LOG_ENTRY',
              'TX_CONSENSUS_SIMULATION',
              'DISTRIBUTED_INTEGRITY_CHECK',
              'TAMPER_PROOF_TIMESTAMPS'
            ].map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)', fontSize:'0.65rem', color:'#333', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color:'var(--neon-cyan)' }}>[SYSTEM]</span> {t}
              </div>
            ))}
         </div>
      </div>
    </div>
  )
}
