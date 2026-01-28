import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { python } from '@codemirror/lang-python';

const CodeEditor = ({ code, onChange, language }) => {
  const getLanguageExtension = () => {
    switch (language.toLowerCase()) {
      case 'sql':
        return [sql()];
      case 'python':
        return [python()];
      default:
        return [];
    }
  };

  return (
    <CodeMirror
      value={code}
      height="100%"
      extensions={getLanguageExtension()}
      onChange={onChange}
      theme="dark"
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        searchKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
      }}
    />
  );
};

export default CodeEditor;
