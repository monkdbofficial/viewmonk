'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2, Database, Info } from 'lucide-react';
import { useBlobStorage } from '../../lib/blob-context';
import { useActiveConnection } from '../../lib/monkdb-context';
import { useToast } from '../ToastContext';

interface BlobUploaderProps {
  table: string;
  folder: string | null;
  onClose: () => void;
}

interface FileWithStatus {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export default function BlobUploader({ table, folder, onClose }: BlobUploaderProps) {
  const activeConnection = useActiveConnection();
  const toast = useToast();
  const { uploadFile } = useBlobStorage();
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [duplicateFile, setDuplicateFile] = useState<{file: File; existingFile: any} | null>(null);

  // Validate connection on mount
  useEffect(() => {
    if (!activeConnection) {
      setConnectionError('No active database connection');
      toast.error('No Connection', 'Please connect to a database before uploading files');
    } else {
      setConnectionError(null);
    }
  }, [activeConnection, toast]);

  // Auto-close dialog when all uploads complete successfully
  useEffect(() => {
    if (files.length === 0) return;

    const allCompleted = files.every(f => f.status === 'completed');
    const anyPending = files.some(f => f.status === 'pending' || f.status === 'uploading');

    if (allCompleted && !anyPending) {
      console.log('[BlobUploader] All uploads successful, closing dialog in 1.5s');
      const timer = setTimeout(() => {
        onClose();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [files, onClose]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, []);

  const addFiles = async (newFiles: File[]) => {
    // Check each file for duplicates
    for (const file of newFiles) {
      const existing = await checkDuplicate(file);
      if (existing) {
        // Show duplicate dialog
        setDuplicateFile({ file, existingFile: existing });
        return; // Process one at a time
      } else {
        // No duplicate, add to upload queue
        const fileWithStatus: FileWithStatus = {
          file,
          status: 'pending',
          progress: 0,
        };
        setFiles((prev) => [...prev, fileWithStatus]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate SHA1 hash of a file
  const calculateSHA1 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Check if file already exists
  const checkDuplicate = async (file: File): Promise<any | null> => {
    if (!activeConnection || !table) return null;

    try {
      const sha1Hash = await calculateSHA1(file);
      const metadataTable = `${table}_blob_metadata`;
      const sql = `SELECT * FROM ${metadataTable} WHERE sha1_hash = '${sha1Hash}' AND deleted_at IS NULL LIMIT 1`;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: sql }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.rows && data.rows.length > 0) {
          return {
            id: data.rows[0][0],
            sha1_hash: data.rows[0][1],
            filename: data.rows[0][2],
            file_size: data.rows[0][4],
            content_type: data.rows[0][5],
            uploaded_at: data.rows[0][6],
          };
        }
      }
      return null;
    } catch (error) {
      console.error('[BlobUploader] Duplicate check failed:', error);
      return null;
    }
  };

  const categorizeError = (error: any): string => {
    const errorMsg = error?.message || error?.toString() || 'Unknown error';

    // Connection errors
    if (errorMsg.includes('connection') || errorMsg.includes('ECONNREFUSED')) {
      return 'Connection lost - check database connection';
    }

    // Permission errors
    if (errorMsg.includes('permission') || errorMsg.includes('access denied') || errorMsg.includes('unauthorized')) {
      return 'Permission denied - check database access rights';
    }

    // File size errors
    if (errorMsg.includes('size') || errorMsg.includes('too large')) {
      return 'File too large - maximum 100MB allowed';
    }

    // Network errors
    if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
      return 'Network error - please retry';
    }

    return errorMsg.length > 80 ? errorMsg.substring(0, 77) + '...' : errorMsg;
  };

  const uploadFiles = async () => {
    // Validate connection
    if (!activeConnection || !table) {
      toast.error('Upload Failed', 'No active database connection');
      return;
    }

    console.log('[BlobUploader] Starting upload process...');
    console.log('[BlobUploader] Active connection:', activeConnection.name);
    console.log('[BlobUploader] Table:', table);
    console.log('[BlobUploader] Folder:', folder);

    // Upload files in batches of 3
    const CONCURRENT_UPLOADS = 3;
    const pendingFiles = files.filter((f) => f.status === 'pending');

    console.log(`[BlobUploader] Uploading ${pendingFiles.length} pending files...`);

    for (let i = 0; i < pendingFiles.length; i += CONCURRENT_UPLOADS) {
      const batch = pendingFiles.slice(i, i + CONCURRENT_UPLOADS);
      console.log(`[BlobUploader] Processing batch ${i / CONCURRENT_UPLOADS + 1}, ${batch.length} files`);

      await Promise.all(
        batch.map(async (fileWithStatus) => {
          const index = files.indexOf(fileWithStatus);

          try {
            console.log(`[BlobUploader] Uploading file: ${fileWithStatus.file.name}`);

            // Update status to uploading
            setFiles((prev) => {
              const updated = [...prev];
              updated[index] = { ...updated[index], status: 'uploading', progress: 50 };
              return updated;
            });

            await uploadFile(table, fileWithStatus.file, folder || undefined);

            console.log(`[BlobUploader] File uploaded successfully: ${fileWithStatus.file.name}`);

            // Update status to completed
            setFiles((prev) => {
              const updated = [...prev];
              updated[index] = { ...updated[index], status: 'completed', progress: 100 };
              return updated;
            });
          } catch (error: any) {
            const categorizedError = categorizeError(error);
            console.error('[BlobUploader] Upload error for', fileWithStatus.file.name, ':', error);
            console.error('[BlobUploader] Error stack:', error.stack);

            // Update status to failed
            setFiles((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                status: 'failed',
                progress: 0,
                error: categorizedError,
              };
              return updated;
            });

            toast.error('Upload Failed', categorizedError, 5000);
          }
        })
      );
    }

    console.log('[BlobUploader] All uploads completed');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  const canUpload = files.length > 0 && files.some((f) => f.status === 'pending') && !connectionError;
  const isUploading = files.some((f) => f.status === 'uploading');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload Files</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload files to {table}
              {folder && ` / ${folder}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Connection Context Info */}
        <div className="border-b border-gray-200 bg-blue-50 px-6 py-3 dark:border-gray-700 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Upload Context
              </h3>
              <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-700 dark:text-blue-300">
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  <span className="font-medium">Connection:</span>
                  <span className="truncate">{activeConnection?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Table:</span>
                  <span className="truncate">{table}</span>
                </div>
                {folder && (
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="font-medium">Folder:</span>
                    <span className="truncate">{folder}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {connectionError && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-900/50 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-xs text-red-700 dark:text-red-400">{connectionError}</p>
            </div>
          )}
        </div>

        {/* Drop Zone */}
        <div className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
            }`}
          >
            <Upload
              className={`mx-auto h-12 w-12 ${
                isDragging
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-gray-400'
              }`}
            />
            <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
              Drop files here or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maximum file size: 100MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 max-h-64 space-y-2 overflow-y-auto">
              {files.map((fileWithStatus, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
                >
                  {getStatusIcon(fileWithStatus.status)}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {fileWithStatus.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(fileWithStatus.file.size)}
                      {fileWithStatus.error && (
                        <span className="ml-2 text-red-500">
                          • {fileWithStatus.error}
                        </span>
                      )}
                    </p>

                    {/* Progress Bar */}
                    {fileWithStatus.status === 'uploading' && (
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${fileWithStatus.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {fileWithStatus.status === 'pending' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 p-6 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {isUploading ? 'Uploading...' : 'Cancel'}
            </button>
            <button
              onClick={uploadFiles}
              disabled={!canUpload || isUploading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate File Dialog */}
      {duplicateFile && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Duplicate File Detected
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This file already exists
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  File you're uploading:
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {duplicateFile.file.name} ({(duplicateFile.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Existing file:
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {duplicateFile.existingFile.filename} ({(duplicateFile.existingFile.file_size / 1024 / 1024).toFixed(2)} MB)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Uploaded: {new Date(duplicateFile.existingFile.uploaded_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  // Keep both - upload anyway
                  const fileWithStatus: FileWithStatus = {
                    file: duplicateFile.file,
                    status: 'pending',
                    progress: 0,
                  };
                  setFiles((prev) => [...prev, fileWithStatus]);
                  setDuplicateFile(null);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Keep Both Files
              </button>
              <button
                onClick={() => {
                  // Skip this file
                  setDuplicateFile(null);
                  toast.info('Skipped', `Skipped duplicate file: ${duplicateFile.file.name}`);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Skip This File
              </button>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 pt-2">
                Note: Files are identified by their content (SHA1 hash), not filename.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
