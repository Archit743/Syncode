import React, { useState, useEffect } from 'react';
import { DiffEditor, useMonaco } from '@monaco-editor/react';
import { Button } from './ui/Button';
import { X, SplitSquareHorizontal, AlignLeft } from 'lucide-react';
import { registerEditorTheme } from '../styles/editor-theme';

interface DiffViewerProps {
  original: string;
  modified: string;
  path: string;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

export function DiffViewer({ original, modified, path, onApprove, onReject, onClose }: DiffViewerProps) {
  const [inline, setInline] = useState(false);
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      registerEditorTheme(monaco);
    }
  }, [monaco]);

  const getLanguage = (p: string) => {
    if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript';
    if (p.endsWith('.js') || p.endsWith('.jsx')) return 'javascript';
    if (p.endsWith('.py')) return 'python';
    if (p.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--bg)] animate-slide-up">
      <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--panel)]">
        <div className="flex items-center gap-4">
          <span className="font-medium text-sm">Review Changes</span>
          <span className="text-xs text-[var(--muted)] font-mono">{path}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setInline(!inline)} title="Toggle Layout">
            {inline ? <SplitSquareHorizontal size={16} /> : <AlignLeft size={16} />}
          </Button>
          <div className="w-px h-4 bg-[var(--border)] mx-2"></div>
          <Button variant="danger" size="sm" onClick={onReject}>Reject</Button>
          <Button variant="primary" size="sm" onClick={onApprove}>Approve</Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
            <X size={16} />
          </Button>
        </div>
      </div>
      <div className="flex-1">
        <DiffEditor
          height="100%"
          language={getLanguage(path)}
          theme="syncode-dark"
          original={original}
          modified={modified}
          keepCurrentOriginalModel={true}
          keepCurrentModifiedModel={true}
          options={{
            renderSideBySide: !inline,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Cascadia Mono', monospace",
            ignoreTrimWhitespace: false,
            readOnly: true
          }}
        />
      </div>
    </div>
  );
}
