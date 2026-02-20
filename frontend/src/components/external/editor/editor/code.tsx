import Editor from "@monaco-editor/react";
import { File } from "../utils/file-manager";
import { Socket } from "socket.io-client";
import { useEffect, useRef } from "react";

export const Code = ({ selectedFile, socket }: { selectedFile: File | undefined, socket: Socket }) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.defineTheme('syncode-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: '', foreground: 'cccccc', background: '000000' },
          { token: 'comment', foreground: '666666', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'ffffff', fontStyle: 'bold' },
          { token: 'string', foreground: 'aaaaaa' },
          { token: 'number', foreground: 'dddddd' },
          { token: 'function', foreground: 'ffffff' },
          { token: 'variable', foreground: 'cccccc' },
          { token: 'type', foreground: 'eeeeee' },
          { token: 'operator', foreground: 'ffffff' },
        ],
        colors: {
          'editor.background': '#000000',
          'editor.foreground': '#cccccc',
          'editor.lineHighlightBackground': '#0a0a0a',
          'editor.selectionBackground': '#333333',
          'editor.inactiveSelectionBackground': '#1a1a1a',
          'editorCursor.foreground': '#ffffff',
          'editorWhitespace.foreground': '#333333',
          'editorLineNumber.foreground': '#666666',
          'editorLineNumber.activeForeground': '#ffffff',
          'editorIndentGuide.background': '#1a1a1a',
          'editorIndentGuide.activeBackground': '#333333',
          'editorBracketMatch.background': '#1a1a1a',
          'editorBracketMatch.border': '#666666',
          'scrollbarSlider.background': '#333333',
          'scrollbarSlider.hoverBackground': '#4a4a4a',
          'scrollbarSlider.activeBackground': '#666666',
        }
      });
      monacoRef.current.editor.setTheme('syncode-dark');
    }
  }, [monacoRef.current]);

  if (!selectedFile)
    return (
      <div className="flex-1 bg-black overflow-hidden flex flex-col">
        <div className="px-4 py-2 bg-black border-b border-syncode-gray-700 flex items-center gap-2 min-h-[36px]" />
        <div className="flex-1 overflow-hidden flex items-center justify-center text-syncode-gray-400 text-xs font-mono tracking-[2px] uppercase">
          Select a file to edit
        </div>
      </div>
    );

  const code = selectedFile.content
  let language = selectedFile.name.split('.').pop()

  if (language === "js" || language === "jsx")
    language = "javascript";
  else if (language === "ts" || language === "tsx")
    language = "typescript"
  else if (language === "py" )
    language = "python"

    function debounce(func: (value: string | undefined) => void, wait: number) {
      let timeout: number;
      return (value: string | undefined) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func(value);
        }, wait);
      };
    }

  return (
    <div className="flex-1 bg-black overflow-hidden flex flex-col">
      <div className="px-4 py-2 bg-black border-b border-syncode-gray-700 flex items-center gap-2 min-h-[36px]">
        <div className="px-3 py-1.5 bg-syncode-dark text-white text-[11px] rounded-none border border-syncode-gray-700 font-mono flex items-center gap-2 tracking-wider">
          <span className="opacity-80 text-[11px]">📄</span>
          {selectedFile.name}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="syncode-dark"
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            monaco.editor.defineTheme('syncode-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [
                { token: '', foreground: 'cccccc', background: '000000' },
                { token: 'comment', foreground: '666666', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ffffff', fontStyle: 'bold' },
                { token: 'string', foreground: 'aaaaaa' },
                { token: 'number', foreground: 'dddddd' },
                { token: 'function', foreground: 'ffffff' },
                { token: 'variable', foreground: 'cccccc' },
                { token: 'type', foreground: 'eeeeee' },
                { token: 'operator', foreground: 'ffffff' },
              ],
              colors: {
                'editor.background': '#000000',
                'editor.foreground': '#cccccc',
                'editor.lineHighlightBackground': '#0a0a0a',
                'editor.selectionBackground': '#333333',
                'editor.inactiveSelectionBackground': '#1a1a1a',
                'editorCursor.foreground': '#ffffff',
                'editorWhitespace.foreground': '#333333',
                'editorLineNumber.foreground': '#666666',
                'editorLineNumber.activeForeground': '#ffffff',
                'editorIndentGuide.background': '#1a1a1a',
                'editorIndentGuide.activeBackground': '#333333',
                'editorBracketMatch.background': '#1a1a1a',
                'editorBracketMatch.border': '#666666',
                'scrollbarSlider.background': '#333333',
                'scrollbarSlider.hoverBackground': '#4a4a4a',
                'scrollbarSlider.activeBackground': '#666666',
              }
            });
            monaco.editor.setTheme('syncode-dark');
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Courier New', monospace",
            lineHeight: 20,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
          }}
          onChange={debounce((value) => {
            // Should send diffs, for now sending the whole file
            // PR and win a bounty!
            if (value !== undefined) {
              socket.emit("updateContent", { path: selectedFile.path, content: value });
            }
          }, 500)}
        />
      </div>
    </div>
  )
}
