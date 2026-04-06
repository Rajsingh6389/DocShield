import React, { useEffect, useState } from 'react'
import { notificationsApi } from '../api/client'
import { Bell, CheckCircle, Info, AlertTriangle, Shield, Trash2, Terminal } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsApi.list()
      setNotifications(data)
    } catch {
      toast.error('ERROR: NOTIFICATION_STREAM_FAILURE')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {
      toast.error('ERROR: ACK_FAILURE')
    }
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('ALL_SIGNALS_ACKNOWLEDGED')
    } catch {
      toast.error('ERROR: GLOBAL_ACK_FAILURE')
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'info': return <Info size={16} color="var(--neon-cyan)" />
      case 'success': return <CheckCircle size={16} color="var(--neon-green)" />
      case 'warning': return <AlertTriangle size={16} color="var(--neon-yellow)" />
      case 'error': return <Shield size={16} color="var(--neon-red)" />
      default: return <Bell size={16} color="#444" />
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <Bell size={14} color="var(--neon-green)" />
          <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700 }}>PRIORITY_QUEUE::NET_ALERTS_v1.0</span>
        </div>
        <h2 className="glitch" style={{ fontSize: '1.75rem', fontWeight: 900 }}>SIGNAL_FEED</h2>
        <p className="page-subtitle typewriter" style={{ width: 'fit-content' }}>REAL_TIME_SYSTEM_ALERTS_AND_NETWORK_NOTIFICATIONS</p>
      </div>

      <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-sm" onClick={markAllRead} style={{ fontSize: '0.65rem' }}>
          ACKNOWLEDGE_ALL
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)', borderBottom: '1px solid #111', paddingBottom: 'var(--sp-3)' }}>
          <Terminal size={16} color="var(--neon-cyan)" />
          <h3 style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)' }}>LIVE_SIGNAL_FEED</h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-12)', gap: 'var(--sp-4)' }}>
             <div className="spin" style={{ width: 24, height: 24, border: '2px solid #111', borderTopColor: 'var(--neon-green)' }} />
             <div style={{ fontSize: '0.7rem', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>SCANNING_FREQUENCIES...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 'var(--sp-12)', textAlign: 'center', color: '#333', fontSize: '0.8rem' }}>
            [ NO_ACTIVE_SIGNALS_DETECTED ]
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => !n.is_read && markRead(n.id)}
                style={{ 
                  display: 'flex', 
                  gap: 'var(--sp-4)', 
                  padding: 'var(--sp-4)', 
                  background: n.is_read ? 'transparent' : 'rgba(0,255,65,0.02)',
                  border: `1px solid ${n.is_read ? '#111' : '#222'}`,
                  borderLeft: `2px solid ${n.is_read ? '#333' : 'var(--neon-green)'}`,
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ marginTop: 2 }}>{getIcon(n.type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: n.is_read ? '#666' : '#fff' }}>
                      {n.title.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: '#444' }}>
                      {format(new Date(n.timestamp), 'HH:mm:ss | yyyy.MM.dd')}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: n.is_read ? '#444' : '#888', margin: 0, fontFamily: 'var(--font-mono)' }}>
                    {n.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
