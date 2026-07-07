import React, { useState } from 'react'
import { KeyRound, ShieldAlert } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

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
      <Card style={{
        width: '380px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        background: 'var(--md-sys-color-surface-container)'
      }}>
        {/* Title Brand */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
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
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface)' }}>Access Control Console</h2>
          <p style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase', marginTop: '2px' }}>
            VITALS Edge & LeakSense Twin
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px',
            borderRadius: '6px',
            backgroundColor: 'var(--md-sys-color-error-container)',
            color: 'var(--md-sys-color-on-error-container)',
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
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>OPERATOR USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--md-sys-color-outline)',
                background: 'var(--md-sys-color-surface)',
                color: 'var(--md-sys-color-on-surface)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>SECURITY KEY</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--md-sys-color-outline)',
                background: 'var(--md-sys-color-surface)',
                color: 'var(--md-sys-color-on-surface)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            style={{ marginTop: '8px' }}
          >
            <KeyRound size={16} />
            AUTHENTICATE ACCESS
          </Button>
        </form>

        <div style={{
          textAlign: 'center',
          fontSize: '10px',
          color: 'var(--md-sys-color-outline)',
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
          paddingTop: '12px'
        }}>
          Default credentials loaded: admin / vitals-edge-404
        </div>
      </Card>
    </div>
  );
}
