'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Clock,
  Download,
  FileArchive,
  Database,
  AlertTriangle,
  GitBranch,
  RotateCcw,
} from 'lucide-react';
import { useBlobStorage, BlobMetadata } from '../../lib/blob-context';
import { useUser } from '../../lib/user-context';

interface AdvancedFeaturesDialogProps {
  onClose: () => void;
  selectedFile?: BlobMetadata | null;
}

type Tab = 'cleanup' | 'versioning' | 'backup';

export default function AdvancedFeaturesDialog({ onClose, selectedFile }: AdvancedFeaturesDialogProps) {
  const {
    currentTable,
    getTrashCleanupPreview,
    cleanupOldTrashedFiles,
    getFileVersionHistory,
    createNewVersion,
    restoreFileVersion,
    deleteAllVersions,
    exportMetadata,
    exportAllBlobs,
    getBackupSummary,
  } = useBlobStorage();
  const { role } = useUser();

  const [activeTab, setActiveTab] = useState<Tab>(selectedFile ? 'versioning' : 'cleanup');
  const [loading, setLoading] = useState(false);

  // Cleanup state
  const [cleanupDays, setCleanupDays] = useState(30);
  const [cleanupPreview, setCleanupPreview] = useState<{ files: BlobMetadata[]; totalSize: number; count: number } | null>(null);

  // Versioning state
  const [versions, setVersions] = useState<BlobMetadata[]>([]);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // Backup state
  const [backupSummary, setBackupSummary] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'sql'>('json');

  useEffect(() => {
    if (activeTab === 'cleanup') {
      loadCleanupPreview();
    } else if (activeTab === 'versioning' && selectedFile) {
      loadVersionHistory();
    } else if (activeTab === 'backup') {
      loadBackupSummary();
    }
  }, [activeTab, cleanupDays, selectedFile]);

  const loadCleanupPreview = async () => {
    if (!currentTable) return;
    setLoading(true);
    try {
      const preview = await getTrashCleanupPreview(currentTable, cleanupDays);
      setCleanupPreview(preview);
    } catch (error) {
      console.error('Failed to load cleanup preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!currentTable || !cleanupPreview) return;

    const confirmed = confirm(
      `Are you sure you want to permanently delete ${cleanupPreview.count} files older than ${cleanupDays} days? This cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await cleanupOldTrashedFiles(currentTable, cleanupDays);
      await loadCleanupPreview();
    } catch (error) {
      console.error('Failed to cleanup files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersionHistory = async () => {
    if (!currentTable || !selectedFile) return;
    setLoading(true);
    try {
      const history = await getFileVersionHistory(currentTable, selectedFile.id);
      setVersions(history);
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentTable || !selectedFile || !e.target.files?.[0]) return;

    setUploadingVersion(true);
    try {
      await createNewVersion(currentTable, selectedFile.id, e.target.files[0]);
      await loadVersionHistory();
    } catch (error) {
      console.error('Failed to upload new version:', error);
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!currentTable) return;

    const confirmed = confirm('Are you sure you want to restore this version?');
    if (!confirmed) return;

    setLoading(true);
    try {
      await restoreFileVersion(currentTable, versionId);
      await loadVersionHistory();
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackupSummary = async () => {
    if (!currentTable) return;
    setLoading(true);
    try {
      const summary = await getBackupSummary(currentTable);
      setBackupSummary(summary);
    } catch (error) {
      console.error('Failed to load backup summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportMetadata = async () => {
    if (!currentTable) return;
    setLoading(true);
    try {
      await exportMetadata(currentTable, exportFormat);
    } catch (error) {
      console.error('Failed to export metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    if (!currentTable) return;

    const confirmed = confirm('This will download all files as a ZIP archive. Continue?');
    if (!confirmed) return;

    setLoading(true);
    try {
      await exportAllBlobs(currentTable);
    } catch (error) {
      console.error('Failed to export all blobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    let date: Date;
    if (/^\d+$/.test(dateString)) {
      date = new Date(parseInt(dateString));
    } else {
      date = new Date(dateString);
    }
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Advanced Features</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('cleanup')}
            className={`flex-1 px-6 py-3 font-medium flex items-center justify-center gap-2 ${
              activeTab === 'cleanup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Trash Cleanup
          </button>
          <button
            onClick={() => setActiveTab('versioning')}
            disabled={!selectedFile}
            className={`flex-1 px-6 py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'versioning'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            File Versions
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 px-6 py-3 font-medium flex items-center justify-center gap-2 ${
              activeTab === 'backup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            Backup & Export
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'cleanup' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-300">
                      Permanently Delete Old Trashed Files
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      This will permanently delete files that have been in trash for more than the specified number of days. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delete files older than (days):
                </label>
                <input
                  type="number"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(Number(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>

              {cleanupPreview && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Preview: {cleanupPreview.count} files will be deleted
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Total size: {formatFileSize(cleanupPreview.totalSize)}
                  </p>

                  {cleanupPreview.files.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cleanupPreview.files.map((file) => (
                        <div
                          key={file.id}
                          className="text-sm bg-gray-50 dark:bg-gray-900 rounded p-2"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">{file.filename}</p>
                          <p className="text-gray-500 dark:text-gray-400">
                            Deleted: {file.deleted_at ? formatDate(file.deleted_at) : 'Unknown'} • {formatFileSize(file.file_size)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {role === 'admin' && cleanupPreview && cleanupPreview.count > 0 && (
                <button
                  onClick={handleCleanup}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {loading ? 'Cleaning up...' : `Permanently Delete ${cleanupPreview.count} Files`}
                </button>
              )}
            </div>
          )}

          {activeTab === 'versioning' && selectedFile && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="font-medium text-blue-800 dark:text-blue-300">
                  Current File: {selectedFile.filename}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Version {selectedFile.version_number || 1} • {formatFileSize(selectedFile.file_size)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload New Version
                </label>
                <input
                  type="file"
                  onChange={handleUploadVersion}
                  disabled={uploadingVersion}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Version History ({versions.length})
                </h3>
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No version history available
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Version {version.version_number || 1}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(version.uploaded_at)} • {formatFileSize(version.file_size)}
                          </p>
                          {version.uploaded_by && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              by {version.uploaded_by}
                            </p>
                          )}
                        </div>
                        {version.id !== selectedFile.id && (
                          <button
                            onClick={() => handleRestoreVersion(version.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded text-sm flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              {backupSummary && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Backup Summary</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Total Files</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {backupSummary.fileCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Total Size</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatFileSize(backupSummary.totalSize)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Export Metadata</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Export file metadata (names, sizes, dates, tags, etc.) without the actual file content.
                </p>
                <div className="flex gap-3">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'json' | 'sql')}
                    className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    <option value="json">JSON Format</option>
                    <option value="sql">SQL Format</option>
                  </select>
                  <button
                    onClick={handleExportMetadata}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Metadata
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Export All Files</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Download all files as a ZIP archive. This includes both metadata and file content.
                </p>
                <button
                  onClick={handleExportAll}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
                >
                  <FileArchive className="w-4 h-4" />
                  Export All Files as ZIP
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
