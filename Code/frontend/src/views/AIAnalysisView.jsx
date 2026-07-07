import React, { useState } from 'react'
import { Hourglass, Sliders, Trash2, AlertTriangle } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import ChartContainer from '../components/common/ChartContainer'
import StatusBadge from '../components/common/StatusBadge'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%' }}>
      
      {/* HEADER SYSTEM DETAILS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>System Uptime: 14d 08h 12m</span>
        </div>
        <div style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          color: 'var(--md-sys-color-on-surface)',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '700',
          fontFamily: 'monospace',
          border: '1px solid var(--md-sys-color-outline-variant)'
        }}>
          Confidence Interval: 98.4%
        </div>
      </div>

      {/* TOP SECTION (RUL + Health score line graph) */}
      <div className="vehicle-metrics-grid responsive-grid" style={{ gap: '24px' }}>
        
        {/* RUL Card */}
        <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>Remaining Useful Life (RUL)</span>
             <StatusBadge state={rul < 50 ? 'CRITICAL' : rul < 100 ? 'WARNING' : 'HEALTHY'} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '42px', fontWeight: '800', color: 'var(--md-sys-color-on-surface)', lineHeight: '1' }}>{rul}</h3>
              <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>Hours Estimated</span>
            </div>
            
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--md-sys-color-secondary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Hourglass size={28} color="var(--md-sys-color-on-secondary-container)" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '600' }}>
              <span>Degradation: {(100 - (rul/500)*100).toFixed(1)}%</span>
              <span>Max: 500h</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(rul / 500) * 100}%`, height: '100%', backgroundColor: rul < 50 ? 'var(--md-sys-color-error)' : rul < 100 ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)', transition: 'width 0.5s ease-in-out' }} />
            </div>
          </div>
        </Card>

        {/* Health Score Evolution line chart */}
        <ChartContainer 
          title="Health Score Evolution" 
          badgeText="Last 72 Hours" 
          badgeBg="var(--md-sys-color-surface-container)" 
          badgeColor="var(--md-sys-color-on-surface)"
        >
          <div style={{ position: 'relative', width: '100%', height: '180px', marginTop: '8px' }}>
            <svg width="100%" height="100%" viewBox="0 0 450 110" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
              <defs>
                <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--md-sys-color-secondary)" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="var(--md-sys-color-secondary)" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              <line x1="0" y1="27" x2="450" y2="27" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
              <line x1="0" y1="55" x2="450" y2="55" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
              <line x1="0" y1="82" x2="450" y2="82" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />

              <path d={evolPaths.area} fill="url(#healthGrad)" />
              <path d={evolPaths.line} fill="none" stroke="var(--md-sys-color-secondary)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* Threshold limits annotations */}
            <div style={{ position: 'absolute', top: '15px', right: '10px', fontSize: '10px', fontWeight: 'bold', color: 'var(--md-sys-color-primary)', backgroundColor: 'var(--md-sys-color-surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline-variant)' }}>Healthy (95%+)</div>
            <div style={{ position: 'absolute', top: '48px', right: '10px', fontSize: '10px', fontWeight: 'bold', color: 'var(--md-sys-color-tertiary)', backgroundColor: 'var(--md-sys-color-surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline-variant)' }}>Warning (70%)</div>
          </div>
        </ChartContainer>

      </div>

      {/* MIDDLE SECTION (Anomaly feature drivers + State timeline + Radar chart) */}
      <div className="responsive-grid-cols-3 responsive-grid" style={{ gap: '24px' }}>
        
        {/* Anomaly Drivers (Bar charts) */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>Anomaly Feature Drivers</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-around' }}>
            {[
              { label: 'Vibration', val: vibPercentage },
              { label: 'Thermal', val: thermPercentage },
              { label: 'Torque', val: torquePercentage }
            ].map((driver, idx) => {
              const getDriverColor = (val) => {
                if (val > 50) return 'var(--md-sys-color-error)';
                if (val > 25) return 'var(--md-sys-color-tertiary)';
                return 'var(--md-sys-color-primary)';
              };
              
              const barColor = getDriverColor(driver.val);

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--md-sys-color-on-surface)' }}>
                    <span>{driver.label}</span>
                    <span style={{ color: barColor }}>{driver.val}%</span>
                  </div>
                  
                  {/* Clean progress bar */}
                  <div style={{ display: 'flex', width: '100%', height: '8px', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${driver.val}%`,
                      backgroundColor: barColor,
                      transition: 'width 0.5s ease-in-out, background-color 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* State progression timeline */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>State Progression Timeline</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '20px' }}>
            {/* Stepper vertical line */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '5px',
              bottom: '12px',
              width: '2px',
              backgroundColor: 'var(--md-sys-color-outline-variant)'
            }} />

            {/* Node 1 */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-20px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--md-sys-color-primary)' }} />
              <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block' }}>T-120 Hours</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-on-surface)' }}>Nominal Operation</span>
            </div>

            {/* Node 2 */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-20px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--md-sys-color-tertiary)' }} />
              <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block' }}>T-48 Hours</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-on-surface)' }}>Observation Mode Triggered</span>
              <p style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>Minor harmonic distortions detected.</p>
            </div>

            {/* Node 3 - Current State */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-20px', top: '3px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: state === 'CRITICAL' ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-tertiary)', border: '2px solid var(--md-sys-color-surface)' }} />
              <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block' }}>CURRENT STATE</span>
              
              <div style={{
                marginTop: '4px',
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: state === 'CRITICAL' ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-tertiary-container)',
                border: state === 'CRITICAL' ? '1px solid var(--md-sys-color-error)' : '1px solid var(--md-sys-color-tertiary)',
                color: 'var(--md-sys-color-on-surface)'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '800' }}>{state}</span>
                <p style={{ fontSize: '9px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px', lineHeight: '1.3' }}>
                  AI Rationale: {activeZone !== 'Healthy' ? `${severity} anomaly in ${activeZone}. Residual thresholds exceeded.` : "Vibration signatures correlate with verified wear patterns."}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Multivariate Baseline Radar Comparison */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>Multivariate Baseline Comparison</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '180px', height: '160px', position: 'relative' }}>
              <svg width="180" height="160" viewBox="0 0 180 160">
                {/* Radar Grid Circles */}
                <circle cx="90" cy="80" r="55" fill="none" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" />
                <circle cx="90" cy="80" r="35" fill="none" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" />
                <circle cx="90" cy="80" r="15" fill="none" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" />
                
                {/* Polygon paths */}
                <polygon points={baselinePoints} fill="var(--md-sys-color-surface-container-high)" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" />
                <polygon points={currentPoints} fill="var(--md-sys-color-secondary-container)" stroke="var(--md-sys-color-secondary)" strokeWidth="1.5" />
                
                {/* Axis Labels */}
                <text x="90" y="20" fill="var(--md-sys-color-on-surface-variant)" fontSize="8" textAnchor="middle">Current</text>
                <text x="155" y="80" fill="var(--md-sys-color-on-surface-variant)" fontSize="8" textAnchor="start">Thermal</text>
                <text x="130" y="145" fill="var(--md-sys-color-on-surface-variant)" fontSize="8" textAnchor="start">Conducting</text>
                <text x="50" y="145" fill="var(--md-sys-color-on-surface-variant)" fontSize="8" textAnchor="end">Temp</text>
                <text x="25" y="80" fill="var(--md-sys-color-on-surface-variant)" fontSize="8" textAnchor="end">Torque</text>
              </svg>
            </div>

            {/* Radar Legend */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '9px', marginTop: '6px', color: 'var(--md-sys-color-on-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', border: '1px solid var(--md-sys-color-outline-variant)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }} />
                <span>Baseline (T-30d)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', border: '1.5px solid var(--md-sys-color-secondary)', backgroundColor: 'var(--md-sys-color-secondary-container)' }} />
                <span>Current AI Model</span>
              </div>
            </div>
          </div>
        </Card>

      </div>

      {/* SEPARATOR */}
      <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)', margin: '12px 0' }} />

      {/* BOTTOM SECTION: OVERRIDES & FAULT INJECTION CONTROLS GRID */}
      <div className="dashboard-focus-grid responsive-grid" style={{ gap: '24px' }}>
        
        {/* LEFT COL: INTERACTIVE SENSOR OVERRIDES SLIDERS */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--md-sys-color-on-surface)' }}>
              <Sliders size={18} />
              Live Sensor Overrides (Interactive Level Meters)
            </h3>
            <Button 
              variant="tonal"
              size="sm"
              onClick={handleClearOverrides}
            >
              <Trash2 size={12} />
              Reset Sliders
            </Button>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--md-sys-color-on-surface)' }}>
                    <span>{slider.label}</span>
                    <span className="mono-font">{currentVal.toFixed(slider.step ? 1 : 0)} {slider.unit}</span>
                  </div>
                  <input
                    id={`slider-${slider.key}`}
                    name={`slider-${slider.key}`}
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step || 1}
                    value={currentVal}
                    onChange={e => handleSliderChange(slider.key, e.target.value)}
                    style={{
                      width: '100%',
                      accentColor: 'var(--md-sys-color-primary)',
                      cursor: 'ew-resize',
                      height: '6px',
                      borderRadius: '3px',
                      background: 'var(--md-sys-color-outline-variant)'
                    }}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* RIGHT COL: FAULT INJECTION PANEL & STREAM CONTROLS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* FAULT INJECTION CONTROL PANEL */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px', color: 'var(--md-sys-color-on-surface)' }}>
              Fault Injection Control Panel
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)', display: 'block', marginBottom: '6px' }}>SUSPECT ZONE</span>
                <select 
                  id="fault-zone"
                  name="fault-zone"
                  value={selectedZone}
                  onChange={e => setSelectedZone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    outline: 'none',
                    fontSize: '13px',
                    background: 'var(--md-sys-color-surface-container)',
                    color: 'var(--md-sys-color-on-surface)'
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
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)', display: 'block', marginBottom: '6px' }}>SEVERITY LEVEL</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['Small', 'Medium', 'Critical'].map(level => (
                    <Button
                      key={level}
                      onClick={() => setSelectedSeverity(level)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: selectedSeverity === level ? '2px solid var(--md-sys-color-on-surface)' : '1px solid var(--md-sys-color-outline-variant)',
                        background: level === 'Critical' ? 'var(--md-sys-color-error-container)' : (level === 'Medium' ? 'var(--md-sys-color-tertiary-container)' : 'var(--md-sys-color-primary-container)'),
                        color: level === 'Critical' ? 'var(--md-sys-color-error)' : (level === 'Medium' ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)'),
                        fontWeight: '700',
                        fontSize: '12px'
                      }}
                    >
                      {level.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginTop: '12px' }}>
                <Button
                  variant="primary"
                  onClick={handleInjectFault}
                >
                  INJECT FAULT
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClearFault}
                >
                  CLEAR
                </Button>
              </div>
            </div>
          </Card>

          {/* ACTIVE SIMULATION STATUS */}
          <Card style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: activeZone !== 'Healthy' ? '2px solid var(--md-sys-color-error)' : '1px solid var(--md-sys-color-outline-variant)'
          }}>
            <h3 className="md-typescale-title-small" style={{ color: 'var(--md-sys-color-on-surface)' }}>Active Simulation Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--md-sys-color-on-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Fault Active:</span>
                <span style={{ fontWeight: '700', color: activeZone !== 'Healthy' ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)' }}>
                  {activeZone !== 'Healthy' ? 'YES' : 'NO'}
                </span>
              </div>
              {activeZone !== 'Healthy' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Target Zone:</span>
                    <span style={{ fontWeight: '700' }}>{activeZone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Severity:</span>
                    <span style={{ fontWeight: '700' }}>{severity}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

        </div>

      </div>

    </div>
  );
}
