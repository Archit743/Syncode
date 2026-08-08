import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button({ variant = 'default', size = 'md', loading, children, className = '', ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    default: "bg-[var(--panel-2)] text-[var(--text)] hover:bg-[var(--border)] border border-[var(--border)]",
    primary: "bg-[var(--accent)] text-[#000] hover:opacity-90",
    danger: "bg-[var(--danger)] text-[#000] hover:opacity-90",
    ghost: "bg-transparent hover:bg-[var(--panel-2)] text-[var(--text)]"
  };
  
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm"
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="animate-spin mr-2">⟳</span> : null}
      {children}
    </button>
  );
}
