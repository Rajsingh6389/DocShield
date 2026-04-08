import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, Mail, User, ShieldAlert, Cpu } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuthStore } from '../store/useStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [mode, setMode] = useState('login') 
  const [loading, setLoading] = useState(false)
  const [tempData, setTempData] = useState(null)
  const [bootLines, setBootLines] = useState([])
  const [showLogin, setShowLogin] = useState(false)

  const lines = [
    '> INITIALIZING_CORE_v2.0.4...',
    '> BYPASSING_SECURITY_LAYER_0...',
    '> ESTABLISHING_ENCRYPTED_TUNNEL...',
    '> PROTOCOL_77_HANDSHAKE: [SUCCESS]',
    '> LOADING_TELEMETRY_BUFFERS...',
    '> SCANNING_UP_LINK_FREQUENCIES...',
    '> SYSTEM_INTEGRITY: [COMPROMISED]',
    '> ACCESS_LEVEL: ROOT_ADMIN',
  ]

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < lines.length) {
        setBootLines(prev => [...prev, lines[i]])
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setShowLogin(true), 500)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const [form, setForm] = useState({ email: '', password: '', full_name: '', totp_code: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login({ email: form.email, password: form.password, totp_code: form.totp_code || undefined })
      if (data.requires_2fa) {
        setTempData({ email: form.email, password: form.password })
        setMode('2fa')
        return
      }
      setAuth(data.access_token, data.user)
      navigate('/dashboard')
      toast.success('UPLINK_ESTABLISHED')
    } catch (err) {
      toast.error('ACCESS_DENIED')
    } finally { setLoading(false) }
  }

  const handle2FA = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login({ ...tempData, totp_code: form.totp_code })
      setAuth(data.access_token, data.user)
      navigate('/dashboard')
      toast.success('MFA_VERIFIED')
    } catch (err) {
      toast.error('INVALID_TOKEN')
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.register({ email: form.email, password: form.password, full_name: form.full_name })
      toast.success('NODE_INITIALIZED')
      setMode('login')
    } catch (err) {
      toast.error('REGISTRATION_FAILURE')
    } finally { setLoading(false) }
  }

  if (!showLogin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-8 font-mono text-xs md:text-sm text-cyber-green relative overflow-hidden">
        <div className="w-full max-w-lg z-10">
          {bootLines.map((line, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="mb-2"
            >
              {line}
            </motion.div>
          ))}
          <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-2 h-4 bg-cyber-green" />
        </div>
        {/* Subtle background glow during boot */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,65,0.05)_0%,transparent_70%)] pointer-events-none" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Animated Background */}
      <div className="absolute inset-0 cyber-grid opacity-20 animate-matrix-rain pointer-events-none" />
      
      {/* Decorative ambient light */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-green/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <Card className="w-full max-w-md z-10 border-t border-t-cyber-green/50">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 rounded-2xl bg-cyber-green/10 flex items-center justify-center border border-cyber-green/30 shadow-[0_0_20px_rgba(0,255,65,0.2)] mb-4"
          >
            <Shield className="w-8 h-8 text-cyber-green" />
          </motion.div>
          
          <h1 className="text-2xl md:text-4xl font-hud font-bold text-white tracking-[0.3em] text-center drop-shadow-[0_0_15px_rgba(0,242,255,0.3)]">
            DOCUSHIELD
          </h1>
          <p className="text-cyber-cyan text-[10px] font-mono tracking-[0.4em] mt-3 opacity-80 uppercase">
            {mode === 'login' ? 'Security_Login_Uplink' : mode === 'register' ? 'New_Node_Initialization' : 'Multifactor_Challenge'}
          </p>
        </div>

        {/* Tab Navigation for Login / Register */}
        {mode !== '2fa' && (
          <div className="flex gap-4 mb-8 border-b border-white/5 pb-4">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 pb-2 text-sm font-hud font-bold tracking-widest uppercase transition-colors relative ${mode === 'login' ? 'text-cyber-green' : 'text-gray-500 hover:text-gray-300'}`}
            >
              [ Authenticate ]
              {mode === 'login' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyber-green drop-shadow-[0_0_8px_rgba(0,255,65,0.8)]" />}
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 pb-2 text-sm font-hud font-bold tracking-widest uppercase transition-colors relative ${mode === 'register' ? 'text-cyber-green' : 'text-gray-500 hover:text-gray-300'}`}
            >
              [ Initialize ]
              {mode === 'register' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyber-green drop-shadow-[0_0_8px_rgba(0,255,65,0.8)]" />}
            </button>
          </div>
        )}

        {/* Forms */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <Input
                  label="Identifier"
                  icon={Mail}
                  type="email"
                  placeholder="USER@NET.IO"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
                <Input
                  label="Security Key"
                  icon={Lock}
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <Button type="submit" isLoading={loading} className="w-full mt-4">
                  ESTABLISH UPLINK
                </Button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="flex flex-col gap-5">
                <Input
                  label="Full Name ID"
                  icon={User}
                  type="text"
                  placeholder="AGENT DESIGNATION"
                  value={form.full_name}
                  onChange={set('full_name')}
                  required
                  minLength={2}
                />
                <Input
                  label="Uplink Email"
                  icon={Mail}
                  type="email"
                  placeholder="USER@NET.IO"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
                <Input
                  label="Encryption Key"
                  icon={Lock}
                  type="password"
                  placeholder="SECRET_PHRASE"
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={8}
                />
                <Button type="submit" isLoading={loading} className="w-full mt-4">
                  INITIALIZE NODE
                </Button>
              </form>
            )}

            {mode === '2fa' && (
              <form onSubmit={handle2FA} className="flex flex-col gap-6">
                <div className="text-center">
                  <ShieldAlert className="w-12 h-12 text-cyber-green mx-auto mb-4" />
                  <p className="text-gray-400 text-sm font-mono tracking-widest uppercase">MFA Challenge Required</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <input 
                    type="text" 
                    placeholder="000000" 
                    maxLength={6} 
                    value={form.totp_code} 
                    onChange={set('totp_code')} 
                    className="w-full bg-obsidian-900/80 border border-white/10 rounded py-4 text-center text-3xl font-mono tracking-[0.5em] text-cyber-green focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan transition-all"
                    required 
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <Button type="submit" isLoading={loading} className="w-full">
                    BYPASS SECURITY
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setMode('login')} className="w-full">
                    ABORT & RETURN
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer telemetry */}
        <div className="mt-8 pt-4 border-t border-white/5 text-center flex flex-col gap-1 items-center justify-center">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono tracking-wider">
            <Cpu className="w-3 h-3 text-cyber-cyan animate-pulse" />
            IP LOGGING ACTIVE | LATENCY: {Math.floor(Math.random() * 30 + 10)}ms
          </div>
          <div className="text-[10px] text-cyber-green/50 font-mono tracking-widest uppercase">
            STATUS: SECURE
          </div>
        </div>
      </Card>
    </div>
  )
}
