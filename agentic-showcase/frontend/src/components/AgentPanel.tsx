import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Square, Trash2 } from 'lucide-react';
import { AgentSession, AgentMessage, AgentAction } from '../lib/types';
import { ChatMessage } from './ChatMessage';
import { Badge } from './ui/Badge';

interface AgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    sessionId: string | null;
    messages: AgentMessage[];
    isStreaming: boolean;
    sendMessage: (text: string, path?: string) => void;
    clearMessages: () => void;
    abort?: () => void;
  };
  activePath: string | null;
  onViewDiff: (action: AgentAction) => void;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
}

export function AgentPanel({ isOpen, onClose, session, activePath, onViewDiff, onApprove, onReject }: AgentPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session.messages, session.isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || session.isStreaming) return;
    
    session.sendMessage(input, activePath || undefined);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col bg-[var(--panel)] border-l border-[var(--border)] h-full w-full">
      <div className="h-12 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-[var(--accent)]" />
          <span className="font-semibold text-sm">Agent</span>
          <Badge variant={session.isStreaming ? 'warning' : 'success'} className="ml-2">
            {session.isStreaming ? 'Working...' : 'Ready'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => session.clearMessages()} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1" title="Clear Messages">
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg)] custom-scrollbar">
        {session.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--muted)] space-y-4">
            <Bot size={48} className="opacity-20" />
            <p className="text-sm text-center">I can help you write, refactor, and debug code.</p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
              <button onClick={() => session.sendMessage("Explain this file", activePath || undefined)} className="text-xs text-left p-2 rounded border border-[var(--border)] hover:bg-[var(--panel-2)] transition-colors">
                "Explain this file"
              </button>
              <button onClick={() => session.sendMessage("Refactor this component", activePath || undefined)} className="text-xs text-left p-2 rounded border border-[var(--border)] hover:bg-[var(--panel-2)] transition-colors">
                "Refactor this component"
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {session.messages.map((msg, idx) => (
              <ChatMessage 
                key={idx} 
                message={msg} 
                onViewAction={() => {
                  if (msg.action) onViewDiff(msg.action);
                }}
                onApproveAction={onApprove}
                onRejectAction={onReject}
              />
            ))}
            
            {session.isStreaming && (
              <div className="flex items-center gap-2 text-[var(--muted)] text-sm mb-4">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-typingDot" style={{animationDelay: '0ms'}}></span>
                  <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-typingDot" style={{animationDelay: '150ms'}}></span>
                  <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-typingDot" style={{animationDelay: '300ms'}}></span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-[var(--panel)] shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activePath ? `Ask about ${activePath.split('/').pop()}...` : "Ask a question..."}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg py-2.5 pl-3 pr-10 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)] resize-none max-h-32 min-h-[44px]"
            rows={1}
            style={{ height: 'auto' }}
          />
          {session.isStreaming ? (
            <button 
              type="button" 
              onClick={() => session.abort && session.abort()}
              className="absolute right-2 bottom-2 p-1 text-[var(--danger)] bg-[var(--danger)]/10 rounded hover:bg-[var(--danger)]/20 transition-all"
              title="Stop generating"
            >
              <Square size={14} className="fill-current" />
            </button>
          ) : (
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="absolute right-2 bottom-2 p-1 text-[var(--text)] bg-[var(--accent)] rounded hover:opacity-90 disabled:opacity-50 disabled:bg-[var(--panel-2)] disabled:text-[var(--muted)] transition-all"
            >
              <Send size={14} />
            </button>
          )}
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-[var(--muted)]">Shift + Enter for newline</span>
        </div>
      </div>
    </div>
  );
}
