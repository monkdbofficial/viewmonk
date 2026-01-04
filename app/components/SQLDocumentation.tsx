'use client';

import { useState } from 'react';
import { Book, Search, X, ChevronDown, ChevronRight, FileText, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SQLCommand {
  name: string;
  file: string;
  category: string;
}

const SQL_COMMANDS: SQLCommand[] = [
  // DDL - Data Definition Language
  { name: 'CREATE TABLE', file: '35_CREATE_TABLE.md', category: 'DDL' },
  { name: 'CREATE TABLE AS', file: '36_CREATE_TABLE_AS.md', category: 'DDL' },
  { name: 'CREATE VIEW', file: '39_CREATE_VIEW.md', category: 'DDL' },
  { name: 'CREATE FUNCTION', file: '28_CREATE_FUNCTION.md', category: 'DDL' },
  { name: 'CREATE ANALYSER', file: '25_CREATE_ANALYSER.md', category: 'DDL' },
  { name: 'CREATE BLOB', file: '26_CREATE_BLOB.md', category: 'DDL' },
  { name: 'CREATE FOREIGN TABLE', file: '27_CREATE_FOREIGN_TABLE.md', category: 'DDL' },
  { name: 'CREATE SERVER', file: '32_CREATE_SERVER.md', category: 'DDL' },
  { name: 'ALTER TABLE', file: '17_ALTER_TABLE.md', category: 'DDL' },
  { name: 'ALTER CLUSTER', file: '13_ALTER_CLUSTER.md', category: 'DDL' },
  { name: 'DROP TABLE', file: '54_DROP_TABLE.md', category: 'DDL' },
  { name: 'DROP VIEW', file: '57_DROP_VIEW.md', category: 'DDL' },
  { name: 'DROP FUNCTION', file: '47_DROP_FUNCTION.md', category: 'DDL' },
  { name: 'DROP ANALYSER', file: '45_DROP_ANALYSER.md', category: 'DDL' },
  { name: 'DROP FOREIGN TABLE', file: '46_DROP_FOREIGN_TABLE.md', category: 'DDL' },
  { name: 'DROP SERVER', file: '51_DROP_SERVER.md', category: 'DDL' },

  // DML - Data Manipulation Language
  { name: 'SELECT', file: '68_SELECT.md', category: 'DML' },
  { name: 'INSERT', file: '62_INSERT.md', category: 'DML' },
  { name: 'UPDATE', file: '77_UPDATE.md', category: 'DML' },
  { name: 'DELETE', file: '42_DELETE.md', category: 'DML' },
  { name: 'COPY FROM', file: '23_COPY_FROM.md', category: 'DML' },
  { name: 'COPY TO', file: '24_COPY_TO.md', category: 'DML' },
  { name: 'VALUES', file: '78_VALUES.md', category: 'DML' },
  { name: 'WITH', file: '79_WITH.md', category: 'DML' },

  // Transaction Control
  { name: 'BEGIN', file: '20_BEGIN.md', category: 'Transaction' },
  { name: 'START TRANSACTION', file: '76_START_TRANSACTION.md', category: 'Transaction' },
  { name: 'COMMIT', file: '22_COMMIT.md', category: 'Transaction' },
  { name: 'END', file: '58_END.md', category: 'Transaction' },
  { name: 'SET TRANSACTION', file: '71_SET_TRANSACTION.md', category: 'Transaction' },

  // Access Control & Security
  { name: 'CREATE ROLE', file: '31_CREATE_ROLE.md', category: 'Security' },
  { name: 'CREATE USER', file: '37_CREATE_USER.md', category: 'Security' },
  { name: 'ALTER ROLE', file: '15_ALTER_ROLE.md', category: 'Security' },
  { name: 'ALTER USER', file: '18_ALTER_USER.md', category: 'Security' },
  { name: 'DROP ROLE', file: '50_DROP_ROLE.md', category: 'Security' },
  { name: 'DROP USER', file: '55_DROP_USER.md', category: 'Security' },
  { name: 'GRANT', file: '61_GRANT.md', category: 'Security' },
  { name: 'REVOKE', file: '67_REVOKE.md', category: 'Security' },
  { name: 'DENY', file: '43_DENY.md', category: 'Security' },
  { name: 'SET SESSION AUTHORIZATION', file: '70_SET_AND_RESET_SESSION_AUTHORIZATION.md', category: 'Security' },

  // Backup & Snapshot
  { name: 'CREATE REPOSITORY', file: '30_CREATE_REPOSITORY.md', category: 'Backup' },
  { name: 'CREATE SNAPSHOT', file: '33_CREATE_SNAPSHOT.md', category: 'Backup' },
  { name: 'DROP REPOSITORY', file: '49_DROP_REPOSITORY.md', category: 'Backup' },
  { name: 'DROP SNAPSHOT', file: '52_DROP_SNAPSHOT.md', category: 'Backup' },
  { name: 'RESTORE SNAPSHOT', file: '66_RESTORE_SNAPSHOT.md', category: 'Backup' },

  // Utility & Information
  { name: 'SHOW TABLES', file: '75_SHOW_TABLES.md', category: 'Utility' },
  { name: 'SHOW SCHEMAS', file: '74_SHOW_SCHEMAS.md', category: 'Utility' },
  { name: 'SHOW COLUMNS', file: '73_SHOW_COLUMNS.md', category: 'Utility' },
  { name: 'SHOW CREATE TABLE', file: '74_SHOW_CREATE_TABLE.md', category: 'Utility' },
  { name: 'SHOW SESSION SETTINGS', file: '72_SHOW_(SESSION_SETTINGS).md', category: 'Utility' },
  { name: 'EXPLAIN', file: '59_EXPLAIN.md', category: 'Utility' },
  { name: 'ANALYZE', file: '19_ANALYZE.md', category: 'Utility' },
  { name: 'OPTIMIZE', file: '64_OPTIMIZE.md', category: 'Utility' },
  { name: 'REFRESH', file: '65_REFRESH.md', category: 'Utility' },
  { name: 'SET / RESET', file: '69_SET_RESET.md', category: 'Utility' },
  { name: 'KILL', file: '63_KILL.md', category: 'Utility' },

  // Advanced
  { name: 'CREATE PUBLICATION', file: '29_CREATE_PUBLICATION.md', category: 'Advanced' },
  { name: 'CREATE SUBSCRIPTION', file: '34_CREATE_SUBSCRIPTION.md', category: 'Advanced' },
  { name: 'CREATE USER MAPPING', file: '38_CREATE_USER_MAPPING.md', category: 'Advanced' },
  { name: 'ALTER PUBLICATION', file: '14_ALTER_PUBLICATION.md', category: 'Advanced' },
  { name: 'ALTER SERVER', file: '16_ALTER_SERVER.md', category: 'Advanced' },
  { name: 'DROP PUBLICATION', file: '48_DROP_PUBLICATION.md', category: 'Advanced' },
  { name: 'DROP SUBSCRIPTION', file: '53_DROP_SUBSCRIPTION.md', category: 'Advanced' },
  { name: 'DROP USER MAPPING', file: '56_DROP_USER_MAPPING.md', category: 'Advanced' },
  { name: 'DECLARE', file: '41_DECLARE.md', category: 'Advanced' },
  { name: 'FETCH', file: '60_FETCH.md', category: 'Advanced' },
  { name: 'CLOSE', file: '21_CLOSE.md', category: 'Advanced' },
  { name: 'DEALLOCATE', file: '40_DEALLOCATE.md', category: 'Advanced' },
  { name: 'DISCARD', file: '44_DISCARD.md', category: 'Advanced' },
];

const CATEGORIES = [
  { name: 'DDL', label: 'Data Definition (DDL)', icon: '📝' },
  { name: 'DML', label: 'Data Manipulation (DML)', icon: '🔄' },
  { name: 'Transaction', label: 'Transaction Control', icon: '🔐' },
  { name: 'Security', label: 'Access Control & Security', icon: '🔒' },
  { name: 'Backup', label: 'Backup & Snapshot', icon: '💾' },
  { name: 'Utility', label: 'Utility & Information', icon: '🔧' },
  { name: 'Advanced', label: 'Advanced Features', icon: '⚙️' },
];

interface SQLDocumentationProps {
  onClose?: () => void;
  onInsertExample?: (sql: string) => void;
}

export default function SQLDocumentation({ onClose, onInsertExample }: SQLDocumentationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['DDL', 'DML']));
  const [selectedCommand, setSelectedCommand] = useState<SQLCommand | null>(null);
  const [commandContent, setCommandContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const loadCommandDoc = async (command: SQLCommand) => {
    setSelectedCommand(command);
    setLoading(true);
    try {
      console.log('Loading doc:', `/monk-docs/${command.file}`);
      const response = await fetch(`/monk-docs/${command.file}`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const content = await response.text();
        console.log('Content loaded, length:', content.length);
        setCommandContent(content);
      } else {
        console.error('Failed to load:', response.status, response.statusText);
        setCommandContent(`# Documentation not available\n\nThe documentation file could not be loaded.\n\nError: ${response.status} ${response.statusText}\n\nPath: /monk-docs/${command.file}`);
      }
    } catch (error) {
      console.error('Error loading doc:', error);
      setCommandContent(`# Error loading documentation\n\nPlease try again.\n\nError: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCommands = SQL_COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const commandsByCategory = CATEGORIES.map((category) => ({
    ...category,
    commands: filteredCommands.filter((cmd) => cmd.category === category.name),
  })).filter((cat) => cat.commands.length > 0);

  const extractFirstExample = (content: string): string | null => {
    const codeBlockMatch = content.match(/```sql\n([\s\S]*?)\n```/);
    return codeBlockMatch ? codeBlockMatch[1].trim() : null;
  };

  console.log('SQLDocumentation rendering, categories:', commandsByCategory.length);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">SQL Documentation (DEBUG: {SQL_COMMANDS.length} commands)</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Command List */}
        <div className="w-56 flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          {commandsByCategory.map((category) => (
            <div key={category.name} className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleCategory(category.name)}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <span>{category.icon}</span>
                  {category.label}
                </span>
                {expandedCategories.has(category.name) ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {expandedCategories.has(category.name) && (
                <div className="bg-gray-50 dark:bg-gray-800/50">
                  {category.commands.map((command) => (
                    <button
                      key={command.name}
                      onClick={() => loadCommandDoc(command)}
                      className={`flex w-full items-center gap-2 px-6 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        selectedCommand?.name === command.name
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {command.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Documentation Viewer */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          {!selectedCommand && (
            <div className="flex h-full items-center justify-center text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="p-8">
                <Book className="mx-auto h-16 w-16 text-purple-600 dark:text-purple-400" />
                <h4 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
                  Select a SQL Command
                </h4>
                <p className="mt-3 text-base text-gray-600 dark:text-gray-300 max-w-md">
                  Choose a SQL command from the left panel to view its complete documentation
                </p>
                <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  <p>✅ {SQL_COMMANDS.length} commands available</p>
                  <p className="mt-1">📚 7 categories</p>
                </div>
              </div>
            </div>
          )}

          {selectedCommand && loading && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading documentation...</p>
              </div>
            </div>
          )}

          {selectedCommand && !loading && (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              {/* Command Header */}
              <div className="mb-6 flex items-start justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                <div>
                  <h2 className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedCommand.name}
                  </h2>
                  <p className="mt-2 text-base font-medium text-gray-600 dark:text-gray-300">
                    {CATEGORIES.find((c) => c.name === selectedCommand.category)?.label}
                  </p>
                </div>
                {onInsertExample && extractFirstExample(commandContent) && (
                  <button
                    onClick={() => {
                      const example = extractFirstExample(commandContent);
                      if (example) onInsertExample(example);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                  >
                    <Copy className="h-4 w-4" />
                    Insert Example
                  </button>
                )}
              </div>

              {/* Markdown Content */}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="text-gray-900 dark:text-gray-100">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({...props}) => <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4" {...props} />,
                      h2: ({...props}) => <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-6" {...props} />,
                      h3: ({...props}) => <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4" {...props} />,
                      p: ({...props}) => <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed" {...props} />,
                      code: ({className, ...props}: any) => {
                        const isInline = !className || !className.includes('language-');
                        return isInline
                          ? <code className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-mono" {...props} />
                          : <code className="block p-4 rounded-lg bg-gray-900 text-gray-100 overflow-x-auto font-mono text-sm" {...props} />;
                      },
                      pre: ({...props}) => <pre className="mb-4 overflow-hidden rounded-lg" {...props} />,
                      ul: ({...props}) => <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-3 space-y-1" {...props} />,
                      ol: ({...props}) => <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-3 space-y-1" {...props} />,
                      li: ({...props}) => <li className="text-gray-700 dark:text-gray-300" {...props} />,
                      table: ({...props}) => <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 mb-4" {...props} />,
                      th: ({...props}) => <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800" {...props} />,
                      td: ({...props}) => <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300" {...props} />,
                    }}
                  >
                    {commandContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
