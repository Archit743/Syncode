import React from 'react';

export function Tooltip({ text, children, className = '' }: { text: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`group relative inline-flex ${className}`}>
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--panel-2)] text-[var(--text)] text-xs rounded px-2 py-1 border border-[var(--border)] whitespace-nowrap z-50">
        {text}
      </div>
    </div>
  );
}
