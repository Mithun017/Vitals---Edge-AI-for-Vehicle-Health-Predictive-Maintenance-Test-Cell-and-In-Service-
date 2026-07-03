import React from 'react'
import { 
  Gauge, 
  Thermometer, 
  Flame, 
  Activity, 
  BatteryCharging, 
  TrendingUp, 
  AlertTriangle 
} from 'lucide-react'

export default function VehicleDetailsView({ liveData, history }) {
  // Extract values from SSE stream (TRK-404 live context)
  const actual = liveData?.actual || {
    rpm: 1850,
    coolant_temp: 92,
    oil_pressure: 45,
    vibration: 1.2,
    battery_voltage: 24.2,
    fuel_level: 65
  };

  const diagnostics = liveData?.diagnostics || {
    state: "WARNING",
    confidence: 0.894,
    message: "Cooling System Anomaly: High thermal load detected.",
    recommendation: "Cooling System Anomaly detected below confidence; processing system, inspect and flush radiator."
  };

  // Overall health score calculation
  const healthScore = liveData?.energy_field ? Math.round(100 * Math.exp(-0.03 * (
    liveData.energy_field.bearing + 
    liveData.energy_field.cooling + 
    liveData.energy_field.combustion + 
    liveData.energy_field.oil + 
    liveData.energy_field.turbo
  ))) : 72;

  // Advisory text based on state
  const getAdvisoryText = (state) => {
    if (state === 'HEALTHY') return "System operating normally. No maintenance required.";
    if (state === 'WATCH') return "Observation mode triggered. Inspect at next shift.";
    if (state === 'WARNING') return "Maintenance recommended within 48 hours";
    return "IMMEDIATE SCAN REQUIRED. Stop operation immediately.";
  };

  const getAdvisoryColor = (state) => {
    if (state === 'HEALTHY') return 'var(--status-go)';
    if (state in ['WATCH', 'WARNING']) return 'var(--status-warning)';
    return 'var(--status-critical)';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      
      {/* 1. TOP METRICS GRID (Gauge + 6 Telemetry Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
        
        {/* OVERALL HEALTH CARD */}
        <div className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          textAlign: 'center',
          border: diagnostics.state === 'CRITICAL' ? '2px solid var(--status-critical)' : 
                 (diagnostics.state !== 'HEALTHY' ? '2px solid var(--status-warning)' : '1px solid #e5e7eb')
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>OVERALL HEALTH</span>
          
          {/* Semi-circular gauge */}
          <div style={{ position: 'relative', width: '160px', height: '90px', overflow: 'hidden' }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              {/* Background circle track */}
              <path d="M 15,80 A 65,65 0 0,1 145,80" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
              {/* Highlight value path */}
              <path 
                d="M 15,80 A 65,65 0 0,1 145,80" 
                fill="none" 
                stroke={getAdvisoryColor(diagnostics.state)} 
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
              <span style={{ fontSize: '28px', fontWeight: '800' }}>{healthScore}%</span>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600' }}>
            {getAdvisoryText(diagnostics.state)}
          </p>
        </div>

        {/* 6 SENSOR TELEMETRY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { key: 'rpm', label: 'ENGINE RPM', val: `${Math.round(actual.rpm)} RPM`, status: 'NOMINAL', icon: Gauge, color: 'var(--status-info)', max: 2500, min: 600 },
            { key: 'coolant_temp', label: 'COOLANT TEMP', val: `${Math.round(actual.coolant_temp)}°C`, status: actual.coolant_temp > 90 ? 'ELEVATED' : 'NOMINAL', icon: Thermometer, color: actual.coolant_temp > 90 ? 'var(--status-warning)' : 'var(--status-go)', max: 120, min: 40 },
            { key: 'oil_pressure', label: 'OIL PRESSURE', val: `${Math.round(actual.oil_pressure)} PSI`, status: actual.oil_pressure < 30 ? 'CRITICAL' : 'NOMINAL', icon: Flame, color: actual.oil_pressure < 30 ? 'var(--status-critical)' : 'var(--status-go)', max: 80, min: 20 },
            { key: 'vibration', label: 'VIBRATION', val: `${actual.vibration.toFixed(1)} g`, status: actual.vibration > 1.5 ? 'CRITICAL' : 'NOMINAL', icon: Activity, color: actual.vibration > 1.5 ? 'var(--status-critical)' : 'var(--status-go)', max: 3.5, min: 0.1 },
            { key: 'battery_voltage', label: 'BATTERY VOLTAGE', val: `${actual.battery_voltage.toFixed(1)} V`, status: 'NOMINAL', icon: BatteryCharging, color: 'var(--status-info)', max: 28, min: 20 },
            { key: 'fuel_level', label: 'FUEL LEVEL', val: `${Math.round(actual.fuel_level)}%`, status: 'NOMINAL', icon: TrendingUp, color: 'var(--status-go)', max: 100, min: 0 }
          ].map((sensor, idx) => {
            const Icon = sensor.icon;
            return (
              <div key={idx} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{sensor.label}</span>
                  <Icon size={16} color={sensor.color} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h4 style={{ fontSize: '20px', fontWeight: '800' }}>{sensor.val}</h4>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    color: sensor.status === 'NOMINAL' ? 'var(--status-go)' : (sensor.status === 'ELEVATED' ? 'var(--status-warning)' : 'var(--status-critical)')
                  }}>{sensor.status}</span>
                </div>

                {/* Mini SVG trend chart */}
                <div style={{ width: '100%', height: '30px', marginTop: '6px' }}>
                  <svg width="100%" height="100%" viewBox="0 0 80 30" preserveAspectRatio="none">
                    <path 
                      d={generateMiniPath(sensor.key, sensor.max, sensor.min)} 
                      fill="none" 
                      stroke={sensor.color} 
                      strokeWidth="1.5" 
                    />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 2. SENSOR HISTORY AND AI DIAGNOSTICS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '24px' }}>
        
        {/* Sensor History Graph */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Sensor History (Last 15 Mins)</h3>
          
          <div style={{ position: 'relative', width: '100%', height: '180px' }}>
            <svg width="100%" height="100%" viewBox="0 0 450 180" style={{ borderBottom: '1px solid #e5e7eb' }}>
              {/* Grid lines */}
              <line x1="0" y1="45" x2="450" y2="45" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="0" y1="90" x2="450" y2="90" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="0" y1="135" x2="450" y2="135" stroke="#f3f4f6" strokeWidth="1" />

              {/* Shaded Area Paths */}
              <path d={tempPaths.area} fill="rgba(245, 158, 11, 0.08)" />
              <path d={rpmPaths.area} fill="rgba(59, 130, 246, 0.08)" />
              
              {/* Line Paths */}
              <path d={tempPaths.line} fill="none" stroke="var(--status-warning)" strokeWidth="2.5" />
              <path d={rpmPaths.line} fill="none" stroke="var(--status-info)" strokeWidth="2" />
              <path d={pressPaths.line} fill="none" stroke="var(--status-go)" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>

            {/* Legend indicators */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '8px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--status-warning)' }} />
                <span>Temp</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--status-info)' }} />
                <span>RPM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '6px', borderTop: '2px dashed var(--status-go)' }} />
                <span>Pressure</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Diagnostics Panel */}
        <div className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          border: diagnostics.state === 'CRITICAL' ? '2px solid var(--status-critical)' : 
                 (diagnostics.state !== 'HEALTHY' ? '2px solid var(--status-warning)' : '1px solid #e5e7eb'),
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle color={getAdvisoryColor(diagnostics.state)} size={20} />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>AI DIAGNOSTIC INSIGHT</h3>
          </div>

          <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
              {diagnostics.state === 'HEALTHY' ? 'Combustion Cycle Stable' : diagnostics.message}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {diagnostics.message}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Confidence</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: getAdvisoryColor(diagnostics.state) }}>
                {Math.round(diagnostics.confidence * 100)}% ({diagnostics.confidence > 0.85 ? 'High' : 'Moderate'})
              </span>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Impact</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: diagnostics.state === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-warning)' }}>
                {diagnostics.state === 'CRITICAL' ? 'Severe' : (diagnostics.state === 'HEALTHY' ? 'Low' : 'Moderate')}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Recommended Action</span>
            <p style={{
              fontSize: '12px',
              lineHeight: '1.5',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0,0,0,0.02)',
              borderLeft: `4px solid ${getAdvisoryColor(diagnostics.state)}`
            }}>
              {diagnostics.recommendation}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
