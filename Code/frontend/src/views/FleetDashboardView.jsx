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
  Flame,
  CheckCircle2,
  Info,
  Gauge
} from 'lucide-react'
import Card from '../components/common/Card'
import StatusBadge from '../components/common/StatusBadge'
import Button from '../components/common/Button'

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

  // Control states
  const [selectedZone, setSelectedZone] = useState('Zone 2');
  const [selectedSeverity, setSelectedSeverity] = useState('Critical');
  const [testActive, setTestActive] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [streamActive, setStreamActive] = useState(true);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%' }}>

      {/* 1. SIMULATION CONTROL CENTER */}
      <Card className="dashboard-hero-grid responsive-grid" style={{ padding: '20px' }}>

        {/* Stream Engine Column */}
        <div className="divider-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 className="md-typescale-title-small" style={{ color: 'var(--md-sys-color-on-surface)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Cpu size={16} />
              Telemetry Stream Engine
            </h4>
            <p className="md-typescale-body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Control the synthetic telemetry generator streaming live Caterpillar C18 test-cell variables.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto', paddingTop: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 'max-content' }}>
              <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>STREAM STATUS</span>
              <span className="md-typescale-title-small" style={{ color: streamActive ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                {streamActive ? '● RUNNING' : '○ PAUSED'}
              </span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                size="sm"
                onClick={handleStartStream}
                disabled={streamActive}
                variant="primary"
              >
                <Play size={16} fill="currentColor" />
                Start
              </Button>
              <Button
                size="sm"
                onClick={handleStopStream}
                disabled={!streamActive}
                variant={streamActive ? "danger" : "outlined"}
              >
                <Square size={16} fill="currentColor" />
                Pause
              </Button>
            </div>
          </div>
        </div>

        {/* Predictive Test Rig Column */}
        <div className="divider-col-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 className="md-typescale-title-small" style={{ color: 'var(--md-sys-color-on-surface)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Activity size={16} />
              Predictive Test Rig
            </h4>
            <p className="md-typescale-body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Execute load-stress diagnostics tests by temporarily spiking RPM and engine load variables.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 'max-content' }}>
                <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>TEST STATUS</span>
                <span className="md-typescale-title-small" style={{ color: testActive ? 'var(--md-sys-color-secondary)' : 'var(--md-sys-color-on-surface)', whiteSpace: 'nowrap' }}>
                  {testActive ? `SWEEPING LOAD (${testProgress}%)` : 'IDLE'}
                </span>
              </div>

              <Button
                size="sm"
                onClick={handleRunTestCycle}
                disabled={testActive || !streamActive}
                variant="primary"
              >
                {testActive ? 'RUNNING...' : 'RUN TEST'}
              </Button>
            </div>

            {testActive && (
              <div style={{ width: '100%', height: '4px', background: 'var(--md-sys-color-outline-variant)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${testProgress}%`, height: '100%', background: 'var(--md-sys-color-secondary)', transition: 'width 1s linear' }} />
              </div>
            )}
          </div>
        </div>

        {/* Anomaly Injector Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 className="md-typescale-title-small" style={{ color: 'var(--md-sys-color-on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={16} />
            Anomaly Injector Panel
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select
              id="anomaly-zone"
              name="anomaly-zone"
              value={selectedZone}
              onChange={e => setSelectedZone(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--md-sys-color-outline-variant)',
                outline: 'none',
                fontSize: '11px',
                background: 'var(--md-sys-color-surface-container)',
                color: 'var(--md-sys-color-on-surface)'
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
              id="anomaly-severity"
              name="anomaly-severity"
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--md-sys-color-outline-variant)',
                outline: 'none',
                fontSize: '11px',
                background: 'var(--md-sys-color-surface-container)',
                color: 'var(--md-sys-color-on-surface)'
              }}
            >
              <option value="Small">Severity: Small</option>
              <option value="Medium">Severity: Medium</option>
              <option value="Critical">Severity: Critical</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
            <Button
              size="sm"
              onClick={handleInjectFault}
              disabled={!streamActive}
              variant="primary"
            >
              INJECT FAULT
            </Button>
            <Button
              size="sm"
              onClick={handleClearFault}
              disabled={!streamActive}
              variant="outlined"
            >
              CLEAR
            </Button>
          </div>
        </div>

      </Card>

      {/* 2. METRICS CARDS STRIP */}
      <div className="responsive-grid-cols-5 responsive-grid" style={{ gap: '16px' }}>
        {[
          { label: 'TOTAL VEHICLES', val: totalVehicles.toLocaleString(), sub: '↑ 12 active today', icon: Users, color: 'var(--md-sys-color-outline)' },
          { label: 'HEALTHY', val: healthyCount.toLocaleString(), sub: `${((healthyCount / totalVehicles) * 100).toFixed(1)}% of fleet`, icon: CheckCircle, color: 'var(--md-sys-color-primary)' },
          { label: 'WARNINGS', val: warningCount.toLocaleString(), sub: 'Require inspection', icon: AlertTriangle, color: 'var(--md-sys-color-tertiary)' },
          { label: 'CRITICAL FAULTS', val: criticalCount.toLocaleString(), sub: 'Immediate action needed', icon: XCircle, color: 'var(--md-sys-color-error)' },
          { label: 'EDGE CONNECTIVITY', val: '99.8%', sub: '● Nodes Synced', icon: Cpu, color: 'var(--md-sys-color-secondary)' },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="md-typescale-label-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{card.label}</span>
                <h3 className="md-typescale-headline-medium" style={{ margin: '4px 0 2px 0', color: 'var(--md-sys-color-on-surface)' }}>{card.val}</h3>
                <span className="md-typescale-label-medium" style={{ color: card.color }}>{card.sub}</span>
              </div>
              <div style={{
                background: 'var(--md-sys-color-surface-variant)',
                padding: '10px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={24} color={card.color} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* 3. FLEET FOCUS AND GEOSPATIAL MAP */}
      <div className="dashboard-focus-grid responsive-grid">

        {/* Fleet Telemetry Focus Grid */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="md-typescale-title-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>Fleet Telemetry Focus</h3>
          <div className="responsive-grid-cols-3 responsive-grid" style={{ gap: '16px' }}>
            {vehicles.map(vehicle => {
              const cardBorder = vehicle.state === 'CRITICAL' ? '2px solid var(--md-sys-color-error)' :
                (vehicle.state !== 'HEALTHY' ? '2px solid var(--md-sys-color-tertiary)' : '1px solid var(--md-sys-color-outline-variant)');
              return (
                <div
                  key={vehicle.id}
                  onClick={() => onViewChange(`vehicle/${vehicle.id}`)}
                  style={{
                    border: cardBorder,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    position: 'relative',
                    boxShadow: '0 2px 8px var(--md-sys-color-surface-variant)'
                  }}
                >
                  {/* Status Banner Tag */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span className="md-typescale-title-small" style={{ color: 'var(--md-sys-color-on-surface)' }}>{vehicle.id}</span>
                    <StatusBadge state={vehicle.state} />
                  </div>

                  <div>
                    <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block' }}>{vehicle.model}</span>
                  </div>

                  {/* Health and multi-parameter telemetry values */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px 6px',
                    borderTop: '1px solid var(--md-sys-color-outline-variant)',
                    paddingTop: '10px',
                    marginTop: '4px'
                  }}>
                    <div style={{ overflow: 'hidden' }}>
                      <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Health</span>
                      <span className="md-typescale-title-small" style={{ color: vehicle.health < 50 ? 'var(--md-sys-color-error)' : (vehicle.health < 80 ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)'), whiteSpace: 'nowrap' }}>{vehicle.health}%</span>
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Pred. RUL</span>
                      <span className="md-typescale-title-small" style={{ color: 'var(--md-sys-color-on-surface)', whiteSpace: 'nowrap' }}>{vehicle.rul}</span>
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Temp</span>
                      <span className="md-typescale-title-small" style={{ color: vehicle.temp > 100 ? 'var(--md-sys-color-error)' : (vehicle.temp > 93 ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-on-surface)'), whiteSpace: 'nowrap' }}>{vehicle.temp}°C</span>
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Oil Press</span>
                      <span className="md-typescale-title-small" style={{ color: vehicle.press < 45 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)', whiteSpace: 'nowrap' }}>{vehicle.press} PSI</span>
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Vibration</span>
                      <span className="md-typescale-title-small" style={{ color: vehicle.vib > 0.6 ? 'var(--md-sys-color-error)' : (vehicle.vib > 0.3 ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-on-surface)'), whiteSpace: 'nowrap' }}>{vehicle.vib} g</span>
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Load</span>
                      <span className="md-typescale-title-small" style={{ color: 'var(--md-sys-color-on-surface)', whiteSpace: 'nowrap' }}>{vehicle.load}%</span>
                    </div>
                  </div>

                  {/* Details Link */}
                  {vehicle.isLive && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--md-sys-color-primary)',
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
        </Card>

        {/* Interactive Energy Field 6x6 Matrix */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="md-typescale-title-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>Thermodynamic Correlation Matrix</h3>
              <span className="md-typescale-label-small mono-font" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>6×6 CORRELATION DEVIATION MATRIX</span>
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: (liveData?.energy_field?.global_deviation || 0.14) > 2.5 ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-primary-container)',
              color: (liveData?.energy_field?.global_deviation || 0.14) > 2.5 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)',
              fontFamily: 'monospace'
            }}>
              EF DEV: {(liveData?.energy_field?.global_deviation || 0.14).toFixed(2)}
            </div>
          </div>

          <div className="responsive-table-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
            <div style={{ minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 6x6 Grid of cells */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '4px',
              background: 'var(--md-sys-color-shadow)',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--md-sys-color-outline-variant)'
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
                    let color = 'var(--md-sys-color-on-surface)';
                    let border = '1px solid var(--md-sys-color-surface-variant)';
                    let boxShadow = 'none';

                    if (r === c) {
                      bg = 'var(--md-sys-color-tertiary-container)'; // Diagonal
                      color = 'var(--md-sys-color-on-tertiary-container)';
                    } else if (isDisrupted) {
                      bg = `var(--md-sys-color-error-container)`; // Drifted
                      border = '1px solid var(--md-sys-color-error)';
                      boxShadow = '0 0 6px var(--md-sys-color-error-container)';
                      color = 'var(--md-sys-color-on-error-container)';
                    } else if (val >= 0) {
                      bg = `var(--md-sys-color-secondary-container)`; // Positive correlation
                      color = 'var(--md-sys-color-on-secondary-container)';
                    } else {
                      bg = `var(--md-sys-color-tertiary-container)`; // Negative correlation
                      color = 'var(--md-sys-color-on-tertiary-container)';
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
                        <span className="md-typescale-label-small" style={{ color: color }}>
                          {val.toFixed(2)}
                        </span>
                      </div>
                    );
                  }
                }
                return cells;
              })()}
            </div>

            </div>
            {/* Axis labels at bottom */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', textAlign: 'center', padding: '0 8px' }}>
              {['RPM', 'Load', 'Boost', 'Exh T', 'Cool T', 'Oil P'].map((lbl, idx) => (
                <span key={idx} className="md-typescale-label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {lbl}
                </span>
              ))}
            </div>

            {/* Relationship status advisory info */}
            <div style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-surface-variant)',
              borderLeft: '4px solid ' + ((liveData?.energy_field?.global_deviation || 0.14) > 2.5 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)'),
              fontSize: '11px',
              lineHeight: '1.4',
              color: 'var(--md-sys-color-on-surface)'
            }}>
              <strong style={{ color: 'var(--md-sys-color-on-surface)' }}>Thermodynamic Shift Status:</strong>{' '}
              {(liveData?.energy_field?.global_deviation || 0.14) > 2.5 ? (
                <span style={{ color: 'var(--md-sys-color-error)' }}>
                  Elevated thermodynamic drift detected. Most disrupted sensor relation:{' '}
                  <strong>{liveData?.energy_field?.most_disrupted_sensor || 'N/A'}</strong>. Check active zones.
                </span>
              ) : (
                <span style={{ color: 'var(--md-sys-color-primary)' }}>
                  All thermodynamic relationships are within nominal bounds. Cosine similarity:{' '}
                  <strong>{(liveData?.energy_field?.cosine_similarity || 0.999).toFixed(4)}</strong>.
                </span>
              )}
            </div>

          </div>
        </Card>

      </div>

      {/* 4. LIVE EVENT FEED TABLE */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 className="md-typescale-title-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>Live Event Feed</h3>
        <div className="responsive-table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: 'var(--md-sys-color-on-surface)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--md-sys-color-outline-variant)', color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'left' }}>
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
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge state={alert.state} />
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{new Date(alert.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{alert.message}</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>{alert.zone === 'Zone 2' ? 'TRK-404' : 'TRK-209'}</td>
                    <td style={{ padding: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>{alert.severity} Deviations</td>
                    <td style={{ padding: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>Just now</td>
                  </tr>
                );
              })}

              {/* Default Mock logs if alerts are empty */}
              {alerts.length === 0 && (
                <>
                  <tr style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge state="CRITICAL" />
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>14:32:05</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>C18 Cooling System Anomaly Detected - High Thermal Drift</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>TRK-404</td>
                    <td style={{ padding: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>Coolant Temp elevated</td>
                    <td style={{ padding: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>12m ago</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge state="WARNING" />
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>14:30:11</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>Wheel Hub Temperature Warning - Deceleration Drift</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>TRK-755</td>
                    <td style={{ padding: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>Brake Wear anomaly</td>
                    <td style={{ padding: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>27m ago</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge state="HEALTHY" />
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>14:28:44</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>Diagnostic Sync Completed Successfully</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>TRK-880</td>
                    <td style={{ padding: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>Baseline consistent</td>
                    <td style={{ padding: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>29m ago</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
