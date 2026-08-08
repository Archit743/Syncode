import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const variants = {
    success: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
    warning: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20',
    error: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20',
    info: 'bg-[var(--soft)]/10 text-[var(--soft)] border-[var(--soft)]/20',
    neutral: 'bg-[var(--panel-2)] text-[var(--muted)] border-[var(--border)]'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
