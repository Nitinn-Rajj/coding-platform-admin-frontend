import { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: number | string;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  minimap?: boolean;
}

// Catppuccin Mocha palette matching the admin theme tokens in index.css.
// Defined once and registered with Monaco on first editor mount.
const MOCHA_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'cdd6f4', background: '1e1e2e' },
    { token: 'comment', foreground: '7f849c', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'cba6f7' },
    { token: 'keyword.directive', foreground: 'f5c2e7' },
    { token: 'string', foreground: 'a6e3a1' },
    { token: 'number', foreground: 'fab387' },
    { token: 'type', foreground: 'f9e2af' },
    { token: 'type.identifier', foreground: 'f9e2af' },
    { token: 'identifier', foreground: 'cdd6f4' },
    { token: 'delimiter', foreground: '9399b2' },
    { token: 'operator', foreground: '89dceb' },
  ],
  colors: {
    'editor.background': '#1e1e2e',
    'editor.foreground': '#cdd6f4',
    'editor.lineHighlightBackground': '#252536',
    'editor.lineHighlightBorder': '#252536',
    'editorLineNumber.foreground': '#45475a',
    'editorLineNumber.activeForeground': '#7f849c',
    'editorCursor.foreground': '#89b4fa',
    'editor.selectionBackground': '#89b4fa33',
    'editor.inactiveSelectionBackground': '#89b4fa1a',
    'editor.wordHighlightBackground': '#89b4fa1a',
    'editor.findMatchBackground': '#f9e2af44',
    'editor.findMatchHighlightBackground': '#f9e2af22',
    'editorIndentGuide.background': '#313147',
    'editorIndentGuide.activeBackground': '#45475a',
    'editorBracketMatch.background': '#89b4fa22',
    'editorBracketMatch.border': '#89b4fa',
    'editorWidget.background': '#2a2a3c',
    'editorWidget.border': '#313147',
    'editorSuggestWidget.background': '#2a2a3c',
    'editorSuggestWidget.border': '#313147',
    'editorSuggestWidget.selectedBackground': '#89b4fa22',
    'scrollbarSlider.background': '#31314788',
    'scrollbarSlider.hoverBackground': '#45475a',
    'scrollbarSlider.activeBackground': '#7f849c',
  },
};

let themeRegistered = false;

// Resolve monaco from the loader so we can register our theme once.
loader.init().then((monaco) => {
  if (!themeRegistered) {
    monaco.editor.defineTheme('mocha', MOCHA_THEME);
    themeRegistered = true;
  }
});

export function CodeEditor({
  value,
  onChange,
  language = 'cpp',
  height = 360,
  readOnly = false,
  placeholder,
  className,
  minimap = false,
}: CodeEditorProps) {
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    if (!themeRegistered) {
      monaco.editor.defineTheme('mocha', MOCHA_THEME);
      themeRegistered = true;
    }
    monaco.editor.setTheme('mocha');
    setMounted(true);
  };

  useEffect(() => {
    return () => {
      editorRef.current = null;
    };
  }, []);

  const showPlaceholder = mounted && !value && placeholder;

  return (
    <div
      className={
        'relative overflow-hidden rounded-lg border border-border bg-bg' +
        (className ? ` ${className}` : '')
      }
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        theme="mocha"
        loading={<div className="flex h-full items-center justify-center text-xs text-text-muted">Loading editor...</div>}
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
          fontLigatures: true,
          minimap: { enabled: minimap },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'all',
          roundedSelection: true,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          lineNumbersMinChars: 3,
          wordWrap: 'off',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: 'active', indentation: true },
          suggest: { showWords: true },
        }}
      />
      {showPlaceholder && (
        <div
          className="pointer-events-none absolute left-[52px] top-2 font-mono text-xs text-text-muted/60 whitespace-pre"
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}
