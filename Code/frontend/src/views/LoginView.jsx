import React, { useState } from 'react'
import { KeyRound, ShieldAlert } from 'lucide-react'

export default function LoginView({ onViewChange }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('vitals-edge-404')
  const [error, setError] = useState('')

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'vitals-edge-404') {
      onViewChange('dashboard');
    } else {
      setError('Invalid operator credentials. Access Denied.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      backgroundColor: 'transparent'
    }}>
      <div className="glass-card" style={{
        width: '380px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        background: '#ffffff'
      }}>
        {/* Title Brand */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'var(--cat-yellow)',
            color: '#000000',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '24px',
            marginBottom: '12px'
          }}>
            V
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Access Control Console</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
            VITALS Edge & LeakSense Twin
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px',
            borderRadius: '6px',
            backgroundColor: 'var(--status-critical-bg)',
            color: 'var(--status-critical)',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>OPERATOR USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>SECURITY KEY</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--sidebar-bg-end)',
              color: '#ffffff',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px'
            }}
          >
            <KeyRound size={16} color="var(--cat-yellow)" />
            AUTHENTICATE ACCESS
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          fontSize: '10px',
          color: 'var(--text-muted)',
          borderTop: '1px solid #f3f4f6',
          paddingTop: '12px'
        }}>
          Default credentials loaded: admin / vitals-edge-404
        </div>
      </div>
    </div>
  );
}
