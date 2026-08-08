import React from 'react';
import { AgentAction } from '../lib/types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { FileDiff } from 'lucide-react';

interface ActionCardProps {
  action: AgentAction;
  onViewDiff: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ActionCard({ action, onViewDiff, onApprove, onReject }: ActionCardProps) {
  return (
    <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3 my-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileDiff size={16} className="text-[var(--accent)]" />
          <span className="font-medium text-sm">Proposed Changes</span>
        </div>
        <Badge variant={
          action.status === 'approved' ? 'success' : 
          action.status === 'rejected' ? 'error' : 'warning'
        }>
          {action.status || 'pending'}
        </Badge>
      </div>
      
      <div className="text-xs text-[var(--muted)] mb-3">
        <span className="font-mono">{action.path}</span>
        <p className="mt-1">{action.summary}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={onViewDiff} className="flex-1">View Diff</Button>
        {(!action.status || action.status === 'pending') && (
          <>
            <Button variant="danger" size="sm" onClick={() => onReject(action.id)}>Reject</Button>
            <Button variant="primary" size="sm" onClick={() => onApprove(action.id)}>Approve</Button>
          </>
        )}
      </div>
    </div>
  );
}
