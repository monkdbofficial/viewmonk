'use client';

import React, { useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import MonacoSQLEditor, { SchemaMetadata } from './MonacoSQLEditor';

interface DroppableMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  height?: string;
  readOnly?: boolean;
  schema?: SchemaMetadata;
}

interface DragItem {
  type: string;
  schema: string;
  table: string;
  column?: string;
}

const ItemTypes = {
  TABLE: 'table',
  COLUMN: 'column',
};

/**
 * Monaco SQL Editor with drag-and-drop support
 * Accepts table and column drops from SchemaExplorer
 */
const DroppableMonacoEditor: React.FC<DroppableMonacoEditorProps> = ({
  value,
  onChange,
  onExecute,
  height = '400px',
  readOnly = false,
  schema,
}) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: [ItemTypes.TABLE, ItemTypes.COLUMN],
      drop: (item: DragItem, monitor) => {
        const didDrop = monitor.didDrop();
        if (didDrop) {
          return;
        }

        // Check if modifier keys were pressed
        const clientOffset = monitor.getClientOffset();
        const event = (monitor as any).sourceClientOffset;

        let textToInsert = '';

        if (item.type === ItemTypes.TABLE) {
          // Check for modifier key (Shift) - generate SELECT statement
          // Note: We can't directly detect modifier keys from react-dnd
          // So we'll provide the simple table name by default
          const fullTableName = `"${item.schema}"."${item.table}"`;
          textToInsert = fullTableName;
        } else if (item.type === ItemTypes.COLUMN) {
          textToInsert = item.column || '';
        }

        // Insert at the end of current content
        if (textToInsert) {
          const newValue = value ? `${value}\n${textToInsert}` : textToInsert;
          onChange(newValue);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [value, onChange]
  );

  // Combine refs
  useEffect(() => {
    if (editorContainerRef.current) {
      drop(editorContainerRef.current);
    }
  }, [drop]);

  return (
    <div
      ref={editorContainerRef}
      className={`relative ${
        isOver && canDrop
          ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900'
          : ''
      }`}
    >
      {isOver && canDrop && (
        <div className="absolute inset-0 z-10 bg-blue-500/10 pointer-events-none rounded-lg border-2 border-blue-500 border-dashed flex items-center justify-center">
          <div className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
            Drop to insert
          </div>
        </div>
      )}
      <MonacoSQLEditor
        value={value}
        onChange={onChange}
        onExecute={onExecute}
        height={height}
        readOnly={readOnly}
        schema={schema}
      />
    </div>
  );
};

export default DroppableMonacoEditor;
