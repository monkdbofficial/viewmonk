'use client';

import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import { useTheme } from './ThemeProvider';
import * as monaco from 'monaco-editor';

interface MonacoSQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  height?: string;
  readOnly?: boolean;
  schema?: SchemaMetadata;
}

export interface SchemaMetadata {
  schemas: SchemaInfo[];
}

export interface SchemaInfo {
  name: string;
  tables: TableInfo[];
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

/**
 * Monaco SQL Editor component with autocomplete and IntelliSense
 * Supports MonkDB-specific SQL syntax and schema-aware completions
 */
export default function MonacoSQLEditor({
  value,
  onChange,
  onExecute,
  height = '400px',
  readOnly = false,
  schema,
}: MonacoSQLEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // SQL keywords including MonkDB-specific ones
  const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET',
    'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE',
    'TABLE', 'INDEX', 'VIEW', 'SCHEMA', 'DATABASE',
    'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
    'ON', 'USING', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL',
    'AS', 'DISTINCT', 'ALL', 'ANY', 'SOME',
    'UNION', 'INTERSECT', 'EXCEPT',
    'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'CAST', 'EXTRACT', 'SUBSTRING', 'TRIM', 'UPPER', 'LOWER',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'STDDEV', 'VARIANCE',
    'DATE_TRUNC', 'CURRENT_TIMESTAMP', 'INTERVAL',
    // MonkDB-specific keywords
    'MATCH', 'FULLTEXT', 'ANALYZER', 'BM25',
    'VECTOR', 'FLOAT_VECTOR', 'KNN_MATCH', 'VECTOR_SIMILARITY',
    'GEO_POINT', 'GEO_SHAPE', 'DISTANCE', 'INTERSECTS', 'WITHIN',
    'OBJECT', 'DYNAMIC', 'STRICT', 'IGNORED',
    'BLOB', 'SHA1',
    'PARTITION BY', 'CLUSTERED INTO', 'SHARDS',
    'WITH', 'TRANSIENT', 'COLUMN_POLICY',
    'EXPLAIN', 'ANALYZE', 'BUFFERS', 'FORMAT JSON',
  ];

  // SQL functions including MonkDB-specific ones
  const SQL_FUNCTIONS = [
    // Standard functions
    'ABS', 'CEIL', 'FLOOR', 'ROUND', 'SQRT', 'POWER', 'EXP', 'LN', 'LOG',
    'CONCAT', 'LENGTH', 'POSITION', 'REPLACE', 'SPLIT_PART',
    'COALESCE', 'NULLIF', 'GREATEST', 'LEAST',
    'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'DATE_ADD', 'DATE_SUB',
    'AGE', 'EPOCH', 'TO_TIMESTAMP', 'TO_CHAR',
    // MonkDB-specific functions
    'knn_match', 'vector_similarity', '_score',
    'distance', 'intersects', 'within', 'area', 'disjoint',
    'object_keys', 'object_values', 'unnest',
    'match', 'match_predicate',
    'gen_random_text_uuid', 'hash',
  ];

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure SQL language
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const suggestions: monaco.languages.CompletionItem[] = [];

        // Add SQL keywords
        SQL_KEYWORDS.forEach((keyword) => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: 'SQL Keyword',
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: model.getWordUntilPosition(position).startColumn,
              endColumn: model.getWordUntilPosition(position).endColumn,
            },
          });
        });

        // Add SQL functions
        SQL_FUNCTIONS.forEach((func) => {
          suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func}($0)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'SQL Function',
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: model.getWordUntilPosition(position).startColumn,
              endColumn: model.getWordUntilPosition(position).endColumn,
            },
          });
        });

        // Add schema-based completions
        if (schema) {
          schema.schemas.forEach((schemaInfo) => {
            // Add table completions
            schemaInfo.tables.forEach((table) => {
              suggestions.push({
                label: table.name,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: table.name,
                detail: `Table in ${schemaInfo.name}`,
                documentation: `Columns: ${table.columns.map((c) => c.name).join(', ')}`,
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: model.getWordUntilPosition(position).startColumn,
                  endColumn: model.getWordUntilPosition(position).endColumn,
                },
              });

              // Add column completions
              table.columns.forEach((column) => {
                suggestions.push({
                  label: `${table.name}.${column.name}`,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: column.name,
                  detail: `${column.type}${column.nullable ? ' (nullable)' : ''}`,
                  documentation: `Column in ${table.name}`,
                  range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: model.getWordUntilPosition(position).startColumn,
                    endColumn: model.getWordUntilPosition(position).endColumn,
                  },
                });
              });
            });
          });
        }

        return { suggestions };
      },
    });

    // Add keyboard shortcut for execution (Cmd/Ctrl + Enter)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onExecute) {
        onExecute();
      }
    });

    // Focus editor
    editor.focus();
  };

  // Update completions when schema changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current && schema) {
      // Schema updates will be reflected automatically in the completion provider
      editorRef.current.updateOptions({});
    }
  }, [schema]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <Editor
        height={height}
        language="sql"
        value={value}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          parameterHints: { enabled: true },
          formatOnPaste: true,
          formatOnType: true,
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'always',
          cursorStyle: 'line',
          cursorBlinking: 'smooth',
          renderLineHighlight: 'all',
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
          },
          overviewRulerBorder: false,
          contextmenu: true,
          mouseWheelZoom: true,
          snippetSuggestions: 'top',
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
}
