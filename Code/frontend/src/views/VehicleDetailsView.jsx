import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Gauge, 
  Thermometer, 
  Flame, 
  Activity, 
  BatteryCharging, 
  TrendingUp, 
  AlertTriangle 
} from 'lucide-react'
import Card from '../components/common/Card'
import ChartContainer from '../components/common/ChartContainer'

export default function VehicleDetailsView({ liveData, history }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const vehicleId = id || 'TRK-404';

  const MOCK_PROFILES = {
    'TRK-404': null, // Live SSE
    'TRK-502': { health: 78, state: 'WARNING', rpm: 1920, temp: 98, press: 58, vib: 0.38, battery: 23.8, message: 'Elevated temperature detected in cooling loop.', load: 72 },
    'TRK-611': { health: 95, state: 'HEALTHY', rpm: 1800, temp: 88, press: 65, vib: 0.20, battery: 24.4, message: 'All systems optimal.', load: 60 },
    'TRK-209': { health: 35, state: 'CRITICAL', rpm: 2200, temp: 108, press: 42, vib: 0.78, battery: 22.1, message: 'CRITICAL: Oil pressure drop and extreme vibration. Halt immediately.', load: 85 },
    'TRK-755': { health: 82, state: 'WARNING', rpm: 1850, temp: 93, press: 52, vib: 0.40, battery: 24.0, message: 'Slight vibration irregularity in drive shaft.', load: 53 },
    'TRK-880': { health: 99, state: 'HEALTHY', rpm: 1750, temp: 88, press: 66, vib: 0.15, battery: 24.5, message: 'All systems optimal.', load: 64 },
    'TRK-312': { health: 97, state: 'HEALTHY', rpm: 1780, temp: 88, press: 64, vib: 0.18, battery: 24.5, message: 'All systems optimal.', load: 55 },
    'TRK-140': { health: 74, state: 'WARNING', rpm: 1950, temp: 97, press: 50, vib: 0.45, battery: 23.9, message: 'Coolant temperature trending upwards.', load: 63 },
    'TRK-905': { health: 94, state: 'HEALTHY', rpm: 1810, temp: 89, press: 63, vib: 0.22, battery: 24.3, message: 'All systems optimal.', load: 63 },
  };

  const profile = MOCK_PROFILES[vehicleId] || MOCK_PROFILES['TRK-611'];
  const isLive = vehicleId === 'TRK-404';

  // Extract values from SSE stream (live context) or use mock profile
  const actual = isLive && liveData?.actual ? liveData.actual : {
    rpm: profile.rpm,
    coolant_temp: profile.temp,
    oil_pressure: profile.press,
    vibration: profile.vib,
    battery_voltage: profile.battery,
    fuel_level: 65
  };

  const diagnostics = isLive && liveData?.diagnostics ? liveData.diagnostics : {
    state: profile.state,
    confidence: 0.95,
    message: profile.message,
    recommendation: profile.state === 'HEALTHY' ? 'None' : 'Schedule inspection.'
  };

  // Overall health score calculation
  const healthScore = isLive && liveData?.energy_field ? Math.round(100 * Math.exp(-0.03 * (
    liveData.energy_field.bearing + 
    liveData.energy_field.cooling + 
    liveData.energy_field.combustion + 
    liveData.energy_field.oil + 
    liveData.energy_field.turbo
  ))) : profile.health;

  // Advisory text based on state
  const getAdvisoryText = (state) => {
    if (state === 'HEALTHY') return "System operating normally. No maintenance required.";
    if (state === 'WATCH') return "Observation mode triggered. Inspect at next shift.";
    if (state === 'WARNING') return "Maintenance recommended within 48 hours";
    return "IMMEDIATE SCAN REQUIRED. Stop operation immediately.";
  };

  const getAdvisoryColor = (state) => {
    if (state === 'HEALTHY') return 'var(--md-sys-color-primary)';
    if (state === 'WATCH' || state === 'WARNING') return 'var(--md-sys-color-tertiary)';
    return 'var(--md-sys-color-error)';
  };

  // Helper to generate coordinates for mini trend SVG paths
  const generateMiniPath = (sensorKey, scaleMax, scaleMin = 0) => {
    if (history.length < 2) return "M 0 25 L 60 25";
    const width = 80;
    const height = 30;
    const points = history.map((h, i) => {
      const val = h.actual?.[sensorKey] || 0;
      const x = (i / (history.length - 1)) * width;
      // Map value between scaleMax and scaleMin to height
      const y = height - ((val - scaleMin) / (scaleMax - scaleMin)) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  // Helper to generate large history area chart SVG paths
  const generateLargePath = (sensorKey, maxVal, minVal = 0) => {
    if (history.length < 2) return { line: "M 0 100", area: "M 0 100" };
    const width = 450;
    const height = 140;
    const points = history.map((h, i) => {
      const val = h.actual?.[sensorKey] || 0;
      const x = (i / (history.length - 1)) * width;
      const y = height - ((val - minVal) / (maxVal - minVal)) * height;
      return { x, y };
    });
    
    const lineD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const areaD = `${lineD} L ${width},${height} L 0,${height} Z`;
    return { line: lineD, area: areaD };
  };

  const rpmPaths = generateLargePath('rpm', 2500, 600);
  const tempPaths = generateLargePath('coolant_temp', 120, 40);
  const pressPaths = generateLargePath('oil_pressure', 80, 20);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%' }}>
      
      {/* 1. TOP METRICS GRID (Gauge + 6 Telemetry Cards) */}
      <div className="vehicle-metrics-grid responsive-grid" style={{ gap: '24px' }}>
        
        {/* OVERALL HEALTH CARD */}
        <Card title={`Vehicle: ${vehicleId}\nHealth Score: ${healthScore}%\nState: ${diagnostics.state}`} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          textAlign: 'center',
          border: healthScore < 50 ? '2px solid var(--md-sys-color-error)' : 
                 (healthScore < 80 ? '2px solid var(--md-sys-color-tertiary)' : '1px solid var(--md-sys-color-outline-variant)'),
          transition: 'box-shadow 0.2s ease, transform 0.2s ease'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <select 
              value={vehicleId}
              onChange={(e) => navigate(`/vehicle/${e.target.value}`)}
              style={{
                background: 'var(--md-sys-color-surface-container-high)',
                color: 'var(--md-sys-color-primary)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '14px',
                fontWeight: '800',
                outline: 'none',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {Object.keys(MOCK_PROFILES).map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>OVERALL HEALTH</span>
          </div>
          
          {/* Semi-circular gauge */}
          <div style={{ position: 'relative', width: '160px', height: '90px', overflow: 'hidden' }}>
            <svg width="160" height="160" viewBox="0 0 160 160" preserveAspectRatio="xMidYMid meet">
              {/* Background circle track */}
              <path d="M 15,80 A 65,65 0 0,1 145,80" fill="none" stroke="var(--md-sys-color-surface-container-high)" strokeWidth="14" strokeLinecap="round" />
              {/* Highlight value path */}
              <path 
                d="M 15,80 A 65,65 0 0,1 145,80" 
                fill="none" 
                stroke={healthScore < 50 ? 'var(--md-sys-color-error)' : healthScore < 80 ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)'} 
                strokeWidth="14" 
                strokeLinecap="round" 
                strokeDasharray="204.2"
                strokeDashoffset={204.2 - (204.2 * healthScore) / 100}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--md-sys-color-on-surface)', lineHeight: '1' }}>{healthScore}%</span>
            </div>
          </div>

          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: getAdvisoryColor(diagnostics.state) === 'var(--md-sys-color-error)' ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-surface-variant)', 
            borderRadius: '6px',
            color: 'var(--md-sys-color-on-surface)' 
          }}>
            <p style={{ fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {diagnostics.state === 'CRITICAL' && <AlertTriangle size={14} color="var(--md-sys-color-error)" />}
              {getAdvisoryText(diagnostics.state)}
            </p>
          </div>
        </Card>

        {/* 6 SENSOR TELEMETRY CARDS */}
        <div className="responsive-grid-cols-3 responsive-grid" style={{ gap: '16px' }}>
          {[
            { key: 'rpm', label: 'ENGINE RPM', val: `${Math.round(actual.rpm)} RPM`, status: 'NOMINAL', icon: Gauge, color: 'var(--md-sys-color-secondary)', max: 2500, min: 600 },
            { key: 'coolant_temp', label: 'COOLANT TEMP', val: `${Math.round(actual.coolant_temp)}°C`, status: actual.coolant_temp > 90 ? 'ELEVATED' : 'NOMINAL', icon: Thermometer, color: actual.coolant_temp > 90 ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)', max: 120, min: 40 },
            { key: 'oil_pressure', label: 'OIL PRESSURE', val: `${Math.round(actual.oil_pressure)} PSI`, status: actual.oil_pressure < 30 ? 'CRITICAL' : 'NOMINAL', icon: Flame, color: actual.oil_pressure < 30 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)', max: 80, min: 20 },
            { key: 'vibration', label: 'VIBRATION', val: `${actual.vibration.toFixed(1)} g`, status: actual.vibration > 1.5 ? 'CRITICAL' : 'NOMINAL', icon: Activity, color: actual.vibration > 1.5 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)', max: 3.5, min: 0.1 },
            { key: 'battery_voltage', label: 'BATTERY VOLTAGE', val: `${actual.battery_voltage.toFixed(1)} V`, status: 'NOMINAL', icon: BatteryCharging, color: 'var(--md-sys-color-secondary)', max: 28, min: 20 },
            { key: 'fuel_level', label: 'FUEL LEVEL', val: `${Math.round(actual.fuel_level)}%`, status: 'NOMINAL', icon: TrendingUp, color: 'var(--md-sys-color-primary)', max: 100, min: 0 }
          ].map((sensor, idx) => {
            const Icon = sensor.icon;
            return (
              <Card key={idx} title={`Current ${sensor.label}: ${sensor.val}\nStatus: ${sensor.status}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', transition: 'box-shadow 0.2s ease, transform 0.2s ease', cursor: 'pointer' }} className="hover-lift">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>{sensor.label}</span>
                  <div style={{ padding: '6px', borderRadius: '50%', backgroundColor: sensor.status === 'CRITICAL' ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-surface-container)' }}>
                    <Icon size={16} color={sensor.color} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <h4 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--md-sys-color-on-surface)' }}>{sensor.val}</h4>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: sensor.status === 'NOMINAL' ? 'var(--md-sys-color-primary-container)' : (sensor.status === 'ELEVATED' ? 'var(--md-sys-color-tertiary-container)' : 'var(--md-sys-color-error-container)'),
                    color: sensor.status === 'NOMINAL' ? 'var(--md-sys-color-on-primary-container)' : (sensor.status === 'ELEVATED' ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-error-container)')
                  }}>{sensor.status}</span>
                </div>

                {/* Mini SVG trend chart */}
                <div style={{ width: '100%', height: '30px', marginTop: '6px' }}>
                  <svg width="100%" height="100%" viewBox="0 0 80 30" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    <path 
                      d={generateMiniPath(sensor.key, sensor.max, sensor.min)} 
                      fill="none" 
                      stroke={sensor.color} 
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              </Card>
            );
          })}
        </div>

      </div>

      {/* 2. SENSOR HISTORY AND AI DIAGNOSTICS */}
      <div className="maintenance-resource-grid responsive-grid" style={{ gap: '24px' }}>
        
        {/* Sensor History Graph */}
        <ChartContainer title="Sensor History (Last 15 Mins)">
            <div style={{ position: 'relative', width: '100%', height: '180px', marginTop: '12px' }}>
            <svg width="100%" height="100%" viewBox="0 0 450 180" style={{ borderBottom: '2px solid var(--md-sys-color-outline-variant)', overflow: 'visible' }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--md-sys-color-tertiary)" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="var(--md-sys-color-tertiary)" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="rpmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--md-sys-color-secondary)" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="var(--md-sys-color-secondary)" stopOpacity="0.0"/>
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="45" x2="450" y2="45" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="450" y2="90" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
              <line x1="0" y1="135" x2="450" y2="135" stroke="var(--md-sys-color-outline-variant)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />

              {/* Shaded Area Paths */}
              <path d={tempPaths.area} fill="url(#tempGrad)" title="Coolant Temperature Area" />
              <path d={rpmPaths.area} fill="url(#rpmGrad)" title="Engine RPM Area" />
              
              {/* Line Paths */}
              <path d={tempPaths.line} fill="none" stroke="var(--md-sys-color-tertiary)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              <path d={rpmPaths.line} fill="none" stroke="var(--md-sys-color-secondary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={pressPaths.line} fill="none" stroke="var(--md-sys-color-primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="6 6" />
            </svg>

            {/* Legend indicators */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '8px', justifyContent: 'center', color: 'var(--md-sys-color-on-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--md-sys-color-tertiary)' }} />
                <span>Temp</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--md-sys-color-secondary)' }} />
                <span>RPM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '6px', borderTop: '2px dashed var(--md-sys-color-primary)' }} />
                <span>Pressure</span>
              </div>
            </div>
          </div>
        </ChartContainer>

        {/* AI Diagnostics Panel */}
        <Card style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          border: diagnostics.state === 'CRITICAL' ? '2px solid var(--md-sys-color-error)' : 
                 (diagnostics.state !== 'HEALTHY' ? '2px solid var(--md-sys-color-tertiary)' : '1px solid var(--md-sys-color-outline-variant)'),
          boxShadow: '0 4px 12px var(--md-sys-color-shadow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle color={getAdvisoryColor(diagnostics.state)} size={20} />
            <h3 className="md-typescale-title-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>AI DIAGNOSTIC INSIGHT</h3>
          </div>

          <div style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', color: 'var(--md-sys-color-on-surface)' }}>
              {diagnostics.state === 'HEALTHY' ? 'Combustion Cycle Stable' : diagnostics.message}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: '1.4' }}>
              {diagnostics.message}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px' }}>
            <div>
              <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block' }}>Confidence</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: getAdvisoryColor(diagnostics.state) }}>
                {Math.round(diagnostics.confidence * 100)}% ({diagnostics.confidence > 0.85 ? 'High' : 'Moderate'})
              </span>
            </div>
            <div>
              <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block' }}>Impact</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: diagnostics.state === 'CRITICAL' ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-tertiary)' }}>
                {diagnostics.state === 'CRITICAL' ? 'Severe' : (diagnostics.state === 'HEALTHY' ? 'Low' : 'Moderate')}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)', display: 'block', marginBottom: '6px' }}>Recommended Action</span>
            <p style={{
              fontSize: '12px',
              lineHeight: '1.5',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-surface-variant)',
              color: 'var(--md-sys-color-on-surface)',
              borderLeft: `4px solid ${getAdvisoryColor(diagnostics.state)}`
            }}>
              {diagnostics.recommendation}
            </p>
          </div>
        </Card>

      </div>

    </div>
  );
}
