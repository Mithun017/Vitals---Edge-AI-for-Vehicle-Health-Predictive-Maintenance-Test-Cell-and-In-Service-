import React, { useState, useEffect, useRef } from 'react'
import { 
  LayoutDashboard, 
  Truck, 
  Binary, 
  Activity, 
  Wrench, 
  Settings, 
  LogOut, 
  MessageSquare, 
  Send, 
  X, 
  AlertTriangle,
  Radio
} from 'lucide-react'

// Import views
import FleetDashboardView from './views/FleetDashboardView'
import VehicleDetailsView from './views/VehicleDetailsView'
import AIAnalysisView from './views/AIAnalysisView'
import DigitalTwinView from './views/DigitalTwinView'
import MaintenanceView from './views/MaintenanceView'
import LoginView from './views/LoginView'

import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeView = location.pathname.split('/')[1] || 'dashboard'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING') // LIVE, OFFLINE, CONNECTING
  
  // Real-time telemetry data state
  const [liveData, setLiveData] = useState(null)
  const [history, setHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  
  // Chatbot overlay state
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { text: "Hello! I am the LeakSense AI Diagnostic Assistant for the Caterpillar C18. How can I help you inspect engine telemetry today?", sender: "bot", timestamp: new Date().toLocaleTimeString() }
  ])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  // Listen to Server-Sent Events (SSE) from the backend
  useEffect(() => {
    let eventSource;
    const connectSSE = () => {
      setConnectionStatus('CONNECTING');
      eventSource = new EventSource('http://localhost:8000/api/stream');

      eventSource.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          setLiveData(packet);
          setConnectionStatus('LIVE');
          
          setHistory(prev => {
            const updated = [...prev, packet];
            if (updated.length > 50) updated.shift();
            return updated;
          });
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE connection error", err);
        setConnectionStatus('OFFLINE');
        eventSource.close();
        // Retry connection after 5 seconds
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    // Fetch initial historical logs
    fetch('http://localhost:8000/api/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(e => console.error("Error fetching history", e));

    fetch('http://localhost:8000/api/alerts')
      .then(res => res.json())
      .then(data => setAlerts(data))
      .catch(e => console.error("Error fetching alerts", e));

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Sync alerts when engine state shifts
  useEffect(() => {
    if (liveData?.diagnostics?.state && liveData.diagnostics.state !== 'HEALTHY') {
      // Reload alerts log from server
      fetch('http://localhost:8000/api/alerts')
        .then(res => res.json())
        .then(data => setAlerts(data))
        .catch(e => console.error(e));
    }
  }, [liveData?.diagnostics?.state]);

  // Chat message submit handler
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { text: userMsg, sender: "user", timestamp: new Date().toLocaleTimeString() }]);
    setIsChatLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { text: data.reply, sender: "bot", timestamp: new Date().toLocaleTimeString() }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { text: "Error connecting to AI diagnostics service. Make sure backend is running.", sender: "bot", timestamp: new Date().toLocaleTimeString() }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Scroll chat on messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // Navigation is now handled dynamically by React Router DOM routes

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* SIDEBAR NAVIGATION PANEL */}
      <div style={{
        width: isSidebarCollapsed ? '70px' : '240px',
        background: 'linear-gradient(180deg, var(--sidebar-bg-start) 0%, var(--sidebar-bg-end) 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.2s ease',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        zIndex: 100
      }}>
        <div>
          {/* Logo Brand Header */}
          <div style={{
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'var(--cat-yellow)',
              color: '#000000',
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
                <p style={{ fontSize: '10px', color: 'var(--sidebar-text)', textTransform: 'uppercase' }}>Industrial Intelligence</p>
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
                <button
                  key={item.id}
                  onClick={() => navigate('/' + item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                    color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '400',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    borderLeft: isActive ? '4px solid var(--cat-yellow)' : '4px solid transparent'
                  }}
                >
                  <Icon size={18} color={isActive ? 'var(--cat-yellow)' : 'var(--sidebar-text)'} />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer details */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--sidebar-text)',
              cursor: 'pointer',
              fontSize: '14px',
              textAlign: 'left'
            }}
          >
            <LogOut size={18} />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
          
          {!isSidebarCollapsed && (
            <div style={{
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--sidebar-text)'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connectionStatus === 'LIVE' ? 'var(--status-go)' : (connectionStatus === 'CONNECTING' ? 'var(--status-warning)' : 'var(--status-critical)')
              }} />
              <span>Edge Status: {connectionStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT CANVAS */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: activeView === 'digital-twin' ? '#0b132b' : 'var(--bg-main)'
      }}>
        {/* Global Connection Header */}
        {activeView !== 'digital-twin' && (
          <div style={{
            height: '64px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            color: 'var(--text-main)',
            zIndex: 10
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                {activeView === 'dashboard' && "Fleet Overview Dashboard"}
                {activeView === 'vehicle' && "Vehicle Health Inspector - C18 Test-Cell"}
                {activeView === 'ai-analysis' && "AI Diagnostics Hub"}
                {activeView === 'digital-twin' && "Interactive Engine Digital Twin"}
                {activeView === 'maintenance' && "Predictive Maintenance Center"}
                {activeView === 'login' && "Access Control Console"}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Live Indicator Pulse Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: connectionStatus === 'LIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: connectionStatus === 'LIVE' ? 'var(--status-go)' : 'var(--status-critical)',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                <Radio size={14} style={{ animation: connectionStatus === 'LIVE' ? 'pulse 2s infinite' : 'none' }} />
                {connectionStatus === 'LIVE' ? 'LIVE DEPLOYMENT' : 'OFFLINE BUFFERING'}
              </div>

              <button 
                onClick={() => navigate('/ai-analysis')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--text-main)'
                }}
              >
                DIAGNOSTICS
              </button>
              <button 
                onClick={() => {
                  // Instantly inject fault into Zone 2 to demo
                  fetch('http://localhost:8000/api/fault/inject', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ zone: 'Zone 2', severity: 'Critical' })
                  });
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--cat-yellow)',
                  color: '#000000',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                TRIGGER FAULT
              </button>
            </div>
          </div>
        )}

        {/* Selected Route Render Container */}
        <div style={{ 
          flex: 1, 
          overflowY: activeView === 'digital-twin' ? 'hidden' : 'auto', 
          padding: activeView === 'digital-twin' ? '0' : '24px', 
          position: 'relative' 
        }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<FleetDashboardView liveData={liveData} history={history} alerts={alerts} onViewChange={(view) => navigate('/' + view)} />} />
            <Route path="/vehicle" element={<VehicleDetailsView liveData={liveData} history={history} />} />
            <Route path="/ai-analysis" element={<AIAnalysisView liveData={liveData} history={history} />} />
            <Route path="/digital-twin" element={<DigitalTwinView liveData={liveData} />} />
            <Route path="/maintenance" element={<MaintenanceView liveData={liveData} history={history} />} />
            <Route path="/login" element={<LoginView onViewChange={(view) => navigate('/' + view)} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>

      {/* FLOATING CHATBOT PANEL OVERLAY */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        {isChatOpen && (
          <div style={{
            width: '360px',
            height: '480px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginBottom: '16px',
            color: '#f8f9fa'
          }}>
            {/* Chatbot Header */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(90deg, #0e1e38 0%, #081225 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'var(--cat-yellow)',
                  color: '#000000',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Binary size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Qwen AI Assistant</h3>
                  <span style={{ fontSize: '10px', color: 'var(--status-go)' }}>● Connected to C18 Node</span>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#a0aec0', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div style={{
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.2)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              whiteSpace: 'nowrap'
            }}>
              {[
                "Engine status?",
                "List the 6 zones",
                "Explain energy field",
                "Recommend action"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setChatInput(chip);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages stack */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.map((msg, index) => (
                <div 
                  key={index}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    background: msg.sender === 'user' ? 'var(--sidebar-active-bg)' : 'rgba(255, 255, 255, 0.07)',
                    border: msg.sender === 'user' ? '1px solid var(--cat-yellow)' : '1px solid rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '9px', color: '#718096', marginTop: '4px' }}>{msg.timestamp}</span>
                </div>
              ))}
              {isChatLoading && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'rgba(255,255,255,0.07)', borderRadius: '12px', fontSize: '13px' }}>
                  Analyzing residuals...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message input form */}
            <form onSubmit={handleChatSubmit} style={{
              padding: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask about coolant, turbo, RUL..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button 
                type="submit"
                style={{
                  background: 'var(--cat-yellow)',
                  color: '#000000',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

        {/* Toggle Chat Icon Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--cat-yellow)',
            color: '#000000',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s',
          }}
          className="pulse-yellow"
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

    </div>
  );
}
