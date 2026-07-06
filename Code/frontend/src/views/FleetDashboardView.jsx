import React, { useState, useEffect } from 'react'
import {
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Cpu,
  MapPin,
  ArrowUpRight,
  Play,
  Square,
  Activity,
  Flame
} from 'lucide-react'

export default function FleetDashboardView({ liveData, history, alerts, onViewChange }) {
  // Extract TRK-404 live status from SSE stream
  const trk404State = liveData?.diagnostics?.state || 'HEALTHY';
  const trk404Health = liveData?.energy_field ? Math.round(100 * Math.exp(-0.03 * (
    liveData.energy_field.bearing +
    liveData.energy_field.cooling +
    liveData.energy_field.combustion +
    liveData.energy_field.oil +
    liveData.energy_field.turbo
  ))) : 98;
  const trk404Rul = liveData?.rul ? Math.round(liveData.rul / 24) : 6; // convert to days
  const trk404Conf = liveData?.diagnostics ? Math.round(liveData.diagnostics.confidence * 100) : 98;

  const zoneProbs = liveData?.zone_probabilities || {
    "Healthy": 1.0,
    "Zone 1": 0.0,
    "Zone 2": 0.0,
    "Zone 3": 0.0,
    "Zone 4": 0.0,
    "Zone 5": 0.0,
    "Zone 6": 0.0
  };

  // Control states
  const [selectedZone, setSelectedZone] = useState('Zone 2');
  const [selectedSeverity, setSelectedSeverity] = useState('Critical');
  const [testActive, setTestActive] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [streamActive, setStreamActive] = useState(true);

  // XGBoost model status and training states
  const [modelStatus, setModelStatus] = useState({ is_trained: false, metadata: {} });
  const [isTraining, setIsTraining] = useState(false);

  // Sync stream status by querying api/health
  const checkHealth = () => {
    fetch('http://localhost:8000/api/health')
      .then(res => res.json())
      .then(data => {
        setStreamActive(data.is_streaming);
      })
      .catch(e => console.error(e));
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 4000);

    // Fetch initial model status
    fetch('http://localhost:8000/api/model/status')
      .then(res => res.json())
      .then(data => setModelStatus(data))
      .catch(e => console.error("Error fetching model status", e));

    return () => clearInterval(interval);
  }, []);

  const handleStartStream = () => {
    fetch('http://localhost:8000/api/stream/start', { method: 'POST' })
      .then(() => checkHealth());
  };

  const handleStopStream = () => {
    fetch('http://localhost:8000/api/stream/stop', { method: 'POST' })
      .then(() => checkHealth());
  };

  const handleInjectFault = () => {
    fetch('http://localhost:8000/api/fault/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone: selectedZone, severity: selectedSeverity })
    }).then(() => checkHealth());
  };

  const handleClearFault = () => {
    fetch('http://localhost:8000/api/fault/clear', { method: 'POST' })
      .then(() => checkHealth());
  };

  const handleRunTestCycle = () => {
    if (testActive) return;
    setTestActive(true);
    setTestProgress(10);

    // Step 1: Spike RPM and Load
    fetch('http://localhost:8000/api/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor: 'rpm', value: 2100.0 })
    });
    fetch('http://localhost:8000/api/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor: 'load', value: 90.0 })
    });

    // Step 2: Animate progress and clear after 5s
    let prog = 10;
    const timer = setInterval(() => {
      prog += 20;
      setTestProgress(Math.min(prog, 100));
    }, 1000);

    setTimeout(() => {
      clearInterval(timer);
      fetch('http://localhost:8000/api/override/clear', { method: 'POST' });
      setTestActive(false);
      setTestProgress(0);
    }, 5000);
  };

  const handleTrainModel = () => {
    setIsTraining(true);
    fetch('http://localhost:8000/api/model/train', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setIsTraining(false);
        if (data.status === 'success') {
          setModelStatus({ is_trained: true, metadata: data.metadata });
        } else {
          alert("Error training model: " + data.message);
        }
      })
      .catch(e => {
        setIsTraining(false);
        console.error("Error training model", e);
      });
  };

  // Mock initial state for all 9 trucks in the fleet
  const [vehicles, setVehicles] = useState([
    { 
      id: 'TRK-404', 
      model: 'PRIMA 4625.S', 
      isLive: true, 
      health: trk404Health, 
      rul: `${trk404Rul} Days`, 
      conf: `${trk404Conf}%`, 
      state: trk404State,
      temp: 89,
      press: 64,
      vib: 0.22,
      load: 60,
      boost: 142,
      battery: 24.2,
      exhaust: 485
    },
    { 
      id: 'TRK-502', 
      model: 'PRIMA 4625.S', 
      isLive: false, 
      health: 78, 
      rul: '45 Days', 
      conf: '91%', 
      state: 'WARNING',
      temp: 98,
      press: 58,
      vib: 0.38,
      load: 72,
      boost: 132,
      battery: 23.8,
      exhaust: 520
    },
    { 
      id: 'TRK-611', 
      model: 'PRIMA 4625.S', 
      isLive: false, 
      health: 95, 
      rul: '180+ Days', 
      conf: '98%', 
      state: 'HEALTHY',
      temp: 88,
      press: 65,
      vib: 0.20,
      load: 60,
      boost: 145,
      battery: 24.4,
      exhaust: 480
    },
    { 
      id: 'TRK-209', 
      model: 'PRIMA 4625.S', 
      isLive: false, 
      health: 35, 
      rul: '1 Day', 
      conf: '96%', 
      state: 'CRITICAL',
      temp: 108,
      press: 42,
      vib: 0.78,
      load: 85,
      boost: 95,
      battery: 22.1,
      exhaust: 610
    },
    { 
      id: 'TRK-755', 
      model: 'PRIMA 4625.S', 
      isLive: false, 
      health: 82, 
      rul: '30 Days', 
      conf: '90%', 
      state: 'WARNING',
      temp: 95,
      press: 52,
      vib: 0.32,
      load: 55,
      boost: 138,
      battery: 24.0,
      exhaust: 510
    },
    { 
      id: 'TRK-880', 
      model: 'PRIMA 4625.S', 
      isLive: false, 
      health: 99, 
      rul: '365+ Days', 
      conf: '99%', 
      state: 'HEALTHY',
      temp: 87,
      press: 66,
      vib: 0.18,
      load: 65,
      boost: 146,
      battery: 24.5,
      exhaust: 475
    },
    { 
      id: 'TRK-312', 
      model: 'PRIMA 4625.S', 
      isLive: false, 
      health: 97, 
      rul: '210+ Days', 
      conf: '98%', 
      state: 'HEALTHY',
      temp: 87,
      press: 64,
      vib: 0.21,
      load: 58,
      boost: 144,
      battery: 24.3,
      exhaust: 478
    },
    { 
      id: 'TRK-140', 
      model: 'PRIMA 4625.S', 
      isLive: false, 
      health: 74, 
      rul: '18 Days', 
      conf: '92%', 
      state: 'WARNING',
      temp: 97,
      press: 50,
      vib: 0.42,
      load: 68,
      boost: 128,
      battery: 23.5,
      exhaust: 535
    },
    { 
      id: 'TRK-905', 
      model: 'PRIMA 4625.S', 
      isLive: false, 
      health: 94, 
      rul: '150 Days', 
      conf: '97%', 
      state: 'HEALTHY',
      temp: 89,
      press: 62,
      vib: 0.23,
      load: 62,
      boost: 141,
      battery: 24.1,
      exhaust: 482
    },
  ]);

  // Sync TRK-404 fields to live SSE telemetry when it changes
  useEffect(() => {
    if (!liveData) return;
    setVehicles(prev => prev.map(v => {
      if (v.id === 'TRK-404') {
        return {
          ...v,
          health: trk404Health,
          rul: `${trk404Rul} Days`,
          conf: `${trk404Conf}%`,
          state: trk404State,
          temp: liveData.actual?.coolant_temp ? Math.round(liveData.actual.coolant_temp) : v.temp,
          press: liveData.actual?.oil_pressure ? Math.round(liveData.actual.oil_pressure) : v.press,
          vib: liveData.actual?.vibration ? Number(liveData.actual.vibration.toFixed(2)) : v.vib,
          load: liveData.actual?.load ? Math.round(liveData.actual.load) : v.load,
          boost: liveData.actual?.intake_pressure ? Math.round(liveData.actual.intake_pressure) : v.boost,
          battery: liveData.actual?.battery_voltage ? Number(liveData.actual.battery_voltage.toFixed(1)) : v.battery,
          exhaust: liveData.actual?.combustion_temp ? Math.round(liveData.actual.combustion_temp) : v.exhaust
        };
      }
      return v;
    }));
  }, [liveData, trk404Health, trk404Rul, trk404Conf, trk404State]);

  // Telemetry shift simulation every 2 seconds when streamActive is true
  useEffect(() => {
    if (!streamActive) return;

    const interval = setInterval(() => {
      setVehicles(prev => prev.map(v => {
        // TRK-404 is driven by liveData; other vehicles wiggle to simulate real-time shifting values
        if (v.id === 'TRK-404') {
          const wiggleTemp = Math.round((Math.random() - 0.5) * 2);
          const wigglePress = Math.round((Math.random() - 0.5) * 2);
          return {
            ...v,
            temp: v.temp + (Math.random() > 0.7 ? wiggleTemp : 0),
            press: v.press + (Math.random() > 0.7 ? wigglePress : 0),
          };
        }

        const tempShift = (Math.random() - 0.5) * 1.5;
        const pressShift = (Math.random() - 0.5) * 1.2;
        const vibShift = (Math.random() - 0.5) * 0.03;
        const loadShift = Math.round((Math.random() - 0.5) * 4);
        const boostShift = Math.round((Math.random() - 0.5) * 3);
        const batteryShift = Number(((Math.random() - 0.5) * 0.15).toFixed(2));
        const exhaustShift = Math.round((Math.random() - 0.5) * 5);

        // Clamping boundaries to make them look realistic
        let targetTemp = v.state === 'CRITICAL' ? 108 : (v.state === 'WARNING' ? 96 : 88);
        let targetPress = v.state === 'CRITICAL' ? 42 : (v.state === 'WARNING' ? 52 : 65);
        let targetVib = v.state === 'CRITICAL' ? 0.78 : (v.state === 'WARNING' ? 0.35 : 0.20);
        let targetLoad = v.state === 'CRITICAL' ? 85 : (v.state === 'WARNING' ? 65 : 60);
        let targetBoost = v.state === 'CRITICAL' ? 95 : (v.state === 'WARNING' ? 135 : 145);
        let targetBattery = v.state === 'CRITICAL' ? 22.1 : (v.state === 'WARNING' ? 23.8 : 24.3);
        let targetExhaust = v.state === 'CRITICAL' ? 610 : (v.state === 'WARNING' ? 515 : 480);

        const newTemp = Math.round(v.temp + tempShift);
        const newPress = Math.round(v.press + pressShift);
        const newVib = Number(Math.max(0.05, v.vib + vibShift)).toFixed(2);
        const newLoad = Math.max(10, Math.min(100, v.load + loadShift));
        const newBoost = Math.max(40, Math.min(200, v.boost + boostShift));
        const newBattery = Number(Math.max(18.0, Math.min(28.0, v.battery + batteryShift))).toFixed(1);
        const newExhaust = Math.round(v.exhaust + exhaustShift);

        return {
          ...v,
          temp: Math.abs(newTemp - targetTemp) > 6 ? (newTemp > targetTemp ? targetTemp + 5 : targetTemp - 5) : newTemp,
          press: Math.abs(newPress - targetPress) > 5 ? (newPress > targetPress ? targetPress + 4 : targetPress - 4) : newPress,
          vib: Math.abs(parseFloat(newVib) - targetVib) > 0.1 ? (parseFloat(newVib) > targetVib ? (targetVib + 0.08).toFixed(2) : (targetVib - 0.08).toFixed(2)) : newVib,
          load: Math.abs(newLoad - targetLoad) > 12 ? (newLoad > targetLoad ? targetLoad + 10 : targetLoad - 10) : newLoad,
          boost: Math.abs(newBoost - targetBoost) > 10 ? (newBoost > targetBoost ? targetBoost + 8 : targetBoost - 8) : newBoost,
          battery: Math.abs(parseFloat(newBattery) - targetBattery) > 0.8 ? (parseFloat(newBattery) > targetBattery ? (targetBattery + 0.5).toFixed(1) : (targetBattery - 0.5).toFixed(1)) : newBattery,
          exhaust: Math.abs(newExhaust - targetExhaust) > 20 ? (newExhaust > targetExhaust ? targetExhaust + 15 : targetExhaust - 15) : newExhaust,
        };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [streamActive]);

  // Count active stats
  const totalVehicles = 1248;
  const healthyCount = 1102 + (trk404State === 'HEALTHY' ? 1 : 0);
  const warningCount = 114 + (trk404State === 'WATCH' || trk404State === 'WARNING' ? 1 : 0);
  const criticalCount = 32 + (trk404State === 'CRITICAL' ? 1 : 0);

  const getStatusBadge = (state) => {
    switch (state) {
      case 'HEALTHY':
        return { label: 'HEALTHY', bg: 'var(--status-go-bg)', color: 'var(--status-go)' };
      case 'WATCH':
      case 'WARNING':
        return { label: 'WARNING', bg: 'var(--status-warning-bg)', color: 'var(--status-warning)' };
      case 'CRITICAL':
        return { label: 'CRITICAL', bg: 'var(--status-critical-bg)', color: 'var(--status-critical)' };
      default:
        return { label: 'HEALTHY', bg: 'var(--status-go-bg)', color: 'var(--status-go)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

      {/* 1. SIMULATION CONTROL CENTER */}
      <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '24px', padding: '20px' }}>

        {/* Stream Engine Column */}
        <div style={{ borderRight: '1px solid #e5e7eb', paddingRight: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Cpu size={16} />
              Telemetry Stream Engine
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Control the synthetic telemetry generator streaming live Caterpillar C18 test-cell variables.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold' }}>STREAM STATUS</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: streamActive ? 'var(--status-go)' : 'var(--text-muted)' }}>
                {streamActive ? '● RUNNING' : '○ PAUSED'}
              </span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                onClick={handleStartStream}
                disabled={streamActive}
                className="tbtn"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid ' + (streamActive ? '#e5e7eb' : 'var(--status-go)'),
                  background: streamActive ? 'transparent' : 'var(--status-go-bg)',
                  color: streamActive ? '#cbd5e1' : 'var(--status-go)',
                  fontWeight: '700',
                  fontSize: '11px',
                  cursor: streamActive ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Play size={12} fill="currentColor" />
                Start
              </button>
              <button
                onClick={handleStopStream}
                disabled={!streamActive}
                className="tbtn"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid ' + (!streamActive ? '#e5e7eb' : 'var(--status-critical)'),
                  background: !streamActive ? 'transparent' : 'var(--status-critical-bg)',
                  color: !streamActive ? '#cbd5e1' : 'var(--status-critical)',
                  fontWeight: '700',
                  fontSize: '11px',
                  cursor: !streamActive ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Square size={12} fill="currentColor" />
                Pause
              </button>
            </div>
          </div>
        </div>

        {/* Predictive Test Rig Column */}
        <div style={{ borderRight: '1px solid #e5e7eb', paddingRight: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Activity size={16} />
              Predictive Test Rig
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Execute load-stress diagnostics tests by temporarily spiking RPM and engine load variables.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold' }}>TEST STATUS</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: testActive ? 'var(--status-info)' : 'var(--text-main)' }}>
                  {testActive ? `SWEEPING LOAD (${testProgress}%)` : 'IDLE'}
                </span>
              </div>

              <button
                onClick={handleRunTestCycle}
                disabled={testActive || !streamActive}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: testActive || !streamActive ? '#f3f4f6' : 'var(--cat-yellow)',
                  color: testActive || !streamActive ? '#a0aec0' : '#000000',
                  fontWeight: '700',
                  fontSize: '11px',
                  cursor: testActive || !streamActive ? 'not-allowed' : 'pointer'
                }}
              >
                {testActive ? 'RUNNING...' : 'RUN TEST'}
              </button>
            </div>

            {testActive && (
              <div style={{ width: '100%', height: '4px', background: '#f3f4f6', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${testProgress}%`, height: '100%', background: 'var(--status-info)', transition: 'width 1s linear' }} />
              </div>
            )}
          </div>
        </div>

        {/* Anomaly Injector Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={16} />
            Anomaly Injector Panel
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select
              value={selectedZone}
              onChange={e => setSelectedZone(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                outline: 'none',
                fontSize: '11px',
                background: '#ffffff'
              }}
            >
              <option value="Zone 1">Zone 1 — Intake</option>
              <option value="Zone 2">Zone 2 — Cooling</option>
              <option value="Zone 3">Zone 3 — Combustion</option>
              <option value="Zone 4">Zone 4 — Exhaust</option>
              <option value="Zone 5">Zone 5 — Turbocharger</option>
              <option value="Zone 6">Zone 6 — Aftertreatment</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                outline: 'none',
                fontSize: '11px',
                background: '#ffffff'
              }}
            >
              <option value="Small">Severity: Small</option>
              <option value="Medium">Severity: Medium</option>
              <option value="Critical">Severity: Critical</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
            <button
              onClick={handleInjectFault}
              disabled={!streamActive}
              style={{
                padding: '8px',
                borderRadius: '6px',
                background: !streamActive ? '#f3f4f6' : 'var(--cat-yellow)',
                color: !streamActive ? '#a0aec0' : '#000000',
                fontWeight: '700',
                cursor: !streamActive ? 'not-allowed' : 'pointer',
                border: 'none',
                fontSize: '11px'
              }}
            >
              INJECT ABNORMALITY
            </button>
            <button
              onClick={handleClearFault}
              disabled={!streamActive}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#f3f4f6',
                color: 'var(--text-main)',
                fontWeight: '600',
                cursor: !streamActive ? 'not-allowed' : 'pointer',
                border: '1px solid #e5e7eb',
                fontSize: '11px'
              }}
            >
              CLEAR
            </button>
          </div>
        </div>

      </div>

      {/* 2. METRICS CARDS STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {[
          { label: 'TOTAL VEHICLES', val: totalVehicles.toLocaleString(), sub: '↑ 12 active today', icon: Users, color: '#4b5563' },
          { label: 'HEALTHY', val: healthyCount.toLocaleString(), sub: `${((healthyCount / totalVehicles) * 100).toFixed(1)}% of fleet`, icon: CheckCircle, color: 'var(--status-go)' },
          { label: 'WARNINGS', val: warningCount.toLocaleString(), sub: 'Require inspection', icon: AlertTriangle, color: 'var(--status-warning)' },
          { label: 'CRITICAL FAULTS', val: criticalCount.toLocaleString(), sub: 'Immediate action needed', icon: XCircle, color: 'var(--status-critical)' },
          { label: 'EDGE CONNECTIVITY', val: '99.8%', sub: '● Nodes Synced', icon: Cpu, color: 'var(--status-info)' },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{card.label}</span>
                <h3 style={{ fontSize: '28px', fontWeight: '800', margin: '4px 0 2px 0' }}>{card.val}</h3>
                <span style={{ fontSize: '11px', color: card.color, fontWeight: '500' }}>{card.sub}</span>
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.03)',
                padding: '10px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={24} color={card.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. FLEET FOCUS AND GEOSPATIAL MAP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>

        {/* Fleet Telemetry Focus Grid */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Fleet Telemetry Focus</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {vehicles.map(vehicle => {
              const badge = getStatusBadge(vehicle.state);
              const cardBorder = vehicle.state === 'CRITICAL' ? '2px solid var(--status-critical)' :
                (vehicle.state !== 'HEALTHY' ? '2px solid var(--status-warning)' : '1px solid #e5e7eb');
              return (
                <div
                  key={vehicle.id}
                  onClick={() => {
                    if (vehicle.id === 'TRK-404') onViewChange('vehicle');
                  }}
                  style={{
                    border: cardBorder,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: vehicle.id === 'TRK-404' ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    position: 'relative',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Status Banner Tag */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: '800' }}>{vehicle.id}</span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: badge.bg,
                      color: badge.color
                    }}>{badge.label}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>{vehicle.model}</span>
                  </div>

                  {/* Health and multi-parameter telemetry values */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px 6px',
                    borderTop: '1px solid #f3f4f6',
                    paddingTop: '10px',
                    marginTop: '4px'
                  }}>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>Health</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: vehicle.health < 50 ? 'var(--status-critical)' : (vehicle.health < 80 ? 'var(--status-warning)' : 'var(--status-go)') }}>{vehicle.health}%</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>Pred. RUL</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{vehicle.rul}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>Temp</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: vehicle.temp > 100 ? 'var(--status-critical)' : (vehicle.temp > 93 ? 'var(--status-warning)' : 'var(--text-main)') }}>{vehicle.temp}°C</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>Oil Press</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: vehicle.press < 45 ? 'var(--status-critical)' : 'var(--text-main)' }}>{vehicle.press} PSI</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>Vibration</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: vehicle.vib > 0.6 ? 'var(--status-critical)' : (vehicle.vib > 0.3 ? 'var(--status-warning)' : 'var(--text-main)') }}>{vehicle.vib} g</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>Load</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{vehicle.load}%</span>
                    </div>
                  </div>

                  {/* Details Link */}
                  {vehicle.isLive && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--cat-yellow)',
                      fontWeight: '600',
                      marginTop: '4px',
                      justifyContent: 'flex-end'
                    }}>
                      LIVE STREAM <ArrowUpRight size={12} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Energy Field 6x6 Matrix */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Thermodynamic Correlation Matrix</h3>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>6×6 CORRELATION DEVIATION MATRIX</span>
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: (liveData?.energy_field?.global_deviation || 0.14) > 2.5 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              color: (liveData?.energy_field?.global_deviation || 0.14) > 2.5 ? 'var(--status-critical)' : 'var(--status-go)',
              fontFamily: 'monospace'
            }}>
              EF DEV: {(liveData?.energy_field?.global_deviation || 0.14).toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>

            {/* 6x6 Grid of cells */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '4px',
              background: 'rgba(0,0,0,0.05)',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              {(() => {
                const labels = ['RPM', 'Load', 'Boost', 'Exh T', 'Cool T', 'Oil P'];
                const healthyCorr = [
                  [1.00, 0.45, 0.85, 0.70, 0.30, 0.75],
                  [0.45, 1.00, 0.80, 0.90, 0.50, 0.20],
                  [0.85, 0.80, 1.00, 0.85, 0.40, 0.65],
                  [0.70, 0.90, 0.85, 1.00, 0.55, 0.35],
                  [0.30, 0.50, 0.40, 0.55, 1.00, -0.30],
                  [0.75, 0.20, 0.65, 0.35, -0.30, 1.00]
                ];

                const matrix = liveData?.correlation_matrix || healthyCorr;
                const cells = [];

                for (let r = 0; r < 6; r++) {
                  for (let c = 0; c < 6; c++) {
                    const val = matrix[r]?.[c] !== undefined ? matrix[r][c] : healthyCorr[r][c];
                    const baseVal = healthyCorr[r][c];
                    const diff = Math.abs(val - baseVal);
                    const isDisrupted = diff > 0.05 && r !== c;

                    let bg = '';
                    let border = '1px solid rgba(0,0,0,0.03)';
                    let boxShadow = 'none';

                    if (r === c) {
                      bg = 'rgba(245,197,24,0.3)'; // Diagonal
                    } else if (isDisrupted) {
                      bg = `rgba(239, 68, 68, ${(0.15 + diff * 1.5).toFixed(2)})`; // Drifted
                      border = '1px solid var(--status-critical)';
                      boxShadow = '0 0 6px rgba(239,68,68,0.3)';
                    } else if (val >= 0) {
                      bg = `rgba(59, 130, 246, ${(0.05 + val * 0.5).toFixed(2)})`; // Positive correlation
                    } else {
                      bg = `rgba(249, 115, 22, ${(0.05 + Math.abs(val) * 0.4).toFixed(2)})`; // Negative correlation
                    }

                    cells.push(
                      <div
                        key={`${r}-${c}`}
                        className="ef-cell"
                        style={{
                          aspectRatio: '1',
                          background: bg,
                          border: border,
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          boxShadow: boxShadow,
                          transition: 'all 0.2s'
                        }}
                        title={`${labels[r]} ↔ ${labels[c]}: ${val.toFixed(2)}${isDisrupted ? ` (Drift: ${diff.toFixed(2)})` : ''}`}
                      >
                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: r === c ? '#000000' : 'var(--text-main)' }}>
                          {val.toFixed(2)}
                        </span>
                      </div>
                    );
                  }
                }
                return cells;
              })()}
            </div>

            {/* Axis labels at bottom */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', textAlign: 'center' }}>
              {['RPM', 'Load', 'Boost', 'Exh T', 'Cool T', 'Oil P'].map((lbl, idx) => (
                <span key={idx} style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {lbl}
                </span>
              ))}
            </div>

            {/* Relationship status advisory info */}
            <div style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0,0,0,0.02)',
              borderLeft: '4px solid ' + ((liveData?.energy_field?.global_deviation || 0.14) > 2.5 ? 'var(--status-critical)' : 'var(--status-go)'),
              fontSize: '11px',
              lineHeight: '1.4'
            }}>
              <strong>Thermodynamic Shift Status:</strong>{' '}
              {(liveData?.energy_field?.global_deviation || 0.14) > 2.5 ? (
                <span style={{ color: 'var(--status-critical)' }}>
                  Elevated thermodynamic drift detected. Most disrupted sensor relation:{' '}
                  <strong>{liveData?.energy_field?.most_disrupted_sensor || 'N/A'}</strong>. Check active zones.
                </span>
              ) : (
                <span style={{ color: 'var(--status-go)' }}>
                  All thermodynamic relationships are within nominal bounds. Cosine similarity:{' '}
                  <strong>{(liveData?.energy_field?.cosine_similarity || 0.999).toFixed(4)}</strong>.
                </span>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* 4. LIVE EVENT FEED TABLE */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Live Event Feed</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>SEVERITY</th>
                <th style={{ padding: '12px' }}>TIMESTAMP</th>
                <th style={{ padding: '12px' }}>EVENT DESCRIPTION</th>
                <th style={{ padding: '12px' }}>VEHICLE ID</th>
                <th style={{ padding: '12px' }}>METRIC REASON</th>
                <th style={{ padding: '12px' }}>OCCURRENCE</th>
              </tr>
            </thead>
            <tbody>
              {/* Dynamic Alert rows */}
              {alerts.slice(-4).reverse().map((alert, idx) => {
                const badge = getStatusBadge(alert.state);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: badge.bg,
                        color: badge.color
                      }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{new Date(alert.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{alert.message}</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>{alert.zone === 'Zone 2' ? 'TRK-404' : 'TRK-209'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{alert.severity} Deviations</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Just now</td>
                  </tr>
                );
              })}

              {/* Default Mock logs if alerts are empty */}
              {alerts.length === 0 && (
                <>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--status-critical-bg)', color: 'var(--status-critical)' }}>CRITICAL</span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>14:32:05</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>C18 Cooling System Anomaly Detected - High Thermal Drift</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>TRK-404</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Coolant Temp elevated</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>12m ago</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}>WARNING</span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>14:30:11</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>Wheel Hub Temperature Warning - Deceleration Drift</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>TRK-755</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Brake Wear anomaly</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>27m ago</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--status-go-bg)', color: 'var(--status-go)' }}>HEALTHY</span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>14:28:44</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>Diagnostic Sync Completed Successfully</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>TRK-880</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Baseline consistent</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>29m ago</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* XGBOOST AI CLASSIFIER BLOCK */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
        
        {/* Column 1: XGBoost Model Controller */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>XGBoost AI Classifier</h3>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>EDGE DIAGNOSTIC MODEL STATUS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', flex: 1 }}>
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.02)',
              border: '1px solid ' + (modelStatus.is_trained ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.2)'),
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>Training Status:</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: modelStatus.is_trained ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                  color: modelStatus.is_trained ? 'var(--status-go)' : 'var(--status-critical)'
                }}>
                  {modelStatus.is_trained ? '● MODEL TRAINED' : '○ UNTRAINED'}
                </span>
              </div>

              {modelStatus.is_trained && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Validation Accuracy:</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--status-go)' }}>
                      {modelStatus.metadata?.accuracy ? (modelStatus.metadata.accuracy * 100).toFixed(2) : '0.00'}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trained At:</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                      {modelStatus.metadata?.trained_at ? new Date(modelStatus.metadata.trained_at).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Training Data Size:</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>
                      {modelStatus.metadata?.num_samples || 0} samples
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleTrainModel}
              disabled={isTraining || !streamActive}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: isTraining || !streamActive ? '#f3f4f6' : 'var(--cat-yellow)',
                color: isTraining || !streamActive ? '#a0aec0' : '#000000',
                fontWeight: '700',
                cursor: isTraining || !streamActive ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isTraining ? 'Training XGBoost Model (Generating Data...)...' : 'TRAIN XGBOOST AI CLASSIFIER'}
            </button>
          </div>
        </div>

        {/* Column 2: XGBoost Predicted Zone Probabilities */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>XGBoost Suspected Zone Probabilities</h3>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>REAL-TIME MODEL INFERENCE DISTRIBUTIONS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
            {[
              { id: 'Healthy', name: 'Nominal Baseline (Healthy)', color: 'var(--status-go)' },
              { id: 'Zone 1', name: 'Zone 1 — Intake Air (Turbo boost)', color: 'var(--status-info)' },
              { id: 'Zone 2', name: 'Zone 2 — Charge Air Cooler (Radiator)', color: 'var(--status-warning)' },
              { id: 'Zone 3', name: 'Zone 3 — Combustion Chamber', color: 'var(--status-critical)' },
              { id: 'Zone 4', name: 'Zone 4 — Exhaust Manifold', color: 'var(--status-warning)' },
              { id: 'Zone 5', name: 'Zone 5 — Turbocharger Pressure', color: '#8b5cf6' },
              { id: 'Zone 6', name: 'Zone 6 — DPF / Aftertreatment', color: '#ec4899' },
            ].map(z => {
              const prob = zoneProbs[z.id] !== undefined ? zoneProbs[z.id] : 0.0;
              const probPct = (prob * 100).toFixed(1);
              return (
                <div key={z.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600' }}>
                    <span style={{ color: prob > 0.3 ? z.color : 'var(--text-main)' }}>{z.name}</span>
                    <span style={{ fontFamily: 'monospace' }}>{probPct}%</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${probPct}%`,
                      height: '100%',
                      backgroundColor: z.color,
                      borderRadius: '3px',
                      transition: 'width 0.4s ease-out, background-color 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
