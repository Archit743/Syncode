import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { X, Circle } from 'lucide-react';
import { registerEditorTheme } from '../styles/editor-theme';

interface CodeEditorProps {
  filePath: string | null;
  initialContent: string;
  onSave: (path: string, content: string) => void;
  onCursorChange?: (pos: { line: number, col: number }) => void;
}

export function CodeEditor({ filePath, initialContent, onSave, onCursorChange }: CodeEditorProps) {
  const monaco = useMonaco();
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (monaco) {
      registerEditorTheme(monaco);
    }
  }, [monaco]);

  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
    }
  }, [initialContent, filePath]);

  useEffect(() => {
    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleChange = (value: string | undefined) => {
    const newVal = value || '';
    setContent(newVal);
    setIsDirty(true);
    const currentPath = filePath;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (currentPath) {
        onSave(currentPath, newVal);
        setIsDirty(false);
      }
    }, 500);
  };

  const handleEditorDidMount = (editor: any) => {
    editor.onDidChangeCursorPosition((e: any) => {
      if (onCursorChange) {
        onCursorChange({ line: e.position.lineNumber, col: e.position.column });
      }
    });
  };

  const getLanguage = (path: string) => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    return 'plaintext';
  };

  if (!filePath) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--muted)] bg-[var(--bg)]">
        <div className="text-center">
          <div className="text-4xl mb-4">{'{}'}</div>
          <p>Select a file to start coding</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-w-0 bg-[var(--bg)]">
      <div className="flex bg-[var(--panel)] border-b border-[var(--border)] overflow-x-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg)] border-t-2 border-[var(--accent)] text-sm text-[var(--text)] min-w-[120px]">
          <span className="truncate">{filePath.split('/').pop()}</span>
          {isDirty ? (
            <Circle size={10} className="fill-[var(--accent)] text-[var(--accent)] ml-auto" />
          ) : (
            <X size={14} className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer ml-auto" />
          )}
        </div>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(filePath)}
          theme="syncode-dark"
          value={content}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Cascadia Mono', monospace",
            wordWrap: 'on',
            lineNumbersMinChars: 3,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on'
          }}
        />
      </div>
    </div>
  );
}
