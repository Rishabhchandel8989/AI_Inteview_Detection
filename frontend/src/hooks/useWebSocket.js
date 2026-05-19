import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(meetingId) {
  const [liveData, setLiveData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    // Don't connect if no meetingId or already connected
    if (!meetingId || wsRef.current) return;
    
    const ws = new WebSocket(`ws://localhost:8000/ws/meeting/${meetingId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to meeting room', meetingId);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'detection') {
          setLiveData(data);
          if (data.flagged) {
            setAlerts(prev => [{
              id: Date.now(),
              timestamp: data.timestamp || new Date().toISOString(),
              alert_type: (data.alert_type || 'UNKNOWN').toUpperCase(),
              description: data.description || 'Suspicious activity detected',
              severity: (data.severity || 'medium').toUpperCase()
            }, ...prev].slice(0, 20));
          }
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = (e) => {
      // Only log, don't auto-reconnect to avoid spam
      // Code 1000 = normal close, anything else = unexpected
      if (e.code !== 1000) {
        console.warn('[WS] Connection closed unexpectedly. Code:', e.code);
      }
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) return;
    
    let isMounted = true; // StrictMode guard
    const ws = new WebSocket(`ws://localhost:8000/ws/meeting/${meetingId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted) { ws.close(1000, 'Strict mode cleanup'); return; }
      console.log('[WS] Connected to meeting room', meetingId);
    };

    ws.onmessage = (event) => {
      if (!isMounted) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'detection') {
          setLiveData(data);
          if (data.flagged) {
            setAlerts(prev => [{
              id: Date.now(),
              timestamp: data.timestamp || new Date().toISOString(),
              alert_type: (data.alert_type || 'UNKNOWN').toUpperCase(),
              description: data.description || 'Suspicious activity detected',
              severity: (data.severity || 'medium').toUpperCase()
            }, ...prev].slice(0, 20));
          }
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = (e) => {
      wsRef.current = null;
      if (!isMounted) return;
      if (e.code !== 1000) {
        console.warn('[WS] Connection closed unexpectedly. Code:', e.code);
      }
    };

    ws.onerror = () => {}; // Suppress — onclose fires after with details
    
    return () => {
      isMounted = false;
      // Only close if socket is OPEN (1) or CONNECTING (0) — avoid double-close
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Component unmounted');
      }
      wsRef.current = null;
    };
  }, [meetingId]);

  return { liveData, alerts };
}
