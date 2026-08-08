import React from 'react';
import { Button } from './ui/Button';
import { Terminal, Bot, RefreshCw, Settings, Play } from 'lucide-react';

interface TopBarProps {
  project: string;
  setProject: (p: string) => void;
  activePath: string | null;
  toggleTerminal: () => void;
  toggleAgent: () => void;
  resetWorkspace: () => void;
  onOpenSettings: () => void;
  onRunFile: () => void;
}

export function TopBar({ project, setProject, activePath, toggleTerminal, toggleAgent, resetWorkspace, onOpenSettings, onRunFile }: TopBarProps) {
  return (
    <div className="h-12 border-b border-[var(--border)] bg-[var(--panel)] flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse-slow"></span>
          <span className="font-mono uppercase tracking-[4px] text-xs font-bold text-[var(--text)]">Syncode</span>
        </div>
        <select 
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="bg-[var(--panel-2)] text-xs border border-[var(--border)] rounded px-2 py-1 outline-none focus:border-[var(--muted)] text-[var(--text)]"
        >
          <option value="node">Node.js</option>
          <option value="python">Python</option>
        </select>
      </div>

      <div className="text-xs text-[var(--muted)] font-mono truncate max-w-[300px]">
        {activePath || 'No file selected'}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRunFile} disabled={!activePath} title="Run File">
          <Play size={14} className="mr-1 text-[var(--accent)]" /> Run
        </Button>
        <Button variant="ghost" size="sm" onClick={resetWorkspace} title="Reset Workspace">
          <RefreshCw size={14} className="mr-1" /> Reset
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleTerminal}>
          <Terminal size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleAgent}>
          <Bot size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenSettings} title="Settings">
          <Settings size={16} />
        </Button>
      </div>
    </div>
  );
}
