import React from 'react';
import MonacoEditor from '@monaco-editor/react';

export default function Editor({
  fileId,
  content,
  onChange,
  theme,
  fontSize
}) {
  const handleEditorChange = (value) => {
    onChange(value || '');
  };

  const monacoTheme = theme === 'vs-dark' ? 'vs-dark' : 'light';

  // Determine language based on file extension
  const getLanguage = () => {
    return 'python';
  };

  const handleEditorDidMount = (editor, monaco) => {
    // Add custom completions for Python programming helper
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          {
            label: 'print',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'print(${1:value})',
            insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
            documentation: 'Prints standard output values to terminal logs.'
          },
          {
            label: 'input',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'input("${1:prompt}: ")',
            insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
            documentation: 'Reads interactive user input from the console.'
          },
          {
            label: 'range',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'range(${1:stop})',
            insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
            documentation: 'Generates a range object representing sequential numbers.'
          },
          {
            label: 'len',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'len(${1:sequence})',
            insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
            documentation: 'Returns length details of the target container.'
          },
          {
            label: 'def-function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'def ${1:name}(${2:params}):\n    """${3:docs}"""\n    ${4:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
            documentation: 'Template script defining a Python function.'
          },
          {
            label: 'class-def',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'class ${1:ClassName}:\n    def __init__(self, ${2:args}):\n        ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
            documentation: 'Template script defining a Python class constructor.'
          },
          {
            label: 'if-main',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'if __name__ == "__main__":\n    ${1:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
            documentation: 'Python execution entry point verification block.'
          },
          {
            label: 'for-loop',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
            documentation: 'Basic sequential loop block.'
          },
          {
            label: 'try-except',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    ${3:print(e)}',
            insertTextRules: monaco.languages.CompletionItemInsertRules.InsertAsSnippet,
            documentation: 'Try catch execution safeguard.'
          }
        ];
        return { suggestions };
      }
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <MonacoEditor
        // Use fileId as key so Monaco mounts a fresh model when switching files,
        // preventing undo history leaks or carriage issues across files!
        key={fileId}
        height="100%"
        width="100%"
        language={getLanguage()}
        theme={monacoTheme}
        value={content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: fontSize,
          fontFamily: "'Fira Code', ui-monospace, monospace",
          minimap: { enabled: false }, // Turn off minimap to save precious horizontal space
          wordWrap: 'on',
          automaticLayout: true,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 12, bottom: 12 },
          bracketPairColorization: { enabled: true },
          formatOnType: true,
          suggestOnTriggerCharacters: true
        }}
        loading={
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            gap: '12px'
          }}>
            <div className="loader-small" style={{ width: '32px', height: '32px', borderThickness: '3px' }}></div>
            <span>Powering up code editor...</span>
          </div>
        }
      />
    </div>
  );
}
