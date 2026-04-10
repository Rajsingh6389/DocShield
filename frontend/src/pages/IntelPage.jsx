import React, { useState } from 'react'
import { Search, ShieldAlert, ShieldCheck, User, CreditCard, MapPin, Phone, Lock, Terminal, Loader2, Tag, AtSign } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import api, { intelApi } from '../api/client'
import { ENDPOINTS } from '../urls/api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/useStore'
import { Loader } from '../components/ui/Loader'

export default function IntelPage() {
  const { user } = useAuthStore()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!phoneNumber) return
    
    setLoading(true)
    setResult(null)
    try {
      const res = await intelApi.phoneIntel(phoneNumber)
      setResult(res.data)
      toast.success('SIGNAL_INTERCEPTED')
    } catch (err) {
      toast.error('CONNECTION_LOST_OR_TIMEOUT')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 relative px-4 md:px-0">
      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Terminal size={14} className="text-cyber-green" />
          <span className="text-[10px] font-mono text-cyber-cyan tracking-[0.4em] uppercase font-bold">RECON_STATE :: INFILTRATION</span>
        </div>
        <h2 className="text-2xl md:text-4xl font-black font-hud text-white tracking-[0.2em] glitch uppercase mb-2">DATABASE_BREACH</h2>
        <p className="text-gray-500 text-xs font-mono tracking-widest opacity-60 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
          BYPASSING_GSM_SECURITY_PROTOCOLS...
        </p>
      </div>

      <Card className="mb-8 border-2 border-cyber-green/30 bg-black/40 backdrop-blur-md relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyber-green to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 relative z-10 p-2">
          <div className="relative flex-1">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-cyber-green/50" size={18} />
            <input 
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="TARGET_ID_IDENTIFIER..."
              className="w-full bg-black/60 border border-cyber-green/10 rounded-lg py-5 pl-14 pr-4 text-cyber-green font-mono placeholder:text-cyber-green/20 focus:outline-none focus:border-cyber-green/40 focus:ring-1 focus:ring-cyber-green/20 transition-all text-lg tracking-widest"
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading || !phoneNumber} 
            className="px-6 md:px-10 font-hud font-black tracking-[0.3em] bg-cyber-green/80 hover:bg-cyber-green text-black border-none shadow-[0_0_20px_rgba(0,255,149,0.3)] h-12 sm:h-auto"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'BREACH'}
          </Button>
        </form>
      </Card>

      <AnimatePresence mode='wait'>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 relative"
          >
             <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-cyber-green/10 cyber-grid opacity-20" />
             <div className="relative z-10 text-center">
                <Loader size="lg" text="DOWNLOADING_USER_TELEMETRY..." />
                <div className="mt-8 grid grid-cols-3 gap-8 w-64 mx-auto">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-0.5 bg-cyber-green/20 overflow-hidden">
                            <motion.div 
                                className="h-full bg-cyber-green"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 1 + i*0.5, ease: 'linear' }}
                            />
                        </div>
                    ))}
                </div>
                <div className="text-[9px] text-gray-600 font-mono mt-4 tracking-widest animate-pulse">
                    PARSING_PACKETS_FROM_SS7_GATEWAY...
                </div>
             </div>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <Card className="relative overflow-hidden border-2 border-white/10 cyber-grid bg-obsidian-900/80 p-0 shadow-[0_0_50px_rgba(0,0,0,1)]">
               {/* Scanline Animation */}
               <div className="scanline" />

               <div className="p-4 md:p-8 relative z-20">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-sm border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5">
                                <User className="text-cyber-cyan" size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-hud font-bold tracking-[0.4em] text-cyber-cyan">TARGET_DOSSIER_v4.2</h3>
                                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">ENCRYPTION: AES-256_RSA</div>
                            </div>
                        </div>

                        {result.is_masked ? (
                            <div className="flex items-center gap-2 text-cyber-yellow bg-cyber-yellow/5 border border-cyber-yellow/20 px-3 py-1.5 rounded-sm">
                                <Lock size={12} className="animate-pulse" />
                                <span className="text-[10px] font-bold font-mono tracking-[0.2em]">ACCESS_RESTRICTED</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={() => {
                                        const url = intelApi.downloadPdf(phoneNumber);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.setAttribute('download', `OSINT_REPORT_${phoneNumber}.pdf`);
                                        // Add token to headers if needed, but here it's a URL.
                                        // For simplicity, we assume the backend handles auth via Cookie or we provide token in URL if necessary.
                                        // Actually, our API interceptor adds Bearer token to requests, but for a direct link we might need a workaround.
                                        // Let's use fetch to get blob if token is required.
                                        toast.promise(
                                            (async () => {
                                                const response = await api.get(ENDPOINTS.INTEL.PHONE_PDF(phoneNumber), {
                                                    responseType: 'blob'
                                                });
                                                const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
                                                const tempLink = document.createElement('a');
                                                tempLink.href = blobUrl;
                                                tempLink.setAttribute('download', `OSINT_REPORT_${phoneNumber}.pdf`);
                                                document.body.appendChild(tempLink);
                                                tempLink.click();
                                                document.body.removeChild(tempLink);
                                            })(),
                                            {
                                                loading: 'GENERATING_PDF_DOSSIIER...',
                                                success: 'REPORT_DOWNLOADED',
                                                error: 'FILE_PROTECTION_FAULT'
                                            }
                                        );
                                    }}
                                    className="bg-cyber-cyan/10 hover:bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 text-[10px] h-8 px-4 font-HUD tracking-[0.2em]"
                                >
                                    GENERATE_PDF
                                </Button>
                                <div className="flex items-center gap-2 text-cyber-green bg-cyber-green/5 border border-cyber-green/20 px-3 py-1.5 rounded-sm whitespace-nowrap">
                                    <ShieldCheck size={12} className="animate-bounce" />
                                    <span className="text-[10px] font-bold font-mono tracking-[0.2em]">PRIVILEGED_ACCESS</span>
                                </div>
                            </div>
                        )}
                    </div>
                
                    {result.description && result.description !== 'N/A' && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-10 p-4 border border-cyber-cyan/20 bg-cyber-cyan/5 rounded-sm relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-cyber-cyan opacity-50" />
                            <div className="flex items-center gap-2 mb-2">
                                <Terminal size={12} className="text-cyber-cyan" />
                                <span className="text-[9px] font-hud font-bold text-cyber-cyan tracking-widest uppercase">SOURCE_INTEL_NOTICE</span>
                            </div>
                            <p className="text-[11px] font-mono text-gray-400 leading-relaxed uppercase tracking-wider">
                                {result.description}
                            </p>
                        </motion.div>
                    )}
                
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                            <DataField label="SUBJECT_NAME" value={result.name} icon={User} delay={0.1} />
                            <DataField label="PARENTAL_LINK" value={result.father_name} icon={User} delay={0.2} />
                            <DataField label="SUBJECT_ALIAS" value={result.nickname} icon={Tag} delay={0.25} />
                            <DataField label="DIGITAL_CORRESPONDENCE" value={result.email} icon={AtSign} delay={0.3} />
                            <DataField label="IDENT_PASSPORT" value={result.passport} icon={CreditCard} delay={0.35} />
                            <DataField label="GEO_SECTOR" value={result.region} icon={MapPin} delay={0.4} />
                            
                            <div className="sm:col-span-2">
                                <ListDataField 
                                    label="SIGNAL_INTERCEPT_POINTS" 
                                    values={result.phones && result.phones.length > 0 ? result.phones : [phoneNumber]} 
                                    icon={Phone} 
                                    delay={0.5} 
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <ListDataField 
                                    label="PRIMARY_RESIDENCE_COORDINATES" 
                                    values={result.addresses && result.addresses.length > 0 ? result.addresses : [result.address]} 
                                    icon={MapPin} 
                                    delay={0.6} 
                                />
                            </div>
                        </div>

                        <div className="border-l border-white/10 pl-8 hidden md:block space-y-6">
                            <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-4 font-bold">SYSTEM_STATUS</div>
                            <div className="flex items-center gap-4">
                                <div className="w-1 h-8 bg-cyber-green/50" />
                                <div className="text-[10px] font-mono uppercase tracking-tighter">SIGNAL_STRENGTH <br/> <span className="text-cyber-green font-bold">98.2%</span></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-1 h-8 bg-cyber-purple/50" />
                                <div className="text-[10px] font-mono uppercase tracking-tighter">DECRYPTION_RATE <br/> <span className="text-cyber-purple font-bold">1024 B/s</span></div>
                            </div>
                            <div className="mt-auto pt-10">
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-cyber-cyan" 
                                        initial={{ width: 0 }} 
                                        animate={{ width: '85%' }} 
                                        transition={{ duration: 2, delay: 0.5 }}
                                    />
                                </div>
                                <div className="text-[8px] font-mono text-gray-600 mt-2 tracking-widest">DUMP_RECOVERY_PROGRESS</div>
                            </div>
                        </div>
                    </div>

                    {result.is_masked && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8 }}
                            className="mt-12 p-6 border-2 border-cyber-red/20 bg-cyber-red/5 rounded backdrop-blur-sm relative group"
                        >
                            <div className="absolute inset-0 bg-cyber-red/5 animate-pulse transition-opacity" />
                            <div className="flex items-start gap-6 relative z-10">
                                <div className="w-12 h-12 flex items-center justify-center bg-cyber-red/10 border border-cyber-red/30 rounded-full animate-bounce">
                                    <ShieldAlert className="text-cyber-red" size={24} />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-cyber-red font-hud tracking-[0.5em] uppercase mb-2">CRITICAL_AUTHORIZATION_FAILURE</div>
                                    <p className="text-[11px] text-gray-400 font-mono leading-relaxed opacity-80 uppercase tracking-wider">
                                        RECONNAISSANCE_DATA_INTERCEPTED_BUT_PARTIALLY_LOCKED. <br/>
                                        REQUIREMENT: <span className="text-cyber-red font-bold underline">ROOT_ADMIN_ROLE</span> + <span className="text-cyber-red font-bold underline">BIO_SECURE_2FA</span>.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
               </div>
            </Card>

            {/* Display HTML Report if available */}
            {result.html_report && (
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                 >
                    <Card className="border-t-4 border-cyber-green relative overflow-hidden bg-black p-0 shadow-[0_0_40px_rgba(0,255,149,0.1)]">
                        <div className="p-4 bg-cyber-green/5 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-[10px] font-hud font-black tracking-[0.4em] text-cyber-green uppercase">RAW_DATA_HEX_STREAM</h3>
                            <div className="text-[8px] font-mono text-gray-600 tracking-widest">v2.0_RECO_EXTRACTOR</div>
                        </div>
                        <div 
                            className="bg-black text-cyber-green/80 p-8 overflow-auto max-h-[600px] font-mono text-[11px] leading-relaxed custom-scrollbar"
                            dangerouslySetInnerHTML={{ __html: result.html_report }}
                        />
                        <div className="absolute bottom-0 right-0 p-4 pointer-events-none opacity-10">
                            <Search className="text-cyber-green" size={120} />
                        </div>
                    </Card>
                 </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DataField({ label, value, icon: Icon, delay = 0 }) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="flex flex-col gap-2 group"
        >
            <div className="text-[9px] font-mono text-gray-500 tracking-[0.3em] uppercase flex items-center gap-2 group-hover:text-cyber-cyan transition-colors font-bold">
                <div className="w-1 h-1 bg-cyber-green rounded-full group-hover:bg-cyber-cyan group-hover:scale-150 transition-all shadow-[0_0_5px_rgba(0,255,149,0.5)]" /> 
                {label}
            </div>
            <div className={`text-xs md:text-sm font-mono font-bold tracking-widest break-all ${value?.includes('*') ? 'text-cyber-yellow/60 border-l-2 border-cyber-yellow/30 pl-3 italic bg-cyber-yellow/5 py-1' : 'text-white border-l-2 border-cyber-green/30 pl-3 bg-cyber-green/5 py-1'}`}>
                {value || '0xNULL'}
            </div>
        </motion.div>
    )
}

function ListDataField({ label, values, icon: Icon, delay = 0 }) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="flex flex-col gap-3 group"
        >
            <div className="text-[9px] font-mono text-gray-500 tracking-[0.3em] uppercase flex items-center gap-2 group-hover:text-cyber-cyan transition-colors font-bold">
                <div className="w-1 h-1 bg-cyber-green rounded-full group-hover:bg-cyber-cyan group-hover:scale-150 transition-all shadow-[0_0_5px_rgba(0,255,149,0.5)]" /> 
                {label}
            </div>
            <div className="space-y-2">
                {values.map((val, idx) => (
                    <div 
                        key={idx}
                        className={`text-xs md:text-sm font-mono font-bold tracking-widest break-all flex items-start gap-3 ${val?.includes('*') ? 'text-cyber-yellow/60 border-l-2 border-cyber-yellow/30 pl-3 italic bg-cyber-yellow/5 py-2' : 'text-white border-l-2 border-cyber-green/30 pl-3 bg-cyber-green/5 py-2'}`}
                    >
                        <Icon size={14} className={val?.includes('*') ? 'text-cyber-yellow/50 mt-1' : 'text-cyber-green/50 mt-1'} />
                        <span>{val || '0xNULL'}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    )
}
