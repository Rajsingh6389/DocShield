import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Lock, Mail, Terminal, Cpu, Activity } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuthStore } from '../store/useStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [mode, setMode] = useState('login') 
  const [showPass, setShowPass] = useState(false)
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
    }, 120)
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#000', padding:'var(--sp-8)' }}>
        <div style={{ width:'100%', maxWidth:400, fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--neon-green)' }}>
          {bootLines.map((line, idx) => (
            <div key={idx} style={{ marginBottom: 10, opacity: 0.9 }}>{line}</div>
          ))}
          <div className="typewriter" style={{ width:'fit-content' }}>_</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--sp-6)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="scanline" />
      
      <div className="card neon-border-flow" style={{ width:'100%', maxWidth:400, padding:'var(--sp-10)', background: 'rgba(0,0,0,0.9)', position:'relative', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--neon-green)', boxShadow: 'var(--glow-green)' }} />
        
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'inline-flex', padding: 8, background: 'var(--neon-green)', marginBottom: 16 }}>
            <Shield size={32} color="#000" />
          </div>
          <h2 className="glitch" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '0.2em' }}>DOCUSHIELD</h2>
          <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)', fontWeight: 800, marginTop: 4, fontFamily:'var(--font-mono)' }}>SECURITY_LOGIN_UPLINK::CORE</div>
        </div>

        {mode !== '2fa' && (
          <div style={{ display:'flex', gap:'var(--sp-4)', marginBottom:'var(--sp-8)', borderBottom:'1px solid #111', paddingBottom:'var(--sp-2)' }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                background: 'none', border:'none', cursor:'pointer',
                fontWeight: 900, fontSize:'0.7rem', transition:'all var(--t-fast)',
                color: mode===m ? 'var(--neon-green)' : '#333',
                fontFamily: 'var(--font-mono)',
                textShadow: mode===m ? 'var(--glow-green)' : 'none'
              }}>{m === 'login' ? '[ AUTH_LOGIN ]' : '[ NEW_NODE ]'}</button>
            ))}
          </div>
        )}

        {loading ? (
           <div style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
             <div className="spin" style={{ width: 32, height: 32, border: '2px solid #111', borderTopColor: 'var(--neon-cyan)', margin: '0 auto var(--sp-4)' }} />
             <div style={{ color: 'var(--neon-cyan)', fontSize: '0.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }} className="blink">
               {mode === 'login' ? 'DECRYPTING_ACCESS_KEY...' : 'INITIALIZING_NEW_NODE...'}
             </div>
           </div>
        ) : (
          <>
            {mode === 'login' && (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="label" style={{ fontSize: '0.6rem', color: '#555' }}>IDENTIFIER</label>
                  <div style={{ position:'relative' }}>
                    <Mail size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#333' }} />
                    <input className="input" style={{ paddingLeft:32, border: '1px solid #111', background: '#050505', color: 'var(--neon-cyan)', fontSize: '0.8rem' }} type="email" placeholder="USER@NET.IO" value={form.email} onChange={set('email')} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label" style={{ fontSize: '0.6rem', color: '#555' }}>SECURITY_KEY</label>
                  <div style={{ position:'relative' }}>
                    <Lock size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#333' }} />
                    <input className="input" style={{ paddingLeft:32, border: '1px solid #111', background: '#050505', color: 'var(--neon-cyan)', fontSize: '0.8rem' }} type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={set('password')} required />
                  </div>
                </div>
                <button className="btn btn-lg" type="submit" style={{ width:'100%', marginTop:'var(--sp-4)' }}>
                  ESTABLISH_UPLINK
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="label" style={{ fontSize: '0.6rem', color: '#555' }}>FULL_NAME_ID</label>
                  <input className="input" style={{ border: '1px solid #111', background: '#050505', color: 'var(--neon-cyan)', fontSize: '0.8rem' }} type="text" placeholder="NAME" value={form.full_name} onChange={set('full_name')} required minLength={2} />
                </div>
                <div className="form-group">
                  <label className="label" style={{ fontSize: '0.6rem', color: '#555' }}>UPLINK_EMAIL</label>
                  <input className="input" style={{ border: '1px solid #111', background: '#050505', color: 'var(--neon-cyan)', fontSize: '0.8rem' }} type="email" placeholder="USER@NET.IO" value={form.email} onChange={set('email')} required />
                </div>
                <div className="form-group">
                  <label className="label" style={{ fontSize: '0.6rem', color: '#555' }}>ENCRYPTION_KEY</label>
                  <input className="input" style={{ border: '1px solid #111', background: '#050505', color: 'var(--neon-cyan)', fontSize: '0.8rem' }} type={showPass ? 'text':'password'} placeholder="SECRET_PHRASE" value={form.password} onChange={set('password')} required minLength={8} />
                </div>
                <button className="btn btn-lg" type="submit" style={{ width:'100%', marginTop:'var(--sp-4)' }}>
                  INITIALIZE_NODE
                </button>
              </form>
            )}

            {mode === '2fa' && (
              <form onSubmit={handle2FA}>
                <div style={{ textAlign:'center', marginBottom:'var(--sp-6)' }}>
                  <Shield size={32} color="var(--neon-green)" style={{ marginBottom: 'var(--sp-4)' }} />
                  <p style={{ color:'#555', fontSize:'0.7rem', fontFamily: 'var(--font-mono)' }}>MFA_TOKEN_REQUIRED</p>
                </div>
                <div className="form-group">
                  <input className="input" type="text" placeholder="000000" maxLength={6} value={form.totp_code} onChange={set('totp_code')} style={{ textAlign:'center', fontSize:'1.5rem', fontFamily:'var(--font-mono)', letterSpacing:'0.3em', background: '#050505', border: '1px solid #111', color: 'var(--neon-green)' }} required />
                </div>
                <button className="btn btn-lg" type="submit" style={{ width:'100%' }}>
                  BYPASS_SECURITY
                </button>
                <button type="button" onClick={() => setMode('login')} style={{ width:'100%', marginTop:'var(--sp-4)', background:'none', border:'none', color:'#333', cursor:'pointer', fontSize:'0.65rem', fontFamily: 'var(--font-mono)' }}>[ ABORT_AND_RETURN ]</button>
              </form>
            )}
          </>
        )}

        <div style={{ marginTop: 'var(--sp-8)', borderTop: '1px solid #111', paddingTop: 'var(--sp-4)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: '#333', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
             IP_LOGGING_ACTIVE | LATENCY: 24ms | STATUS: SECURE
          </div>
        </div>
      </div>

      {/* Visual Footer */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', color: '#222', fontSize: '0.6rem', fontFamily: 'var(--font-mono)' }}>
        <span>UPLINK_STATUS: ACTIVE</span>
        <span>LOCATION: [REDACTED]</span>
        <span>SESSION: {Math.random().toString(16).slice(2, 10).toUpperCase()}</span>
      </div>
    </div>
  )
}
