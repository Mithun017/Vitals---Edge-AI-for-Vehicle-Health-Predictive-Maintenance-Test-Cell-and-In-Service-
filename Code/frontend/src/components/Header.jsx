import React from 'react';
import { Radio } from 'lucide-react';
import Button from './common/Button';

export default function Header({ activeView, navigate, connectionStatus }) {
  if (activeView === 'digital-twin') return null;

  return (
    <div className="header-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>

        <h2 className="header-title">
          {activeView === 'dashboard' && "Fleet Overview Dashboard"}
          {activeView === 'vehicle' && "Vehicle Health Inspector"}
          {activeView === 'ai-analysis' && "AI Diagnostics Hub"}
          {activeView === 'maintenance' && "Predictive Maintenance Center"}
          {activeView === 'login' && "Access Control Console"}
        </h2>
      </div>

      <div className="header-actions">
        {/* Live Indicator Pulse Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: connectionStatus === 'LIVE' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-error-container)',
          color: connectionStatus === 'LIVE' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-error-container)',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap'
        }}>
          <Radio size={14} style={{ animation: connectionStatus === 'LIVE' ? 'pulse 2s infinite' : 'none' }} />
          {connectionStatus === 'LIVE' ? 'LIVE DEPLOYMENT' : 'OFFLINE BUFFERING'}
        </div>

        <Button 
          variant="outlined"
          onClick={() => navigate('/ai-analysis')}
        >
          DIAGNOSTICS
        </Button>
        <Button 
          variant="danger"
          onClick={() => {
            fetch('http://localhost:8000/api/fault/inject', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ zone: 'Zone 2', severity: 'Critical' })
            });
          }}
        >
          TRIGGER FAULT
        </Button>
      </div>
    </div>
  );
}
