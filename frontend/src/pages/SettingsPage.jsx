import React, { useState } from 'react'
import { authApi } from '../api/client'
import { Shield, Key, Lock, ShieldCheck, ShieldAlert, Terminal, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/useStore'
import { motion } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function SettingsPage() {
  const { user, setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [setupData, setSetupData] = useState(null)
  const [qrVisible, setQrVisible] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')

  const init2FA = async () => {
    setLoading(true)
    try {
      const { data } = await authApi.setup2fa()
      setSetupData(data)
      setQrVisible(true)
    } catch {
      toast.error('ERROR: 2FA_INIT_FAILURE')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.verify2fa(verifyCode)
      toast.success('MFA_ENROLLED_SUCCESSFULLY')
      setQrVisible(false)
      const updatedUser = { ...user, totp_enabled: true }
      setAuth(useAuthStore.getState().token, updatedUser)
    } catch {
      toast.error('ERROR: INVALID_TOKEN_VERIFICATION_FAILED')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!window.confirm('PROTOCOL_WARNING: THIS_WILL_LOWER_ACCOUNT_SECURITY. PROCEED?')) return
    setLoading(true)
    try {
      await authApi.disable2fa()
      toast.success('MFA_DISABLED_SUCCESSFULLY')
      const updatedUser = { ...user, totp_enabled: false }
      setAuth(useAuthStore.getState().token, updatedUser)
    } catch {
      toast.error('ERROR: DISABLE_FAILURE')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative max-w-4xl">
      <div className="mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={14} className="text-cyber-green animate-pulse" />
          <span className="text-[10px] font-mono text-cyber-cyan tracking-widest uppercase">SECURE_CONFIG::UPLINK_SETTINGS_v1.0</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black font-hud text-white tracking-[0.1em] sm:tracking-widest neon-text-glow uppercase break-words">SECURITY_CONFIG</h2>
        <p className="text-gray-400 text-sm font-mono mt-1 opacity-80 uppercase">MANAGE_AUTHENTICATION_LEVELS_AND_ENCRYPTION_SETTINGS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="h-full">
            <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
              <Shield size={16} className="text-cyber-cyan" />
              <h3 className="text-sm font-bold font-hud tracking-widest text-cyber-cyan uppercase">MULTI_FACTOR_AUTHENTICATION (MFA)</h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
              <div className={`
                w-20 h-20 shrink-0 flex items-center justify-center border-2 transition-all duration-500
                ${user?.totp_enabled ? 'border-cyber-green bg-cyber-green/5 shadow-[0_0_20px_rgba(0,255,149,0.2)]' : 'border-cyber-red bg-cyber-red/5 shadow-[0_0_20px_rgba(255,51,102,0.2)]'}
              `}>
                {user?.totp_enabled ? (
                  <ShieldCheck size={40} className="text-cyber-green" />
                ) : (
                  <ShieldAlert size={40} className="text-cyber-red" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${user?.totp_enabled ? 'bg-cyber-green shadow-[0_0_8px_rgba(0,255,149,0.8)]' : 'bg-cyber-red shadow-[0_0_8px_rgba(255,51,102,0.8)] animate-pulse'}`} />
                  <span className="text-xs font-black font-mono tracking-widest text-white uppercase">
                    STATUS: {user?.totp_enabled ? 'SECURED' : 'VULNERABLE'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono leading-relaxed max-w-md">
                  {user?.totp_enabled 
                    ? 'Bi-layered cryptographic authentication is active. Access to this node requires a rotating time-based token.' 
                    : 'System is currently exposed. Secondary verification layer is offline. Unauthorized access risk is CRITICAL.'}
                </p>
              </div>

              <div className="w-full sm:w-auto mt-4 sm:mt-0">
                {user?.totp_enabled ? (
                  <Button variant="danger" size="sm" onClick={handleDisable} isLoading={loading} className="w-full sm:w-auto">
                    DISABLE_PROTOCOL
                  </Button>
                ) : (
                  <Button size="sm" onClick={init2FA} isLoading={loading} className="w-full sm:w-auto">
                    INITIALIZE_MFA
                  </Button>
                )}
              </div>
            </div>

            {qrVisible && setupData && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 p-8 bg-black/40 border border-white/5 rounded-lg relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Terminal size={100} className="text-cyber-green" />
                </div>

                <div className="flex flex-col lg:flex-row gap-10 items-center lg:items-start relative z-10">
                  <div className="p-3 bg-white rounded shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <img src={`data:image/png;base64,${setupData.qr_code_base64}`} alt="QR Code" className="w-40 h-40 mix-blend-multiply" />
                  </div>
                  
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 mb-4">
                       <Smartphone size={16} className="text-cyber-green" />
                       <span className="text-xs font-bold text-cyber-green font-hud tracking-widest uppercase">MFA_UPLINK_READY</span>
                    </div>
                    
                    <div className="mb-6">
                      <span className="text-[10px] text-gray-500 font-bold font-mono tracking-widest uppercase mb-2 block">SECRET_UPLINK_KEY</span>
                      <div className="bg-obsidian-900 border border-white/10 p-4 text-cyber-cyan font-mono text-sm tracking-[0.2em] break-all select-all flex items-center justify-between">
                        {setupData.secret}
                        <Key size={14} className="opacity-30" />
                      </div>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                      <Input 
                        label="VERIFICATION_TOKEN"
                        placeholder="XXXXXX"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        className="text-center tracking-[0.5em]"
                        required
                      />
                      <Button type="submit" isLoading={loading} className="w-full">
                        FINALIZE_ENROLLMENT
                      </Button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}
          </Card>
        </div>

        <div className="md:col-span-1 space-y-8">
          <Card className="border-t-2 border-green-500/20">
            <div className="flex items-center gap-2 mb-6">
              <Smartphone size={16} className="text-gray-500" />
              <h4 className="text-[10px] font-hud font-bold text-gray-500 tracking-widest uppercase">RECOMMENDED_CLIENTS</h4>
            </div>
            <div className="flex flex-col gap-4">
              {['Google Authenticator', 'Authy', 'Microsoft Auth', 'FreeOTP'].map(app => (
                <div key={app} className="flex items-center justify-between group">
                  <span className="text-[10px] font-mono text-gray-400 group-hover:text-white transition-colors">{app.toUpperCase()}</span>
                  <div className="h-0.5 w-8 bg-white/5 group-hover:bg-cyber-green/30 transition-all" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-cyber-red/5 border-cyber-red/20 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
             <div className="flex items-center gap-2 mb-4 text-cyber-red">
                <ShieldAlert size={16} />
                <span className="text-[10px] font-hud font-bold tracking-widest uppercase">CRITICAL_THREATS</span>
             </div>
             <p className="text-[9px] font-mono text-gray-500 leading-relaxed uppercase">
                BRUTE_FORCE_PROTECTION: ON <br/>
                IP_GEOLOCATION_LOCK: OFF <br/>
                SESSION_TTL: 3600S
             </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
