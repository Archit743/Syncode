import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Trash2, X } from 'lucide-react';
import { useTerminal } from '../hooks/useTerminal';
import 'xterm/css/xterm.css';

interface TerminalProps {
  project: string;
  onClose: () => void;
  commandToRun?: string | null;
  onCommandSent?: () => void;
}

export function Terminal({ project, onClose, commandToRun, onCommandSent }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { connect, resize, disconnect, send } = useTerminal(project);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (commandToRun && onCommandSent) {
      // Send Ctrl+C to kill any running process, then Enter, then the command
      send('\x03\r' + commandToRun);
      
      // Force terminal to scroll to bottom
      if (xtermRef.current) {
        xtermRef.current.scrollToBottom();
      }
      onCommandSent();
    }
  }, [commandToRun, onCommandSent, send]);

  useEffect(() => {
    if (!terminalRef.current) return;
    let disposed = false;
    let opened = false;

    const term = new XTerm({
      theme: {
        background: '#050505',
        foreground: '#f5f5f5',
        cursor: '#88d8b0',
        selectionBackground: '#2d3338',
        black: '#000000',
        red: '#ff8f8f',
        green: '#88d8b0',
        yellow: '#ffd27d',
        blue: '#7db4ff',
        magenta: '#ff7df2',
        cyan: '#7dffff',
        white: '#ffffff',
      },
      fontFamily: "'JetBrains Mono', 'Cascadia Mono', monospace",
      fontSize: 13,
      cursorBlink: true,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    const connectToBackend = () => {
      if (disposed) return;
      try {
        connect(term);
      } catch (e) {
        setError('Terminal unavailable');
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      if (disposed || !terminalRef.current || terminalRef.current.clientHeight === 0) return;
      
      if (!opened) {
        term.open(terminalRef.current);
        opened = true;
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;
        term.focus();
        setTimeout(connectToBackend, 50);
      }
      
      try {
        fitAddon.fit();
        resize(term.cols, term.rows);
      } catch (e) {
        // ignore
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      disconnect();
      term.dispose();
    };
  }, [project, connect, resize, disconnect]);

  const clearTerminal = () => {
    xtermRef.current?.clear();
  };

  const reconnect = () => {
    setError(null);
    if (xtermRef.current) {
      connect(xtermRef.current);
    }
  };

  return (
    <div className="h-full w-full border-t border-[var(--border)] bg-[var(--bg)] flex flex-col z-10 relative">
      <div className="h-8 border-b border-[var(--border)] bg-[var(--panel)] flex items-center justify-between px-3">
        <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Terminal</span>
        <div className="flex items-center gap-1">
          <button onClick={clearTerminal} className="p-1 text-[var(--muted)] hover:text-[var(--text)] rounded hover:bg-[var(--panel-2)] transition-colors" title="Clear">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1 text-[var(--muted)] hover:text-[var(--text)] rounded hover:bg-[var(--panel-2)] transition-colors" title="Close">
            <X size={14} />
          </button>
        </div>
      </div>
      
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] gap-4">
          <p>{error}</p>
          <button onClick={reconnect} className="text-[var(--accent)] hover:underline text-sm">Try Reconnecting</button>
        </div>
      ) : (
        <div className="flex-1 p-2 overflow-hidden" ref={terminalRef} onClick={() => xtermRef.current?.focus()}></div>
      )}
    </div>
  );
}
