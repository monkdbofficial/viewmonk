'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { useAccessibleSchemas } from '@/app/hooks/useAccessibleSchemas';
import { useAccessibleTables } from '@/app/hooks/useAccessibleTables';
import { useToast } from '@/app/components/ToastContext';

interface CreateFTSIndexDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

type AnalyzerType = 'standard' | 'english' | 'keyword' | 'simple' | 'whitespace';

interface AnalyzerConfig {
  type: AnalyzerType;
  stopWords?: string[];
  customStopWords?: boolean;
}

const ANALYZER_OPTIONS: Array<{
  value: AnalyzerType;
  label: string;
  description: string;
}> = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Basic tokenization, no stemming or stop words. Good for code and IDs.',
  },
  {
    value: 'english',
    label: 'English',
    description: 'English stemming and stop words. Best for English text.',
  },
  {
    value: 'keyword',
    label: 'Keyword',
    description: 'Treats entire field as single token. For exact matching.',
  },
  {
    value: 'simple',
    label: 'Simple',
    description: 'Lowercase and split on non-letters.',
  },
  {
    value: 'whitespace',
    label: 'Whitespace',
    description: 'Split on whitespace only.',
  },
];

const DEFAULT_ENGLISH_STOP_WORDS = [
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into',
  'is', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then',
  'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with',
];

export default function CreateFTSIndexDialog({
  onClose,
  onSuccess,
}: CreateFTSIndexDialogProps) {
  const client = useMonkDBClient();
  const { schemas } = useAccessibleSchemas();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [schema, setSchema] = useState('');
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [indexName, setIndexName] = useState('');
  const [analyzerConfig, setAnalyzerConfig] = useState<AnalyzerConfig>({
    type: 'english',
    stopWords: DEFAULT_ENGLISH_STOP_WORDS,
    customStopWords: false,
  });
  const [customStopWords, setCustomStopWords] = useState('');
  const [creating, setCreating] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);

  const { tables } = useAccessibleTables(schema);

  // Fetch columns when table is selected
  useEffect(() => {
    if (!client || !schema || !tableName) return;

    const fetchColumns = async () => {
      try {
        const query = `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
            AND data_type IN ('text', 'varchar', 'character varying')
          ORDER BY ordinal_position
        `;

        const result = await client.query(query, [schema, tableName]);

        const rows = result.rows.map((row: any[]) => {
          const obj: any = {};
          result.cols.forEach((col: string, idx: number) => {
            obj[col] = row[idx];
          });
          return obj;
        });

        setColumns(rows.map((r: any) => r.column_name));
      } catch (err) {
        console.error('Failed to fetch columns:', err);
      }
    };

    fetchColumns();
  }, [client, schema, tableName]);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleTestAnalyzer = () => {
    if (!testQuery.trim()) return;

    // Simulate analyzer tokenization (simplified)
    let tokens = testQuery.toLowerCase().split(/\s+/);

    // Apply analyzer rules
    if (analyzerConfig.type === 'keyword') {
      tokens = [testQuery];
    } else if (analyzerConfig.type === 'simple') {
      tokens = testQuery.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    } else if (analyzerConfig.type === 'whitespace') {
      tokens = testQuery.split(/\s+/);
    }

    // Remove stop words for english analyzer
    if (analyzerConfig.type === 'english' && analyzerConfig.stopWords) {
      const stopWordsSet = new Set(analyzerConfig.stopWords);
      tokens = tokens.filter(t => !stopWordsSet.has(t));
    }

    // Remove empty tokens
    tokens = tokens.filter(t => t.length > 0);

    setTestResults(tokens);
  };

  const handleCreate = async () => {
    if (!client || !schema || !tableName || selectedColumns.length === 0) return;

    setCreating(true);

    try {
      const finalIndexName = indexName || `fts_${tableName}_${selectedColumns.join('_')}`;

      // Build analyzer configuration
      let analyzerClause = `WITH (analyzer = '${analyzerConfig.type}'`;

      if (analyzerConfig.type === 'english' && analyzerConfig.customStopWords && customStopWords) {
        const stopWordsList = customStopWords.split(',').map(w => w.trim()).filter(w => w.length > 0);
        analyzerClause += `, stopwords = ARRAY[${stopWordsList.map(w => `'${w}'`).join(', ')}]`;
      }

      analyzerClause += ')';

      // Build CREATE INDEX query
      const query = `
        CREATE INDEX "${finalIndexName}"
        ON "${schema}"."${tableName}"
        USING FULLTEXT (${selectedColumns.join(', ')})
        ${analyzerClause}
      `;

      await client.query(query);

      toast.success('FTS Index Created', `Created index ${finalIndexName}`);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create index';
      toast.error('Creation Failed', message);
    } finally {
      setCreating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return schema && tableName;
      case 2:
        return selectedColumns.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Schema
        </label>
        <select
          value={schema}
          onChange={(e) => {
            setSchema(e.target.value);
            setTableName('');
            setColumns([]);
            setSelectedColumns([]);
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select schema...</option>
          {schemas.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Table
        </label>
        <select
          value={tableName}
          onChange={(e) => {
            setTableName(e.target.value);
            setSelectedColumns([]);
          }}
          disabled={!schema}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="">Select table...</option>
          {tables.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Columns to Index
        </label>
        {columns.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No TEXT columns found in this table
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {columns.map((col) => (
              <label
                key={col}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedColumns([...selectedColumns, col]);
                    } else {
                      setSelectedColumns(selectedColumns.filter((c) => c !== col));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {col}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Index Name (optional)
        </label>
        <input
          type="text"
          value={indexName}
          onChange={(e) => setIndexName(e.target.value)}
          placeholder={`fts_${tableName}_${selectedColumns.join('_')}`}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Analyzer Type
        </label>
        <div className="space-y-2">
          {ANALYZER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                analyzerConfig.type === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <input
                type="radio"
                name="analyzer"
                checked={analyzerConfig.type === option.value}
                onChange={() => setAnalyzerConfig({ ...analyzerConfig, type: option.value })}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {option.label}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {analyzerConfig.type === 'english' && (
        <div>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={analyzerConfig.customStopWords}
              onChange={(e) =>
                setAnalyzerConfig({ ...analyzerConfig, customStopWords: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Custom Stop Words
            </span>
          </label>
          {analyzerConfig.customStopWords && (
            <textarea
              value={customStopWords}
              onChange={(e) => setCustomStopWords(e.target.value)}
              placeholder="a, an, and, are, as, at, be, but, by, for..."
              className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          )}
        </div>
      )}

      {/* Analyzer Testing */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Test Analyzer
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Enter text to tokenize..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleTestAnalyzer}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Test
          </button>
        </div>
        {testResults.length > 0 && (
          <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tokens ({testResults.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {testResults.map((token, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded"
                >
                  {token}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => {
    const finalIndexName = indexName || `fts_${tableName}_${selectedColumns.join('_')}`;

    let analyzerClause = `WITH (analyzer = '${analyzerConfig.type}'`;
    if (analyzerConfig.type === 'english' && analyzerConfig.customStopWords && customStopWords) {
      const stopWordsList = customStopWords.split(',').map(w => w.trim()).filter(w => w.length > 0);
      analyzerClause += `,\n      stopwords = ARRAY[${stopWordsList.map(w => `'${w}'`).join(', ')}]`;
    }
    analyzerClause += ')';

    const sqlPreview = `CREATE INDEX "${finalIndexName}"
ON "${schema}"."${tableName}"
USING FULLTEXT (${selectedColumns.join(', ')})
${analyzerClause};`;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Review Configuration
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Schema:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{schema}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Table:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{tableName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Columns:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {selectedColumns.join(', ')}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Analyzer:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {analyzerConfig.type}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SQL Preview
          </label>
          <pre className="p-4 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">
            {sqlPreview}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Create Full-Text Search Index
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Step {step} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={creating}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {['Select Table', 'Choose Columns', 'Configure Analyzer', 'Review'].map((label, idx) => (
            <div key={idx} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step > idx + 1
                    ? 'bg-green-500 text-white'
                    : step === idx + 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {step > idx + 1 ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={`ml-2 text-xs ${
                  step === idx + 1
                    ? 'text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleBack}
            disabled={step === 1 || creating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed() || creating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Index
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
