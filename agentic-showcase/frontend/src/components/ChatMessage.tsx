import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentMessage } from '../lib/types';
import { AgentTimeline } from './AgentTimeline';
import { ActionCard } from './ActionCard';

interface ChatMessageProps {
  message: AgentMessage;
  onViewAction?: (actionId: string) => void;
  onApproveAction?: (actionId: string) => void;
  onRejectAction?: (actionId: string) => void;
}

export function ChatMessage({ message, onViewAction, onApproveAction, onRejectAction }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex flex-col mb-4 max-w-[90%] ${isUser ? 'ml-auto' : 'mr-auto'}`}>
      <div className="flex items-baseline gap-2 mb-1 px-1">
        <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
          {isUser ? 'You' : 'Agent'}
        </span>
        {message.timestamp && (
          <span className="text-[10px] text-[var(--border)]">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      
      <div className={`p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap
        ${isUser 
          ? 'bg-transparent border border-[var(--accent)]/30 text-[var(--text)]' 
          : 'bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text)]'}`}
      >
        {message.content && (
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            className="prose prose-invert prose-sm max-w-none 
              prose-pre:bg-[var(--bg)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-md
              prose-p:last:mb-0 prose-p:first:mt-0
              prose-a:text-[var(--accent)] hover:prose-a:text-[var(--accent)]/80"
          >
            {message.content}
          </ReactMarkdown>
        )}
        
        {message.events && message.events.length > 0 && (
          <AgentTimeline events={message.events} />
        )}
        
        {message.action && onViewAction && onApproveAction && onRejectAction && (
          <ActionCard 
            action={message.action} 
            onViewDiff={() => onViewAction(message.action!.id)}
            onApprove={onApproveAction}
            onReject={onRejectAction}
          />
        )}
      </div>
    </div>
  );
}
