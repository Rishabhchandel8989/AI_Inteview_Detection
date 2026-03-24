import { useState, useEffect, useCallback, useRef } from 'react';

const WEBSOCKET_URL = "ws://localhost:8000/ws";

export function useWebSocket(sessionId) {
  const [alerts, setAlerts] = useState([]);
  const [riskScore, setRiskScore] = useState(0);
  const [verdict, setVerdict] = useState("TRUSTED");
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    if (!sessionId) return;
    
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WEBSOCKET_URL}/${sessionId}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'detection') {
          if (data.flagged) {
            setAlerts(prev => [data, ...prev].slice(0, 50)); // Keep last 50 alerts
            setRiskScore(data.risk_score);
            setVerdict(data.verdict);
          }
        }
      } catch (err) {
        console.error("Error parsing websocket message", err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
    };

    wsRef.current = ws;

  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      connect();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, connect]);

  return { alerts, riskScore, verdict, isConnected: !!wsRef.current && wsRef.current.readyState === WebSocket.OPEN };
}
