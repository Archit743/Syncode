import React, { useState } from 'react';
import { ChevronRight, FileCode, FileText, FileJson, File, Folder } from 'lucide-react';
import { FileTree as FileTreeType, FileEntry } from '../lib/types';

interface FileTreeProps {
  tree: FileTreeType;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  level?: number;
}

export function FileTree({ tree, selectedPath, onSelect, level = 0 }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getIcon = (name: string, isDir: boolean) => {
    if (isDir) return <Folder size={14} className="text-[var(--muted)]" />;
    if (name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.tsx')) return <FileCode size={14} className="text-blue-400" />;
    if (name.endsWith('.py')) return <FileText size={14} className="text-yellow-400" />;
    if (name.endsWith('.json')) return <FileJson size={14} className="text-green-400" />;
    return <File size={14} className="text-[var(--muted)]" />;
  };

  return (
    <div className="text-sm font-mono select-none w-full h-full overflow-y-auto bg-[var(--panel)] border-r border-[var(--border)] py-2">
      {Object.entries(tree).map(([key, value]) => {
        const isFile = 'type' in value && value.type === 'file';
        const item = value as FileEntry;
        const isActive = isFile && item.path === selectedPath;

        return (
          <div key={key}>
            <div 
              className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-[var(--panel-2)] transition-colors
                ${isActive ? 'bg-[var(--panel-2)] border-l-2 border-[var(--accent)] text-[var(--text)]' : 'text-[var(--muted)] border-l-2 border-transparent pl-[calc(0.5rem+2px)]'}`}
              style={{ paddingLeft: `${level * 12 + (isActive ? 8 : 10)}px` }}
              onClick={() => isFile ? onSelect(item.path) : toggle(key)}
            >
              {!isFile && (
                <ChevronRight 
                  size={14} 
                  className={`transition-transform ${expanded[key] ? 'rotate-90' : ''}`}
                />
              )}
              {isFile && <span className="w-[14px]"></span>}
              {getIcon(key, !isFile)}
              <span className="truncate">{key}</span>
            </div>
            {!isFile && expanded[key] && (
              <FileTree tree={value as FileTreeType} selectedPath={selectedPath} onSelect={onSelect} level={level + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}
