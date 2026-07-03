import React from 'react'
import { 
  Wrench, 
  Clock, 
  DollarSign, 
  Calendar,
  AlertTriangle
} from 'lucide-react'

export default function MaintenanceView({ liveData, history }) {
  // Extract live variables if fault is active to customize first ticket card dynamically
  const trk404State = liveData?.diagnostics?.state || 'HEALTHY';
  const trk404Rul = liveData?.rul ? Math.round(liveData.rul) : 126;
  const activeZone = liveData?.active_zone || 'Healthy';
  const severity = liveData?.severity || 'None';

  // Active Task Queue cards
  const taskQueue = [
    { 
      id: 'TM-8092', 
      title: trk404State !== 'HEALTHY' ? `TRK-404 ${activeZone} Fault` : 'Main Drive Shaft Bearing Fault', 
      rul: trk404State !== 'HEALTHY' ? `${trk404Rul}h` : '34h', 
      severity: trk404State !== 'HEALTHY' ? (trk404State === 'CRITICAL' ? 'Critical' : 'Elevated') : 'Critical', 
      cost: trk404State !== 'HEALTHY' ? '$3,800 Est.' : '$4,200 Est.', 
      date: 'Oct 28' 
    },
    { id: 'TM-1145', title: 'Coolant Pressure Drop', rul: '14 Days', severity: 'Elevated', cost: '$850 Est.', date: 'Nov 05' },
    { id: 'TM-5521', title: '10,000hr Service Interval', rul: '45 Days', severity: 'Routine', cost: '$1,200 Est.', date: 'Dec 10' },
    { id: 'TM-3648', title: 'Hydraulic Pump Leak', rul: '12h', severity: 'Under Repair', cost: '$3,100 Est.', date: 'Oct 27' },
    { id: 'TM-8025', title: 'Sensor Array Malfunction', rul: '60h', severity: 'Parts Pending', cost: '$1,500 Est.', date: 'Nov 02' },
    { id: 'TM-5522', title: 'Engine Valve Check', rul: '100h', severity: 'Scheduled', cost: '$2,200 Est.', date: 'Dec 05' },
    { id: 'TM-9101', title: 'Transmission Gear Wear', rul: '48h', severity: 'Elevated', cost: '$5,400 Est.', date: 'Nov 15' },
    { id: 'TM-1234', title: 'Battery Cell Replacement', rul: '24h', severity: 'Critical', cost: '$900 Est.', date: 'Oct 30' },
    { id: 'TM-7765', title: 'Tire Tread Wear', rul: '200h', severity: 'Routine', cost: '$1,800 Est.', date: 'Dec 20' },
  ];

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case 'Critical':
        return { bg: 'var(--status-critical-bg)', color: 'var(--status-critical)' };
      case 'Elevated':
      case 'Parts Pending':
        return { bg: 'var(--status-warning-bg)', color: 'var(--status-warning)' };
      case 'Routine':
      case 'Scheduled':
        return { bg: 'var(--status-go-bg)', color: 'var(--status-go)' };
      case 'Under Repair':
      default:
        return { bg: 'var(--status-info-bg)', color: 'var(--status-info)' };
    }
  };

  // Helper to draw mini wave SVG lines
  const generateMiniWave = (isUp = true) => {
    return isUp ? "M 0 15 Q 10 5 20 15 T 40 15 T 60 5" : "M 0 5 Q 10 15 20 5 T 40 5 T 60 15";
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      
      {/* HEADER CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Real-time Predictive Scheduling</span>
        <button style={{
          padding: '8px 16px',
          borderRadius: '8px',
          background: 'var(--sidebar-bg-end)',
          color: '#ffffff',
          fontWeight: '600',
          cursor: 'pointer',
          border: 'none',
          fontSize: '12px'
        }}>
          Generate Fleet Health Report
        </button>
      </div>

      {/* 1. TOP STATS STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'In Service', val: '1,402', sub: '▲ 2.1%', isUp: true, color: 'var(--status-go)' },
          { label: 'Pending Repair', val: '84', sub: '12 Urgent', isUp: false, color: 'var(--status-critical)' },
          { label: 'Fleet Readiness %', val: '88%', sub: 'Target 90%', isUp: true, color: 'var(--status-go)' }
        ].map((card, idx) => (
          <div key={idx} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>{card.label}</span>
              <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0 2px 0' }}>{card.val}</h3>
              <span style={{ fontSize: '11px', color: card.color, fontWeight: '500' }}>{card.sub}</span>
            </div>
            <div style={{ width: '60px', height: '20px' }}>
              <svg width="100%" height="100%">
                <path d={generateMiniWave(card.isUp)} fill="none" stroke={card.color} strokeWidth="2" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* 2. MIDDLE ROW: TASK QUEUE & RESOURCE PANEL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '24px' }}>
        
        {/* Active Task Queue */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Active Task Queue</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {taskQueue.map((task, idx) => {
              const sev = getSeverityStyle(task.severity);
              return (
                <div key={idx} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: '#ffffff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>{task.id}</span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: sev.bg,
                      color: sev.color
                    }}>{task.severity}</span>
                  </div>

                  <h4 style={{ fontSize: '12px', fontWeight: '800', height: '32px', overflow: 'hidden' }}>{task.title}</h4>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid #f3f4f6', paddingTop: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Clock size={10} /> RUL: {task.rul}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><DollarSign size={10} /> {task.cost}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <Calendar size={10} /> {task.date}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resource Optimization and Shift Schedules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Tech shift schedules */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Resource Optimization</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'center' }}>
              {/* Semi-circular tech availability gauge */}
              <div style={{ position: 'relative', width: '100px', height: '50px', overflow: 'hidden' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <path d="M 10,50 A 40,40 0 0,1 90,50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <path d="M 10,50 A 40,40 0 0,1 90,50" fill="none" stroke="var(--status-info)" strokeWidth="8" strokeDasharray="125.6" strokeDashoffset="31.4" />
                </svg>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800' }}>75%</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Technician Availability</span>
                <span style={{ fontSize: '12px', fontWeight: '700' }}>Spare Parts Status: Adequate</span>
              </div>
            </div>

            {/* Shift schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Shift Schedule (Today)</span>
              {[
                { name: 'A. Chen', shift: '08:00 - 16:00', status: 'Active', color: 'var(--status-go)' },
                { name: 'M. Davis', shift: '16:00 - 00:00', status: 'Scheduled', color: 'var(--status-info)' },
                { name: 'K. Patel', shift: '00:00 - 08:00', status: 'On Call', color: 'var(--status-warning)' }
              ].map((tech, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>{tech.name} ({tech.shift})</span>
                  <span style={{ color: tech.color, fontWeight: '700' }}>{tech.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Spare Parts Inventory */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Critical Spare Parts Inventory</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              {[
                { name: 'Gaskets', qty: 12, label: 'Low', color: 'var(--status-warning)' },
                { name: 'Seals', qty: 4, label: 'Critical', color: 'var(--status-critical)' },
                { name: 'Bearings', qty: 8, label: 'Adequate', color: 'var(--status-go)' },
                { name: 'Filters', qty: 20, label: 'Good', color: 'var(--status-go)' }
              ].map((part, idx) => (
                <div key={idx} style={{
                  padding: '10px 4px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  border: '1px solid #e5e7eb'
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: 'bold' }}>{part.name}</span>
                  <h4 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0' }}>{part.qty}</h4>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: part.color }}>{part.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 3. HISTORICAL RELIABILITY CHART (6 Months MTBF) */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Historical Reliability (6 Months MTBF)</h3>
        
        <div style={{ position: 'relative', width: '100%', height: '140px' }}>
          <svg width="100%" height="100%" viewBox="0 0 500 140">
            {/* Axis grids */}
            <line x1="0" y1="35" x2="500" y2="35" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="70" x2="500" y2="70" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="105" x2="500" y2="105" stroke="#f3f4f6" strokeWidth="1" />

            {/* Target Area Shade (Green) */}
            <path d="M 0,110 L 100,100 L 200,90 L 300,85 L 400,75 L 500,60 L 500,130 L 0,130 Z" fill="rgba(16, 185, 129, 0.05)" />
            {/* Target Line (Green) */}
            <path d="M 0,110 L 100,100 L 200,90 L 300,85 L 400,75 L 500,60" fill="none" stroke="var(--status-go)" strokeWidth="1.5" />

            {/* Fleet Average Line (Blue) */}
            <path d="M 0,120 L 100,110 L 200,95 L 300,92 L 400,88 L 500,78" fill="none" stroke="var(--status-info)" strokeWidth="2.5" />

            {/* Node dots */}
            <circle cx="100" cy="110" r="4" fill="var(--status-info)" />
            <circle cx="200" cy="95" r="4" fill="var(--status-info)" />
            <circle cx="300" cy="92" r="4" fill="var(--status-info)" />
            <circle cx="400" cy="88" r="4" fill="var(--status-info)" />
            <circle cx="500" cy="78" r="4" fill="var(--status-info)" />

            {/* Text ratings */}
            <text x="100" y="122" fill="var(--text-muted)" fontSize="8" textAnchor="middle">340h</text>
            <text x="200" y="107" fill="var(--text-muted)" fontSize="8" textAnchor="middle">355h</text>
            <text x="300" y="104" fill="var(--text-muted)" fontSize="8" textAnchor="middle">360h</text>
            <text x="400" y="100" fill="var(--text-muted)" fontSize="8" textAnchor="middle">375h</text>
            <text x="500" y="70" fill="var(--text-muted)" fontSize="8" textAnchor="middle">380h</text>
          </svg>
          
          {/* Months labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
          </div>
        </div>
      </div>

    </div>
  );
}
