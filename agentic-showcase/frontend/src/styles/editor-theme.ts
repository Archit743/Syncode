import * as monaco from 'monaco-editor';

export function registerEditorTheme(editor: typeof monaco) {
  editor.editor.defineTheme('syncode-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'a6adb5', fontStyle: 'italic' },
      { token: 'keyword', foreground: '88d8b0' },
    ],
    colors: {
      'editor.background': '#101214',
      'editor.foreground': '#f5f5f5',
      'editor.lineHighlightBackground': '#171a1d',
      'editorCursor.foreground': '#88d8b0',
      'editorWhitespace.foreground': '#2d3338',
      'editorIndentGuide.background': '#2d3338',
      'editorIndentGuide.activeBackground': '#a6adb5',
    }
  });
}
