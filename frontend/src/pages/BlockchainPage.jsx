import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Database, ShieldCheck, ShieldAlert, Upload, Loader, CheckCircle, Zap, Terminal, Hash } from 'lucide-react'
import { blockchainApi } from '../api/client'
import { useAuthStore } from '../store/useStore'
import toast from 'react-hot-toast'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { motion } from 'framer-motion'

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
    <div className="relative">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Database size={14} className="text-cyber-cyan" />
          <span className="text-[10px] font-mono text-cyber-cyan tracking-widest uppercase">BLOCKCHAIN_LEDGER :: INTEGRITY_SERVICE</span>
        </div>
        <p className="text-gray-400 text-sm font-mono mt-1 opacity-80 uppercase">IMMUTABLE_DOCUMENT_REGISTRATION_AND_HASH_VALIDATION_PROTOCOL</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Admin Register Section */}
        {isAdmin && (
          <Card className="border-t-2 border-t-cyber-green animate-glow-green">
            <div className="flex items-center gap-3 mb-6">
               <ShieldCheck size={20} className="text-cyber-green" />
               <h3 className="text-sm font-hud font-bold text-white tracking-widest uppercase">ADMIN_REGISTRATION</h3>
            </div>
            
            <div 
              {...getRegProps()} 
              className={`
                p-8 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer
                ${isRegActive ? 'border-cyber-green bg-cyber-green/5' : 'border-white/10 bg-black/30 hover:border-cyber-green/30 hover:bg-black/40'}
              `}
            >
               <input {...getRegInput()} />
               <Upload className={`w-8 h-8 ${regFile ? 'text-cyber-green' : 'text-gray-600'}`} />
               {regFile ? (
                 <div className="text-cyber-green text-xs font-bold font-mono tracking-widest text-center">
                    {regFile.name.toUpperCase()} <br/> [READY_FOR_LEDGER]
                 </div>
               ) : (
                 <div className="text-gray-500 text-[10px] font-bold font-mono tracking-widest text-center">
                    DROP_MASTER_DOCUMENT_TO_REGISTER
                 </div>
               )}
            </div>

            <Button 
              className="w-full mt-6" 
              isLoading={registering}
              disabled={!regFile}
              onClick={handleRegister}
            >
               {registering ? 'REGISTERING...' : 'REGISTER_ON_BLOCKCHAIN'}
            </Button>
          </Card>
        )}

        {/* User Verify Section */}
        <Card className={`border-t-2 border-t-cyber-cyan ${!isAdmin ? 'lg:col-span-2' : ''}`}>
           <div className="flex items-center gap-3 mb-6">
               <Hash size={20} className="text-cyber-cyan" />
               <h3 className="text-sm font-hud font-bold text-white tracking-widest uppercase">INTEGRITY_CHECK</h3>
            </div>

            <div 
              {...getVerProps()} 
              className={`
                p-8 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer
                ${isVerActive ? 'border-cyber-cyan bg-cyber-cyan/5' : 'border-white/10 bg-black/30 hover:border-cyber-cyan/30 hover:bg-black/40'}
              `}
            >
               <input {...getVerInput()} />
               <ShieldCheck className={`w-8 h-8 ${verifyFile ? 'text-cyber-cyan' : 'text-gray-600'}`} />
               {verifyFile ? (
                 <div className="text-cyber-cyan text-xs font-bold font-mono tracking-widest text-center">
                    {verifyFile.name.toUpperCase()} <br/> [PAYLOAD_LOADED]
                 </div>
               ) : (
                 <div className="text-gray-500 text-[10px] font-bold font-mono tracking-widest text-center">
                    UPLOAD_DOCUMENT_FOR_VERIFICATION
                 </div>
               )}
            </div>

            <Button 
              variant="secondary"
              className="w-full mt-6" 
              isLoading={verifying}
              disabled={!verifyFile}
              onClick={handleVerify}
            >
               {verifying ? 'VERIFYING...' : 'VERIFY_INTEGRITY'}
            </Button>
        </Card>

        {/* Result Section */}
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <Card className={`border-l-[6px] ${result.verified ? 'border-l-cyber-green bg-cyber-green/5' : 'border-l-cyber-red bg-cyber-red/5'}`}>
               <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className={`
                    w-20 h-20 shrink-0 flex items-center justify-center border-2
                    ${result.verified ? 'border-cyber-green bg-cyber-green/10 text-cyber-green shadow-[0_0_20px_rgba(0,255,149,0.2)]' : 'border-cyber-red bg-cyber-red/10 text-cyber-red shadow-[0_0_20px_rgba(255,51,102,0.2)]'}
                  `}>
                     {result.verified ? <ShieldCheck size={40} /> : <ShieldAlert size={40} />}
                  </div>
                  
                  <div className="flex-1">
                     <div className="flex items-center flex-wrap gap-3 mb-2">
                        <span className={`px-3 py-1 text-[10px] font-black tracking-widest uppercase ${result.verified ? 'bg-cyber-green text-black' : 'bg-cyber-red text-white'}`}>
                          STATUS::{result.status}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono tracking-wider">TIMESTAMP: {new Date().toISOString()}</span>
                     </div>
                     <h4 className="text-xl font-hud font-bold text-white tracking-widest mb-2">
                        {result.verified ? 'DOCUMENT_INTEGRITY_CONFIRMED' : 'TAMPER_ANOMALY_DETECTED'}
                     </h4>
                     <p className="text-gray-400 text-sm font-mono leading-relaxed mb-6">{result.message}</p>
                     
                     {result.verified && (
                       <div className="bg-black/40 border border-white/5 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                             <Terminal size={14} className="text-cyber-cyan" />
                             <span className="text-[10px] text-cyber-cyan font-bold font-mono tracking-widest uppercase">BLOCKCHAIN_TX_DATA</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8">
                             <div className="flex flex-col">
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">TX_HASH</span>
                                <span className="text-[10px] text-gray-300 font-mono break-all">{result.transaction_id}</span>
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">FILE_ID</span>
                                <span className="text-[10px] text-gray-300 font-mono truncate">{result.original_filename}</span>
                             </div>
                             <div className="flex flex-col md:col-span-2 mt-2 pt-2 border-t border-white/5">
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">LEDGER_TIMESTAMP</span>
                                <span className="text-[10px] text-gray-300 font-mono">{new Date(result.registered_at).toLocaleString()}</span>
                             </div>
                          </div>
                       </div>
                     )}
                  </div>
               </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Info Footer */}
      <Card className="bg-black/20">
         <div className="flex items-center gap-2 mb-6">
            <Terminal size={16} className="text-gray-500" />
            <h4 className="text-xs font-hud font-bold text-gray-500 tracking-widest uppercase">LEDGER_PROTOCOLS</h4>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              'SHA256_HASH_VERIFICATION',
              'IMMUTABLE_LOG_ENTRY',
              'TX_CONSENSUS_SIMULATION',
              'DISTRIBUTED_INTEGRITY_CHECK',
              'TAMPER_PROOF_TIMESTAMPS'
            ].map(t => (
              <div key={t} className="flex items-center gap-2 text-[10px] text-gray-600 font-mono font-bold tracking-widest uppercase">
                <span className="text-cyber-cyan/40">[{Math.random() > 0.5 ? 'OK' : 'SYNC'}]</span> {t}
              </div>
            ))}
         </div>
      </Card>
    </div>
  )
}
