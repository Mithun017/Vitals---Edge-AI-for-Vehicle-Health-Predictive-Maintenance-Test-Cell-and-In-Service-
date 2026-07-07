/**
 * DigitalTwinView.jsx
 * 
 * React host for the Vitals Twin — CAT C18 ACERT 3D Digital Twin.
 * 
 * Architecture (SOLID / Open-Closed):
 *  - The Three.js scene lives entirely inside `leaksense_fixed_v5.html`
 *    (served from /public). This file is responsible for rendering.
 *  - This component is the "host shell": it manages lifecycle, bridges
 *    live telemetry via window.postMessage, and surfaces Material-3
 *    UI chrome (status bar + info pill) outside the iframe.
 *  - Telemetry flows: App → DigitalTwinView (props) → postMessage → iframe
 *  - No Three.js code lives here — single responsibility is preserved.
 * 
 * DSA Performance:
 *  - useRef for iframe DOM access (O(1) lookup, avoids querySelector)
 *  - useEffect with liveData dep array — only fires on actual data change
 *  - prev-data comparison via JSON stringify to skip redundant postMessages
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Activity, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const IFRAME_SRC = '/leaksense_fixed_v5.html';

const ZONE_MAP = {
  'Zone 1': 'A',
  'Zone 2': 'B',
  'Zone 3': 'C',
  'Zone 4': 'D',
  'Zone 5': 'E',
  'Zone 6': 'F',
};

const STATUS_LABELS = {
  HEALTHY:  { label: 'ENGINE HEALTHY',  color: 'var(--md-sys-color-primary)',       bg: 'var(--md-sys-color-primary-container)',      icon: CheckCircle },
  WARNING:  { label: 'ANOMALY PRESENT', color: 'var(--md-sys-color-tertiary)',      bg: 'var(--md-sys-color-tertiary-container)',     icon: AlertTriangle },
  CRITICAL: { label: 'LEAK DETECTED',   color: 'var(--md-sys-color-error)',         bg: 'var(--md-sys-color-error-container)',         icon: AlertTriangle },
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DigitalTwinView — renders the Three.js twin inside an isolated iframe,
 * bridges live telemetry, and shows a Material-3 status bar overlay.
 *
 * @param {object} liveData - Live SSE telemetry packet from backend
 */
export default function DigitalTwinView({ liveData }) {
  const iframeRef = useRef(null);
  const prevPacketRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [twinStatus, setTwinStatus] = useState('HEALTHY');
  const [sessionTime, setSessionTime] = useState('00:00');
  const sessionStartRef = useRef(Date.now());

  // ── Session Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      setSessionTime(`${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Iframe Ready Detection ───────────────────────────────────────────────
  const handleIframeLoad = useCallback(() => {
    setIframeReady(true);
  }, []);

  // ── Telemetry Bridge — sends packet to iframe via postMessage ────────────
  useEffect(() => {
    if (!iframeReady || !liveData || !iframeRef.current?.contentWindow) return;

    // Build the message the HTML expects (mirrors its message handler)
    const packet = {
      active_zone: liveData.active_zone || 'Healthy',
      severity:    liveData.severity    || 'Medium',
      actual:      liveData.actual      || {},
    };

    // Skip redundant postMessages using previous packet comparison
    const packetStr = JSON.stringify(packet);
    if (prevPacketRef.current === packetStr) return;
    prevPacketRef.current = packetStr;

    // Derive UI status for overlay
    const isHealthy = !packet.active_zone || packet.active_zone === 'Healthy';
    const isCritical = packet.severity === 'Critical';
    setTwinStatus(isHealthy ? 'HEALTHY' : isCritical ? 'CRITICAL' : 'WARNING');

    // Bridge to iframe
    iframeRef.current.contentWindow.postMessage(
      { type: 'TELEMETRY_UPDATE', packet },
      '*'
    );
  }, [liveData, iframeReady]);

  // ── Derived status for overlay pill ─────────────────────────────────────
  const status = STATUS_LABELS[twinStatus] || STATUS_LABELS.HEALTHY;
  const StatusIcon = status.icon;
  const diagnosticState = liveData?.diagnostics?.state || 'HEALTHY';
  const currentRPM  = liveData?.actual?.rpm?.toFixed(0)  ?? '—';
  const currentLoad = liveData?.actual?.load?.toFixed(0) ?? '—';

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      width:    '100%',
      height:   '100%',
      position: 'relative',
      overflow: 'hidden',
      background: '#010203', // Twin has its own dark bg; keep clean seam
      display:  'flex',
      flexDirection: 'column',
    }}>

      {/* ── Material 3 Status Bar ────────────────────────────────────────── */}
      <div style={{
        zIndex:         20,
        display:        'flex',
        alignItems:     'center',
        gap:            '10px',
        padding:        '6px 12px',
        background:     'rgba(1,2,3,0.72)',
        backdropFilter: 'blur(18px)',
        borderBottom:   '1px solid rgba(255,255,255,0.06)',
        flexWrap:       'wrap',
      }}>

        {/* Brand chip */}
        <div style={{
          background:   '#F5C518',
          color:        '#000',
          fontFamily:   'monospace',
          fontWeight:   900,
          fontSize:     '10px',
          padding:      '3px 8px',
          borderRadius: '3px',
          letterSpacing: '0.08em',
          flexShrink:   0,
        }}>CAT</div>

        {/* Title */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#EEF6FF', letterSpacing: '0.1em' }}>
            VITALS TWIN
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '7px', color: '#3a5070', letterSpacing: '0.06em', marginTop: '1px' }}>
            C18 ACERT DITA · 597kW · 3D DIGITAL TWIN
          </div>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(45,100,200,0.3)', flexShrink: 0 }} />

        {/* Live status pill */}
        <div style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '6px',
          padding:       '4px 12px',
          borderRadius:  '20px',
          background:    status.bg,
          border:        `1px solid ${status.color}`,
          flexShrink:    0,
          transition:    'all 0.4s ease',
        }}>
          {/* Pulse dot */}
          <span style={{
            width:        '6px',
            height:       '6px',
            borderRadius: '50%',
            background:   status.color,
            boxShadow:    `0 0 8px ${status.color}`,
            animation:    twinStatus === 'CRITICAL' ? 'dtpulse 0.5s ease-in-out infinite' : 'dtpulse 2s ease-in-out infinite',
            flexShrink:   0,
          }} />
          <span style={{
            fontFamily:    'monospace',
            fontSize:      '8px',
            fontWeight:    700,
            color:         status.color,
            letterSpacing: '0.1em',
            whiteSpace:    'nowrap',
          }}>
            {status.label}
          </span>
        </div>

        {/* Telemetry metrics — live from SSE */}
        <div style={{ display: 'flex', gap: '0', marginLeft: 'auto', flexShrink: 0 }}>
          {[
            { v: currentRPM,  l: 'RPM'   },
            { v: currentLoad ? `${currentLoad}%` : '—', l: 'LOAD'   },
            { v: liveData?.actual?.coolant_temp?.toFixed(0) ?? '—', l: 'TEMP °C' },
            { v: sessionTime, l: 'SESSION' },
          ].map(({ v, l }) => (
            <div key={l} style={{ padding: '0 12px', borderLeft: '1px solid rgba(45,100,200,0.25)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#F5C518', lineHeight: 1, transition: 'color 0.3s' }}>
                {v}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '7px', color: '#3a5070', letterSpacing: '0.07em', marginTop: '2px' }}>
                {l}
              </div>
            </div>
          ))}
        </div>

        {/* Connection indicator */}
        <div style={{ flexShrink: 0 }}>
          {iframeReady
            ? <Wifi size={14} color="var(--md-sys-color-primary)" />
            : <WifiOff size={14} color="#3a5070" />
          }
        </div>
      </div>

      {/* ── Three.js iframe ──────────────────────────────────────────────── */}
      <iframe
        ref={iframeRef}
        src={IFRAME_SRC}
        onLoad={handleIframeLoad}
        title="Vitals Twin — CAT C18 ACERT 3D Digital Twin"
        allow="accelerometer; autoplay"
        style={{
          flex:       1,
          width:      '100%',
          border:     'none',
          display:    'block',
          background: 'transparent',
        }}
      />

      {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
      {!iframeReady && (
        <div style={{
          position:   'absolute',
          inset:      0,
          zIndex:     10,
          display:    'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap:        '16px',
          background: '#010203',
        }}>
          <Activity size={32} color="#F5C518" style={{ animation: 'spin 1.5s linear infinite' }} />
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#3a5070', letterSpacing: '0.15em' }}>
            LOADING 3D TWIN...
          </div>
          <div style={{ width: '200px', height: '2px', background: 'rgba(30,60,120,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height:     '100%',
              background: 'linear-gradient(90deg, #00FFE0, #3a9fff, #F5C518)',
              borderRadius: '2px',
              animation:  'dtload 1.8s ease-in-out infinite',
            }} />
          </div>
        </div>
      )}

      {/* ── Scoped keyframes ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes dtpulse { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes dtload  { 0%{width:0%} 60%{width:80%} 100%{width:100%} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
