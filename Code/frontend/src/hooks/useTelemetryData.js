import { useState, useEffect } from 'react';

export function useTelemetryData() {
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
  const [liveData, setLiveData] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);

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
      fetch('http://localhost:8000/api/alerts')
        .then(res => res.json())
        .then(data => setAlerts(data))
        .catch(e => console.error(e));
    }
  }, [liveData?.diagnostics?.state]);

  return { connectionStatus, liveData, history, alerts };
}
