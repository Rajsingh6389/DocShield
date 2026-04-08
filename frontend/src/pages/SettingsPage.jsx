import React, { useEffect, useState } from 'react'
import { authApi } from '../api/client'
import { Shield, Key, Lock, ShieldCheck, ShieldAlert, Terminal, RefreshCw, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/useStore'

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
      // Refresh user data (if needed, or just update local state if safe)
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
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <Lock size={14} color="var(--neon-green)" />
          <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700 }}>SECURE_CONFIG::UPLINK_SETTINGS_v1.0</span>
        </div>
        <h2 className="glitch" style={{ fontSize: '1.75rem', fontWeight: 900 }}>SECURITY_CONFIG</h2>
        <p className="page-subtitle typewriter" style={{ width: 'fit-content' }}>MANAGE_AUTHENTICATION_LEVELS_AND_ENCRYPTION_SETTINGS</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)', paddingBottom: 'var(--sp-3)', boxShadow: 'inset 0 -1px 0 var(--border-ghost)' }}>
          <Shield size={16} color="var(--neon-cyan)" />
          <h3 style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)' }}>MULTI_FACTOR_AUTHENTICATION (MFA)</h3>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, background: 'var(--bg-hud)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user?.totp_enabled ? (
              <ShieldCheck size={32} color="var(--neon-green)" />
            ) : (
              <ShieldAlert size={32} color="var(--neon-red)" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              STATUS: {user?.totp_enabled ? 'SECURED' : 'VULNERABLE'}
            </div>
            <p style={{ fontSize: '0.7rem', color: '#444', margin: 0, fontFamily: 'var(--font-mono)' }}>
              {user?.totp_enabled 
                ? 'Bi-layered authentication is active for this node.' 
                : 'Account lacks secondary verification layer. Enable MFA immediately.'}
            </p>
          </div>
          <div>
            {user?.totp_enabled ? (
              <button className="btn btn-sm" onClick={handleDisable} disabled={loading} style={{ color: 'var(--neon-red)', borderColor: 'var(--neon-red)', fontSize: '0.6rem' }}>
                DISABLE_PROTOCOL
              </button>
            ) : (
              <button className="btn btn-sm" onClick={init2FA} disabled={loading} style={{ fontSize: '0.6rem' }}>
                INITIALIZE_MFA
              </button>
            )}
          </div>
        </div>

        {qrVisible && setupData && (
          <div style={{ marginTop: 'var(--sp-8)', padding: 'var(--sp-6)', background: 'rgba(0,0,0,0.3)', border: '1px dashed #222' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--sp-6)' }}>
              <Terminal size={14} color="var(--neon-green)" style={{ marginBottom: 'var(--sp-2)' }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--neon-green)', fontWeight: 800 }}>MFA_UPLINK_READY</div>
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--sp-8)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ padding: 'var(--sp-2)', background: '#fff', borderRadius: 4 }}>
                <img src={setupData.qr_code} alt="QR Code" style={{ width: 150, height: 150 }} />
              </div>
              <div style={{ maxWidth: 300 }}>
                <div style={{ fontSize: '0.65rem', color: '#555', marginBottom: 'var(--sp-3)', fontFamily: 'var(--font-mono)' }}>
                  SCAN_QR_OR_INPUT_SECRET:
                </div>
                <div style={{ 
                  background: '#050505', 
                  border: '1px solid #111', 
                  padding: 'var(--sp-3)', 
                  fontSize: '0.75rem', 
                  color: 'var(--neon-cyan)', 
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.1em',
                  marginBottom: 'var(--sp-4)'
                }}>
                  {setupData.secret}
                </div>
                <form onSubmit={handleVerify}>
                  <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
                    <input 
                      className="input" 
                      type="text" 
                      placeholder="ENTER_VERIF_TOKEN" 
                      value={verifyCode} 
                      onChange={(e) => setVerifyCode(e.target.value)} 
                      style={{ background: 'var(--bg-hud)', fontSize: '0.75rem', textAlign: 'center' }}
                      required 
                    />
                  </div>
                  <button className="btn btn-lg" type="submit" disabled={loading} style={{ width: '100%', fontSize: '0.7rem' }}>
                    FINALIZE_ENROLLMENT
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="card glass-green fade-in" style={{ marginTop: 'var(--sp-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
          <Smartphone size={14} color="#333" />
          <h4 style={{ fontSize: '0.7rem', color: '#333', fontWeight: 800 }}>RECOMMENDED_AUTHENTICATORS</h4>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
          {['Google Authenticator', 'Authy', 'Microsoft Authenticator', 'FreeOTP'].map(app => (
            <div key={app} style={{ fontSize: '0.65rem', color: '#444', fontFamily: 'var(--font-mono)' }}>
              [ {app.toUpperCase()} ]
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
