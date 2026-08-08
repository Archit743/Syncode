import React from 'react';
import { AgentEvent } from '../lib/types';
import { CheckCircle2, XCircle, Loader2, MinusCircle } from 'lucide-react';

export function AgentTimeline({ events }: { events: AgentEvent[] }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 my-3 pl-2 border-l-2 border-[var(--border)]">
      {events.map((event, idx) => (
        <div key={idx} className="flex items-center gap-2 text-[11px] animate-fade-in">
          <div className="flex items-center justify-center w-4 h-4">
            {event.status === 'running' && <Loader2 size={12} className="animate-spin text-[var(--muted)]" />}
            {event.status === 'complete' && <CheckCircle2 size={12} className="text-[var(--accent)]" />}
            {event.status === 'skipped' && <MinusCircle size={12} className="text-[var(--muted)]" />}
            {event.status === 'error' && <XCircle size={12} className="text-[var(--danger)]" />}
          </div>
          <span className="font-semibold text-[var(--muted)] w-16 truncate">{event.role}</span>
          {event.model && (
              <span className="text-[10px] text-[var(--border)] bg-[var(--panel)] px-1.5 py-0.5 rounded">{event.model}</span>
          )}
          <span className={`truncate ${event.status === 'error' ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}>
            {event.detail}
          </span>
        </div>
      ))}
    </div>
  );
}
