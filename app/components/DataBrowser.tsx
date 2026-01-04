'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveConnection } from '../lib/monkdb-context';
import { useSchemas, useTables } from '../lib/monkdb-hooks';
import ConnectionPrompt from './common/ConnectionPrompt';
import Select from './ui/Select';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface TableData {
  columns: string[];
  rows: any[][];
  totalRows: number;
}

export default function DataBrowser() {
  const router = useRouter();
  const activeConnection = useActiveConnection();
  const { data: schemas, loading: schemasLoading } = useSchemas();
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const { data: tables, loading: tablesLoading } = useTables(selectedSchema);

  // CRITICAL: Guard against no connection - enterprise-grade connection protection
  if (!activeConnection) {
    return (
      <ConnectionPrompt
        onConnect={() => router.push('/connections')}
        title="No Database Connection"
        message="Please connect to a MonkDB database to browse data."
        buttonText="Go to Connections"
      />
    );
  }

  // Set default schema when schemas load
  useEffect(() => {
    if (schemas && schemas.length > 0 && !selectedSchema) {
      const defaultSchema = schemas.find(s => s !== 'sys' && s !== 'information_schema' && s !== 'pg_catalog') || schemas[0];
      setSelectedSchema(defaultSchema);
    }
  }, [schemas, selectedSchema]);

  // Fetch table data
  useEffect(() => {
    if (!activeConnection || !selectedSchema || !selectedTable) {
      setTableData(null);
      return;
    }

    const fetchTableData = async () => {
      setLoading(true);
      setError('');
      try {
        const offset = (currentPage - 1) * pageSize;

        // Get total count
        const countResult = await activeConnection.client.query(
          `SELECT COUNT(*) as total FROM "${selectedSchema}"."${selectedTable}"`
        );
        const totalRows = countResult.rows[0]?.[0] || 0;

        // Get paginated data
        const dataResult = await activeConnection.client.query(
          `SELECT * FROM "${selectedSchema}"."${selectedTable}" LIMIT ${pageSize} OFFSET ${offset}`
        );

        setTableData({
          columns: dataResult.cols || [],
          rows: dataResult.rows || [],
          totalRows: totalRows
        });
      } catch (err) {
        console.error('Error fetching table data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch table data');
        setTableData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTableData();
  }, [activeConnection, selectedSchema, selectedTable, currentPage, pageSize]);

  if (schemasLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredTables = tables?.filter(t =>
    t.table_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalPages = tableData ? Math.ceil(tableData.totalRows / pageSize) : 0;

  return (
    <div className="flex h-full gap-4">
      {/* Schemas & Tables List */}
      <div className="w-64 space-y-2">
        <div className="mb-4">
          <Select
            value={selectedSchema}
            onChange={(e) => {
              setSelectedSchema(e.target.value);
              setSelectedTable('');
              setCurrentPage(1);
            }}
            className="mb-2 font-semibold"
            fullWidth
          >
            {schemas?.map((schema) => (
              <option key={schema} value={schema}>
                {schema}
              </option>
            ))}
          </Select>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tables
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filteredTables.length} tables
          </p>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search tables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />

        {/* Tables List */}
        <div className="space-y-1">
          {tablesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : filteredTables.length > 0 ? (
            filteredTables.map((table) => (
              <button
                key={table.table_name}
                onClick={() => {
                  setSelectedTable(table.table_name);
                  setCurrentPage(1);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedTable === table.table_name
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📊</span>
                  {table.table_name}
                </span>
              </button>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No tables found
            </p>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 space-y-4">
        {selectedTable ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedSchema}.{selectedTable}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {tableData ? `${tableData.totalRows} total rows` : 'Loading...'}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : tableData && tableData.rows.length > 0 ? (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {tableData.columns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                      {tableData.rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
                            >
                              {cell === null ? (
                                <span className="text-gray-400 italic">NULL</span>
                              ) : typeof cell === 'object' ? (
                                <pre className="text-xs">{JSON.stringify(cell, null, 2)}</pre>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No data available</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a table to view its data
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
