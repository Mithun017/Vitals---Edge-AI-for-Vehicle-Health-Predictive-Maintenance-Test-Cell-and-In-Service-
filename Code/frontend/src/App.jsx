import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'

// Import views
import FleetDashboardView from './views/FleetDashboardView'
import VehicleDetailsView from './views/VehicleDetailsView'
import AIAnalysisView from './views/AIAnalysisView'
import DigitalTwinView from './views/DigitalTwinView'
import MaintenanceView from './views/MaintenanceView'
import LoginView from './views/LoginView'

// Import Components
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Chatbot from './components/Chatbot'

// Custom Hooks
import { useTelemetryData } from './hooks/useTelemetryData'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeView = location.pathname.split('/')[1] || 'dashboard'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Use custom hook for telemetry data
  const { connectionStatus, liveData, history, alerts } = useTelemetryData();
  
  // Chatbot overlay state
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { text: "Hello! I am the LeakSense AI Diagnostic Assistant for the Caterpillar C18. How can I help you inspect engine telemetry today?", sender: "bot", timestamp: new Date().toLocaleTimeString() }
  ])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  // Chat message submit handler
  const handleChatSubmit = async (e, textOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const userMsg = textOverride || chatInput;
    if (!userMsg.trim()) return;

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

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* SIDEBAR NAVIGATION PANEL */}
      <Sidebar 
        isSidebarCollapsed={isSidebarCollapsed} 
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        activeView={activeView} 
        navigate={navigate} 
        connectionStatus={connectionStatus} 
      />

      {/* MAIN VIEWPORT CANVAS */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--md-sys-color-background)'
      }}>
        {/* Global Connection Header */}
        <Header 
          activeView={activeView} 
          navigate={navigate} 
          connectionStatus={connectionStatus} 
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />

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
            <Route path="/vehicle" element={<Navigate to="/vehicle/TRK-404" replace />} />
            <Route path="/vehicle/:id" element={<VehicleDetailsView liveData={liveData} history={history} />} />
            <Route path="/ai-analysis" element={<AIAnalysisView liveData={liveData} history={history} />} />
            <Route path="/digital-twin" element={<DigitalTwinView liveData={liveData} />} />
            <Route path="/maintenance" element={<MaintenanceView liveData={liveData} history={history} />} />
            <Route path="/login" element={<LoginView onViewChange={(view) => navigate('/' + view)} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>

      {/* FLOATING CHATBOT PANEL OVERLAY */}
      <Chatbot 
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleChatSubmit={handleChatSubmit}
        isChatLoading={isChatLoading}
        chatEndRef={chatEndRef}
      />
    </div>
  );
}
