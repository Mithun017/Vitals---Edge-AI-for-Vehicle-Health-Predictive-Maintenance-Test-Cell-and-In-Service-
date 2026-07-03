import React, { useState } from 'react'
import { Hourglass, Sliders, Trash2, AlertTriangle } from 'lucide-react'

export default function AIAnalysisView({ liveData, history }) {
  // Extract diagnostics state
  const state = liveData?.diagnostics?.state || 'WARNING';
  const rul = liveData?.rul ? Math.round(liveData.rul) : 126;
  const activeZone = liveData?.active_zone || 'Healthy';
  const severity = liveData?.severity || 'None';

  // Compute energy fields
  const energy = liveData?.energy_field || {
    bearing: 0.84,
    cooling: 0.72,
    combustion: 0.38,
    oil: 0.29,
    turbo: 0.18
  };

  // Fault Injection Selection States
  const [selectedZone, setSelectedZone] = useState('Zone 2');
  const [selectedSeverity, setSelectedSeverity] = useState('Critical');

  // Submit fault injection
  const handleInjectFault = () => {
    fetch('http://localhost:8000/api/fault/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone: selectedZone, severity: selectedSeverity })
    });
  };

  // Clear fault
  const handleClearFault = () => {
    fetch('http://localhost:8000/api/fault/clear', {
      method: 'POST'
    });
  };

  // Submit override slider adjustments
  const handleSliderChange = (sensor, value) => {
    fetch('http://localhost:8000/api/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor, value: parseFloat(value) })
    });
  };

  // Clear overrides
  const handleClearOverrides = () => {
    fetch('http://localhost:8000/api/override/clear', {
      method: 'POST'
    });
  };

  // 1. ANOMALY FEATURE DRIVERS VALUES
  // Driven dynamically by active subsystems
  const sumEnergy = energy.bearing + energy.cooling + energy.combustion + energy.oil + energy.turbo;
  const vibPercentage = sumEnergy > 0 ? Math.round((energy.bearing / sumEnergy) * 100) : 68;
  const thermPercentage = sumEnergy > 0 ? Math.round(((energy.cooling + energy.combustion) / sumEnergy) * 100) : 22;
  const torquePercentage = sumEnergy > 0 ? Math.round(((energy.oil + energy.turbo) / sumEnergy) * 100) : 10;

  // 2. RADAR CHART COORDINATE GENERATOR (5 Axes: Current, Thermal, Conducting, Temp, Torque)
  const generateRadarPoints = (values) => {
    const cx = 90;
    const cy = 80;
    const maxRadius = 55;
    const angles = [0, 72, 144, 216, 288]; // 5 axes angles in degrees
    const points = angles.map((ang, i) => {
      const rad = (ang * Math.PI) / 180;
      const val = values[i] || 0.5;
      const x = cx + maxRadius * val * Math.cos(rad);
      const y = cy + maxRadius * val * Math.sin(rad);
      return `${x},${y}`;
    });
    return points.join(' ');
  };

  const baselinePoints = generateRadarPoints([0.7, 0.65, 0.75, 0.6, 0.7]);
  
  // Adjust radar points dynamically based on actual values
  const currentValues = [
    0.85, 
    energy.cooling > 0.4 ? 0.85 : 0.6, 
    energy.bearing > 0.4 ? 0.9 : 0.7, 
    energy.oil > 0.4 ? 0.8 : 0.55, 
    0.65
  ];
  const currentPoints = generateRadarPoints(currentValues);

  // 3. HEALTH EVOLUTION DATA PATHS
  const generateEvolutionPath = () => {
    if (history.length < 2) return { line: "M 0 50", area: "M 0 50" };
    const width = 450;
    const height = 110;
    const points = history.map((h, i) => {
      const hs = h.energy_field ? Math.round(100 * Math.exp(-0.03 * (
        h.energy_field.bearing + 
        h.energy_field.cooling + 
        h.energy_field.combustion + 
        h.energy_field.oil + 
        h.energy_field.turbo
      ))) : 95;
      const x = (i / (history.length - 1)) * width;
      const y = height - (hs / 100) * height;
      return { x, y };
    });
    const lineD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const areaD = `${lineD} L ${width},${height} L 0,${height} Z`;
    return { line: lineD, area: areaD };
  };

  const evolPaths = generateEvolutionPath();

  // 4. MINI RUL DECAY PATH
  const generateRulPath = () => {
    const width = 160;
    const height = 40;
    if (history.length < 2) return "M 0 20 L 160 20";
    const points = history.map((h, i) => {
      const r = h.rul || 126;
      const x = (i / (history.length - 1)) * width;
      const y = height - (r / 150) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      
      {/* HEADER SYSTEM DETAILS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>System Uptime: 14d 08h 12m</span>
        </div>
        <div style={{
          backgroundColor: '#1f2937',
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '700',
          fontFamily: 'monospace'
        }}>
          Confidence Interval: 98.4%
        </div>
      </div>

      {/* TOP SECTION (RUL + Health score line graph) */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        
        {/* RUL Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Remaining Useful Life (RUL)</span>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '36px', fontWeight: '800' }}>{rul}</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Hours</span>
            </div>
            
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Hourglass size={30} color="var(--status-info)" />
            </div>
          </div>

          {/* Mini trendline */}
          <div style={{ width: '100%', height: '40px' }}>
            <svg width="100%" height="100%" viewBox="0 0 160 40" preserveAspectRatio="none">
              <path d={generateRulPath()} fill="none" stroke="var(--status-info)" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Health Score Evolution line chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Health Score Evolution</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e5e7eb', background: '#ffffff' }}>Last 72 Hours</span>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '110px' }}>
            <svg width="100%" height="100%" viewBox="0 0 450 110">
              {/* Grid lines */}
              <line x1="0" y1="27" x2="450" y2="27" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="0" y1="55" x2="450" y2="55" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="0" y1="82" x2="450" y2="82" stroke="#f3f4f6" strokeWidth="1" />

              <path d={evolPaths.area} fill="rgba(59, 130, 246, 0.06)" />
              <path d={evolPaths.line} fill="none" stroke="var(--status-info)" strokeWidth="2.5" />
            </svg>

            {/* Threshold limits annotations */}
            <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '9px', fontWeight: 'bold', color: 'var(--status-go)' }}>Healthy</div>
            <div style={{ position: 'absolute', top: '50px', right: '10px', fontSize: '9px', fontWeight: 'bold', color: 'var(--status-warning)' }}>Warning</div>
          </div>
        </div>

      </div>

      {/* MIDDLE SECTION (Anomaly feature drivers + State timeline + Radar chart) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.1fr', gap: '24px' }}>
        
        {/* Anomaly Drivers (Bar charts) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Anomaly Feature Drivers</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-around' }}>
            {[
              { label: 'Vibration', val: vibPercentage, color: 'var(--sidebar-bg-end)', lightColor: 'var(--status-info)' },
              { label: 'Thermal', val: thermPercentage, color: 'var(--sidebar-bg-end)', lightColor: '#fbbf24' },
              { label: 'Torque', val: torquePercentage, color: 'var(--sidebar-bg-end)', lightColor: '#10b981' }
            ].map((driver, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>
                  <span>{driver.label}</span>
                  <span>{driver.val}%</span>
                </div>
                
                {/* 2 bars layout */}
                <div style={{ display: 'flex', gap: '4px', height: '14px' }}>
                  <div style={{
                    width: `${driver.val}%`,
                    backgroundColor: driver.color,
                    borderRadius: '3px',
                    transition: 'width 0.5s'
                  }} />
                  <div style={{
                    width: `${100 - driver.val}%`,
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: '3px'
                  }} />
                  <div style={{
                    width: '10px',
                    backgroundColor: driver.lightColor,
                    borderRadius: '3px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* State progression timeline */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>State Progression Timeline</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '20px' }}>
            {/* Stepper vertical line */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '5px',
              bottom: '12px',
              width: '2px',
              backgroundColor: '#e5e7eb'
            }} />

            {/* Node 1 */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-20px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--status-go)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>T-120 Hours</span>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>Nominal Operation</span>
            </div>

            {/* Node 2 */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-20px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--status-warning)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>T-48 Hours</span>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>Observation Mode Triggered</span>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Minor harmonic distortions detected.</p>
            </div>

            {/* Node 3 - Current State */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-20px', top: '3px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: state === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-warning)', border: '2px solid #ffffff' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>CURRENT STATE</span>
              
              <div style={{
                marginTop: '4px',
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: state === 'CRITICAL' ? 'var(--status-critical-bg)' : 'var(--status-warning-bg)',
                border: state === 'CRITICAL' ? '1px solid var(--status-critical)' : '1px solid var(--status-warning)',
                color: 'var(--text-main)'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '800' }}>{state}</span>
                <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}>
                  AI Rationale: {activeZone !== 'Healthy' ? `${severity} anomaly in {activeZone}. Residual thresholds exceeded.` : "Vibration signatures correlate with verified wear patterns."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Multivariate Baseline Radar Comparison */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Multivariate Baseline Comparison</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '180px', height: '160px', position: 'relative' }}>
              <svg width="180" height="160" viewBox="0 0 180 160">
                {/* Radar Grid Circles */}
                <circle cx="90" cy="80" r="55" fill="none" stroke="#f3f4f6" strokeWidth="1" />
                <circle cx="90" cy="80" r="35" fill="none" stroke="#f3f4f6" strokeWidth="1" />
                <circle cx="90" cy="80" r="15" fill="none" stroke="#f3f4f6" strokeWidth="1" />
                
                {/* Polygon paths */}
                <polygon points={baselinePoints} fill="rgba(75, 85, 99, 0.08)" stroke="rgba(75, 85, 99, 0.3)" strokeWidth="1" />
                <polygon points={currentPoints} fill="rgba(59, 130, 246, 0.15)" stroke="var(--status-info)" strokeWidth="1.5" />
                
                {/* Axis Labels */}
                <text x="90" y="20" fill="var(--text-muted)" fontSize="8" textAnchor="middle">Current</text>
                <text x="155" y="80" fill="var(--text-muted)" fontSize="8" textAnchor="start">Thermal</text>
                <text x="130" y="145" fill="var(--text-muted)" fontSize="8" textAnchor="start">Conducting</text>
                <text x="50" y="145" fill="var(--text-muted)" fontSize="8" textAnchor="end">Temp</text>
                <text x="25" y="80" fill="var(--text-muted)" fontSize="8" textAnchor="end">Torque</text>
              </svg>
            </div>

            {/* Radar Legend */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '9px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', border: '1px solid rgba(75,85,99,0.3)', backgroundColor: 'rgba(75,85,99,0.08)' }} />
                <span>Baseline (T-30d)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', border: '1.5px solid var(--status-info)', backgroundColor: 'rgba(59,130,246,0.15)' }} />
                <span>Current AI Model</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SEPARATOR */}
      <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '12px 0' }} />

      {/* BOTTOM SECTION: OVERRIDES & FAULT INJECTION CONTROLS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* LEFT COL: INTERACTIVE SENSOR OVERRIDES SLIDERS */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} />
              Live Sensor Overrides (Interactive Level Meters)
            </h3>
            <button 
              onClick={handleClearOverrides}
              style={{
                padding: '6px 12px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-main)'
              }}
            >
              <Trash2 size={12} />
              Reset Sliders
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { key: 'rpm', label: 'Engine RPM', min: 600, max: 2500, unit: 'RPM' },
              { key: 'load', label: 'Engine Load', min: 0, max: 100, unit: '%' },
              { key: 'intake_pressure', label: 'Intake Pressure (Boost)', min: 50, max: 250, unit: 'kPa' },
              { key: 'combustion_temp', label: 'Combustion Temp', min: 100, max: 800, unit: '°C' },
              { key: 'coolant_temp', label: 'Coolant Temp', min: 40, max: 120, unit: '°C' },
              { key: 'oil_pressure', label: 'Oil Pressure', min: 10, max: 80, unit: 'PSI' },
              { key: 'vibration', label: 'Vibration', min: 0.1, max: 4.0, unit: 'g', step: 0.1 },
              { key: 'battery_voltage', label: 'Battery Voltage', min: 20, max: 28, unit: 'V', step: 0.1 }
            ].map(slider => {
              const actualData = liveData?.actual || {};
              const currentVal = actualData[slider.key] || slider.min;
              return (
                <div key={slider.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                    <span>{slider.label}</span>
                    <span className="mono-font">{currentVal.toFixed(slider.step ? 1 : 0)} {slider.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step || 1}
                    value={currentVal}
                    onChange={e => handleSliderChange(slider.key, e.target.value)}
                    style={{
                      width: '100%',
                      accentColor: 'var(--cat-yellow)',
                      cursor: 'ew-resize',
                      height: '6px',
                      borderRadius: '3px',
                      background: '#e5e7eb'
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COL: FAULT INJECTION PANEL & STREAM CONTROLS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* FAULT INJECTION CONTROL PANEL */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              Fault Injection Control Panel
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SUSPECT ZONE</span>
                <select 
                  value={selectedZone}
                  onChange={e => setSelectedZone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    outline: 'none',
                    fontSize: '13px'
                  }}
                >
                  <option value="Zone 1">Zone 1 — Intake Air</option>
                  <option value="Zone 2">Zone 2 — Charge Air / CAC</option>
                  <option value="Zone 3">Zone 3 — Combustion Block</option>
                  <option value="Zone 4">Zone 4 — Exhaust Manifold</option>
                  <option value="Zone 5">Zone 5 — Turbocharger</option>
                  <option value="Zone 6">Zone 6 — DPF / Aftertreatment</option>
                </select>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SEVERITY LEVEL</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['Small', 'Medium', 'Critical'].map(level => (
                    <button
                      key={level}
                      onClick={() => setSelectedSeverity(level)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: selectedSeverity === level ? '2px solid #000000' : '1px solid #e5e7eb',
                        background: level === 'Critical' ? 'var(--status-critical-bg)' : (level === 'Medium' ? 'var(--status-warning-bg)' : 'var(--status-go-bg)'),
                        color: level === 'Critical' ? 'var(--status-critical)' : (level === 'Medium' ? 'var(--status-warning)' : 'var(--status-go)'),
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {level.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={handleInjectFault}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--cat-yellow)',
                    color: '#000000',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: 'none',
                    fontSize: '13px'
                  }}
                >
                  INJECT FAULT
                </button>
                <button
                  onClick={handleClearFault}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#f3f4f6',
                    color: 'var(--text-main)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px'
                  }}
                >
                  CLEAR
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE SIMULATION STATUS */}
          <div className="glass-card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: activeZone !== 'Healthy' ? '2px solid var(--status-critical)' : '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Active Simulation Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Fault Active:</span>
                <span style={{ fontWeight: '700', color: activeZone !== 'Healthy' ? 'var(--status-critical)' : 'var(--status-go)' }}>
                  {activeZone !== 'Healthy' ? 'YES' : 'NO'}
                </span>
              </div>
              {activeZone !== 'Healthy' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Target Zone:</span>
                    <span style={{ fontWeight: '700' }}>{activeZone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Severity:</span>
                    <span style={{ fontWeight: '700' }}>{severity}</span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
