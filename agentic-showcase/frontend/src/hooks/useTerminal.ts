import { useRef, useCallback } from 'react';

export function useTerminal(project: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const termRef = useRef<any>(null);
  const dataListenerRef = useRef<{ dispose: () => void } | null>(null);
  const manualCloseRef = useRef(false);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    dataListenerRef.current?.dispose();
    dataListenerRef.current = null;

    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  }, []);

  const connect = useCallback((term: any) => {
    disconnect();
    manualCloseRef.current = false;
    termRef.current = term;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/terminal?project=${project}`);
    
    ws.onopen = () => {
      term.writeln('\x1b[32mConnected to terminal\x1b[0m');
    };
    
    ws.onmessage = (e) => {
      if (typeof e.data === 'string') {
        term.write(e.data);
      }
    };

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31mTerminal connection failed\x1b[0m');
    };
    
    ws.onclose = () => {
      if (!manualCloseRef.current) {
        term.writeln('\r\n\x1b[31mTerminal disconnected\x1b[0m');
      }
    };
    
    dataListenerRef.current = term.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    wsRef.current = ws;
  }, [project, disconnect]);

  const resize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { connect, resize, disconnect, send };
}
