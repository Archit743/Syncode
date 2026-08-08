import React from 'react';
import { FileCode } from 'lucide-react';

interface StatusBarProps {
  activePath: string | null;
  position?: { line: number, col: number };
  providerMode?: string;
  modelName?: string;
  latency?: number;
}

export function StatusBar({ activePath, position, providerMode, modelName, latency }: StatusBarProps) {
  return (
    <div className="h-6 border-t border-[var(--border)] bg-[var(--panel)] flex items-center justify-between px-3 text-[11px] text-[var(--muted)] font-mono select-none">
      <div className="flex items-center gap-3">
        {activePath ? (
          <div className="flex items-center gap-1.5">
            <FileCode size={12} />
            <span>{activePath.split('/').pop()}</span>
          </div>
        ) : (
          <span>Ready</span>
        )}
        <span>UTF-8</span>
      </div>

      <div className="flex items-center gap-4">
        {position && (
          <span>Ln {position.line}, Col {position.col}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {providerMode && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
            <span className="uppercase">{providerMode}</span>
            {modelName && <span className="text-[10px] bg-[var(--panel-2)] px-1.5 rounded">{modelName}</span>}
            {latency !== undefined && <span>{latency}ms</span>}
          </div>
        )}
      </div>
    </div>
  );
}
