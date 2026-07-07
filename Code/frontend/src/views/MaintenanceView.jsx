import React, { useState } from 'react'
import { 
  Wrench, 
  Clock, 
  DollarSign, 
  Calendar,
  AlertTriangle
} from 'lucide-react'
import Card from '../components/common/Card'
import ChartContainer from '../components/common/ChartContainer'
import StatusBadge from '../components/common/StatusBadge'
import Button from '../components/common/Button'

export default function MaintenanceView({ liveData, history }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert('Fleet Health Report has been generated and downloaded successfully.');
    }, 1500);
  };
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
      severity: trk404State !== 'HEALTHY' ? (trk404State === 'CRITICAL' ? 'CRITICAL' : 'WARNING') : 'CRITICAL', 
      cost: trk404State !== 'HEALTHY' ? '$3,800 Est.' : '$4,200 Est.', 
      date: 'Oct 28' 
    },
    { id: 'TM-1145', title: 'Coolant Pressure Drop', rul: '14 Days', severity: 'WARNING', cost: '$850 Est.', date: 'Nov 05' },
    { id: 'TM-5521', title: '10,000hr Service Interval', rul: '45 Days', severity: 'HEALTHY', cost: '$1,200 Est.', date: 'Dec 10' },
    { id: 'TM-3648', title: 'Hydraulic Pump Leak', rul: '12h', severity: 'WARNING', cost: '$3,100 Est.', date: 'Oct 27' },
    { id: 'TM-8025', title: 'Sensor Array Malfunction', rul: '60h', severity: 'WATCH', cost: '$1,500 Est.', date: 'Nov 02' },
    { id: 'TM-5522', title: 'Engine Valve Check', rul: '100h', severity: 'HEALTHY', cost: '$2,200 Est.', date: 'Dec 05' },
    { id: 'TM-9101', title: 'Transmission Gear Wear', rul: '48h', severity: 'WARNING', cost: '$5,400 Est.', date: 'Nov 15' },
    { id: 'TM-1234', title: 'Battery Cell Replacement', rul: '24h', severity: 'CRITICAL', cost: '$900 Est.', date: 'Oct 30' },
    { id: 'TM-7765', title: 'Tire Tread Wear', rul: '200h', severity: 'HEALTHY', cost: '$1,800 Est.', date: 'Dec 20' },
  ];

  // Helper to draw mini wave SVG lines
  const generateMiniWave = (isUp = true) => {
    return isUp ? "M 0 15 Q 10 5 20 15 T 40 15 T 60 5" : "M 0 5 Q 10 15 20 5 T 40 5 T 60 15";
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%' }}>
      
      {/* HEADER CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>Real-time Predictive Scheduling</span>
        <Button 
          variant="tonal"
          onClick={handleGenerateReport}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Fleet Health Report'}
        </Button>
      </div>

      {/* 1. TOP STATS STRIP */}
      <div className="responsive-grid-cols-3 responsive-grid" style={{ gap: '16px' }}>
        {[
          { label: 'In Service', val: '1,402', sub: '▲ 2.1%', isUp: true, color: 'var(--md-sys-color-primary)' },
          { label: 'Pending Repair', val: '84', sub: '12 Urgent', isUp: false, color: 'var(--md-sys-color-error)' },
          { label: 'Fleet Readiness %', val: '88%', sub: 'Target 90%', isUp: true, color: 'var(--md-sys-color-primary)' }
        ].map((card, idx) => (
          <Card key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>{card.label}</span>
              <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0 2px 0', color: 'var(--md-sys-color-on-surface)' }}>{card.val}</h3>
              <span className="md-typescale-label-medium" style={{ color: card.color }}>{card.sub}</span>
            </div>
            <div style={{ width: '60px', height: '20px' }}>
              <svg width="100%" height="100%">
                <path d={generateMiniWave(card.isUp)} fill="none" stroke={card.color} strokeWidth="2" />
              </svg>
            </div>
          </Card>
        ))}
      </div>

      {/* 2. MIDDLE ROW: TASK QUEUE & RESOURCE PANEL */}
      <div className="maintenance-resource-grid responsive-grid" style={{ gap: '24px' }}>
        
        {/* Active Task Queue */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--md-sys-color-on-surface)' }}>Active Task Queue</h3>
          
          <div className="responsive-grid-cols-3 responsive-grid" style={{ gap: '12px' }}>
            {taskQueue.map((task, idx) => {
              return (
                <div key={idx} style={{
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: 'var(--md-sys-color-surface-container)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--md-sys-color-on-surface-variant)' }}>{task.id}</span>
                    <StatusBadge state={task.severity} />
                  </div>

                  <h4 className="md-typescale-title-small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'var(--md-sys-color-on-surface)', minHeight: '40px', marginTop: '4px' }} title={task.title}>{task.title}</h4>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '12px', marginTop: 'auto' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Remaining Useful Life"><Clock size={12} /> {task.rul}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Estimated Cost"><DollarSign size={12} /> {task.cost}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px' }} title="Scheduled Date">
                    <Calendar size={12} /> {task.date}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Resource Optimization and Shift Schedules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Tech shift schedules */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--md-sys-color-on-surface)' }}>Resource Optimization</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'center' }}>
              {/* Semi-circular tech availability gauge */}
              <div style={{ position: 'relative', width: '100px', height: '50px', overflow: 'hidden' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <path d="M 10,50 A 40,40 0 0,1 90,50" fill="none" stroke="var(--md-sys-color-outline-variant)" strokeWidth="8" />
                  <path d="M 10,50 A 40,40 0 0,1 90,50" fill="none" stroke="var(--md-sys-color-secondary)" strokeWidth="8" strokeDasharray="125.6" strokeDashoffset="31.4" />
                </svg>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <span className="md-typescale-title-small" style={{ color: 'var(--md-sys-color-on-surface)' }}>75%</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', display: 'block' }}>Technician Availability</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-on-surface)' }}>Spare Parts Status: Adequate</span>
              </div>
            </div>

            {/* Shift schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '4px' }}>Shift Schedule (Today)</span>
              {[
                { name: 'A. Chen', shift: '08:00 - 16:00', status: 'Active', color: 'var(--md-sys-color-primary)' },
                { name: 'M. Davis', shift: '16:00 - 00:00', status: 'Scheduled', color: 'var(--md-sys-color-secondary)' },
                { name: 'K. Patel', shift: '00:00 - 08:00', status: 'On Call', color: 'var(--md-sys-color-tertiary)' }
              ].map((tech, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{tech.name} ({tech.shift})</span>
                  <span style={{ color: tech.color, fontWeight: '700' }}>{tech.status}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Critical Spare Parts Inventory */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="md-typescale-title-small" style={{ color: 'var(--md-sys-color-on-surface)' }}>Critical Spare Parts Inventory</h3>
            
            <div className="responsive-grid-cols-4 responsive-grid" style={{ gap: '8px', textAlign: 'center' }}>
              {[
                { name: 'Gaskets', qty: 12, label: 'Low', color: 'var(--md-sys-color-tertiary)' },
                { name: 'Seals', qty: 4, label: 'Critical', color: 'var(--md-sys-color-error)' },
                { name: 'Bearings', qty: 8, label: 'Adequate', color: 'var(--md-sys-color-primary)' },
                { name: 'Filters', qty: 20, label: 'Good', color: 'var(--md-sys-color-primary)' }
              ].map((part, idx) => (
                <div key={idx} style={{
                  padding: '10px 4px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--md-sys-color-surface-variant)',
                  border: '1px solid var(--md-sys-color-outline-variant)'
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', display: 'block', fontWeight: 'bold' }}>{part.name}</span>
                  <h4 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0', color: 'var(--md-sys-color-on-surface)' }}>{part.qty}</h4>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: part.color }}>{part.label}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>

      </div>

      {/* 3. HISTORICAL RELIABILITY CHART (6 Months MTBF) */}
      <ChartContainer title="Historical Reliability (6 Months MTBF)">
        <div style={{ position: 'relative', width: '100%', height: '180px', marginTop: '16px' }}>
          
          {/* Axis grids */}
          {[25, 50, 75].map(top => (
            <div key={top} style={{ position: 'absolute', top: `${top}%`, left: 0, width: '100%', height: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)' }} />
          ))}

          {/* SVG for paths (stretches cleanly) */}
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
            {/* Target Area Shade (Green) */}
            <polygon points="0,100 0,80 20,70 40,65 60,60 80,50 100,40 100,100" fill="var(--md-sys-color-primary-container)" opacity="0.3" />
            {/* Target Line (Green) */}
            <polyline points="0,80 20,70 40,65 60,60 80,50 100,40" fill="none" stroke="var(--md-sys-color-primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
            
            {/* Fleet Average Line (Blue) */}
            <polyline points="0,85 20,75 40,68 60,65 80,60 100,50" fill="none" stroke="var(--md-sys-color-secondary)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Data Points and Labels (HTML nodes to prevent stretching) */}
          {[
            { month: 'May', x: 0, y: 85, val: '320h' },
            { month: 'Jun', x: 20, y: 75, val: '340h' },
            { month: 'Jul', x: 40, y: 68, val: '355h' },
            { month: 'Aug', x: 60, y: 65, val: '360h' },
            { month: 'Sep', x: 80, y: 60, val: '375h' },
            { month: 'Oct', x: 100, y: 50, val: '380h' }
          ].map((pt, idx) => (
            <React.Fragment key={idx}>
              {/* Point Circle */}
              <div style={{
                position: 'absolute',
                left: `${pt.x}%`,
                top: `${pt.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--md-sys-color-secondary)',
                border: '2px solid var(--md-sys-color-surface)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: 2
              }} />
              {/* Value Label */}
              <div style={{
                position: 'absolute',
                left: `${pt.x}%`,
                top: `calc(${pt.y}% - 18px)`,
                transform: 'translateX(-50%)',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--md-sys-color-on-surface)',
                whiteSpace: 'nowrap'
              }}>
                {pt.val}
              </div>
              {/* Month X-Axis Label */}
              <div style={{
                position: 'absolute',
                left: `${pt.x}%`,
                top: '100%',
                transform: 'translate(-50%, 8px)',
                fontSize: '11px',
                color: 'var(--md-sys-color-on-surface-variant)',
                fontWeight: '500'
              }}>
                {pt.month}
              </div>
            </React.Fragment>
          ))}
        </div>
      </ChartContainer>

    </div>
  );
}
