import React from 'react';
import { LayoutDashboard, Truck, Binary, Activity, Wrench, LogOut, ArrowLeftRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Button from './common/Button';

export default function Sidebar({ 
  isSidebarCollapsed, 
  setIsSidebarCollapsed,
  sidebarPosition,
  setSidebarPosition,
  activeView, 
  navigate, 
  connectionStatus 
}) {
  return (
    <div className={`app-layout-sidebar ${isSidebarCollapsed ? 'closed' : ''} ${sidebarPosition === 'right' ? 'right-side' : ''}`}>
      <div>
        {/* Logo Brand Header */}
        <div 
          className={`sidebar-logo-header ${isSidebarCollapsed ? 'collapsed' : ''}`}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          <div style={{
            background: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
            padding: '6px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '18px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>V</div>
          {!isSidebarCollapsed && (
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>VITALS Edge</h1>
              <p style={{ fontSize: '10px', color: 'var(--md-sys-color-outline)', textTransform: 'uppercase' }}>Industrial Intelligence</p>
            </div>
          )}
        </div>

        {/* Navigation Links list */}
        <div style={{ padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'ai-analysis', label: 'AI Analysis', icon: Binary },
            { id: 'vehicle', label: 'Vehicle Details', icon: Truck },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
            { id: 'digital-twin', label: 'Digital Twin', icon: Activity },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <Button
                key={item.id}
                variant="text"
                onClick={() => navigate('/' + item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
                style={{ padding: isSidebarCollapsed ? 0 : '12px 16px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
              >
                <Icon size={20} color={isActive ? 'var(--md-sys-color-on-secondary-container)' : 'currentColor'} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer details */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
        
        {/* Theme Toggle integration */}
        <ThemeToggle isSidebarCollapsed={isSidebarCollapsed} />

        <Button 
          variant="text"
          onClick={() => setSidebarPosition(prev => prev === 'left' ? 'right' : 'left')}
          className={`sidebar-nav-item ${isSidebarCollapsed ? 'collapsed' : ''}`}
          title={isSidebarCollapsed ? `Move to ${sidebarPosition === 'left' ? 'Right' : 'Left'}` : undefined}
          style={{ padding: isSidebarCollapsed ? 0 : '12px 16px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
        >
          <ArrowLeftRight size={20} color="currentColor" />
          {!isSidebarCollapsed && <span>Move to {sidebarPosition === 'left' ? 'Right' : 'Left'}</span>}
        </Button>

        <Button 
          variant="text"
          onClick={() => navigate('/login')}
          className={`sidebar-nav-item ${isSidebarCollapsed ? 'collapsed' : ''}`}
          title={isSidebarCollapsed ? "Sign Out" : undefined}
          style={{ padding: isSidebarCollapsed ? 0 : '12px 16px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
        >
          <LogOut size={20} color="currentColor" />
          {!isSidebarCollapsed && <span>Sign Out</span>}
        </Button>
        
        {!isSidebarCollapsed && (
          <div style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--md-sys-color-on-surface-variant)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'LIVE' ? 'var(--md-sys-color-primary)' : (connectionStatus === 'CONNECTING' ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-error)')
            }} />
            <span>Edge Status: {connectionStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
}
