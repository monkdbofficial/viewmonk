'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useActiveConnection } from './monkdb-context';
import { useNotifications } from './notification-context';

export interface BlobMetadata {
  id: string;
  sha1_hash: string;
  filename: string;
  folder_path: string | null;
  file_size: number;
  content_type: string;
  uploaded_at: string;
  uploaded_by: string | null;
  metadata: Record<string, any> | null;
  // Enterprise features
  deleted_at: string | null;
  deleted_by: string | null;
  thumbnail_hash: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  download_count: number;
  last_accessed_at: string | null;
  share_token: string | null;
  share_expires_at: string | null;
  share_password: string | null;
  share_access_count: number;
  parent_version_id: string | null;
  version_number: number;
  file_description: string | null;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  sha1_hash?: string;
}

interface BlobContextValue {
  currentTable: string | null;
  setCurrentTable: (table: string | null) => void;
  currentFolder: string | null;
  setCurrentFolder: (folder: string | null) => void;
  blobs: BlobMetadata[];
  loading: boolean;
  uploadProgress: Map<string, UploadProgress>;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  showTrashed: boolean;
  setShowTrashed: (show: boolean) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  loadBlobs: (table: string, folder?: string, page?: number, size?: number) => Promise<void>;
  uploadFile: (table: string, file: File, folder?: string) => Promise<void>;
  downloadBlob: (table: string, sha1Hash: string, filename: string) => Promise<void>;
  downloadBlobsAsZip: (table: string, blobs: BlobMetadata[]) => Promise<void>;
  deleteBlob: (table: string, sha1Hash: string, metadataRowId: string, permanent?: boolean) => Promise<void>;
  restoreBlob: (table: string, metadataRowId: string) => Promise<void>;
  renameBlob: (table: string, metadataRowId: string, newFilename: string) => Promise<void>;
  toggleFavorite: (table: string, metadataRowId: string, isFavorite: boolean) => Promise<void>;
  updateTags: (table: string, metadataRowId: string, tags: string[]) => Promise<void>;
  updateDescription: (table: string, metadataRowId: string, description: string) => Promise<void>;
  createMetadataTable: (table: string) => Promise<void>;
  getStorageAnalytics: (table: string) => Promise<any>;
}

const BlobContext = createContext<BlobContextValue | undefined>(undefined);

export function BlobProvider({ children }: { children: React.ReactNode }) {
  const activeConnection = useActiveConnection();
  const { addNotification } = useNotifications();

  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [blobs, setBlobs] = useState<BlobMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());

  // Pagination and filtering
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showTrashed, setShowTrashed] = useState(false);

  const loadBlobs = useCallback(async (table: string, folder?: string, page = currentPage, size = pageSize) => {
    if (!activeConnection) {
      addNotification({
        type: 'error',
        title: 'No Connection',
        message: 'Please connect to a database first',
      });
      return;
    }

    setLoading(true);
    try {
      const isTauri = typeof window !== 'undefined' && window.__TAURI__;
      let result: BlobMetadata[];
      let count = 0;

      if (isTauri) {
        // Tauri mode
        console.log('[BlobStorage] Loading blobs via Tauri API...');
        result = await invoke('list_blobs', {
          request: {
            connection_id: activeConnection.id,
            table_name: table,
            folder_path: folder || null,
            limit: size,
            offset: (page - 1) * size,
          },
        });
        count = result.length; // Tauri should return count separately in future
      } else {
        // Browser mode - query metadata table directly with pagination
        console.log('[BlobStorage] Loading blobs via HTTP API with pagination...');
        const metadataTable = `${table}_blob_metadata`;

        // First, check if table exists and migrate if needed
        const checkTableSql = `SELECT column_name FROM information_schema.columns WHERE table_name = '${metadataTable}' AND table_schema = 'doc'`;
        const checkResponse = await fetch('/api/sql?t=' + Date.now(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: JSON.stringify({ stmt: checkTableSql }),
        });

        if (!checkResponse.ok) {
          console.warn('[BlobStorage] Table check failed, table may not exist');
          setBlobs([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        const tableInfo = await checkResponse.json();
        const existingColumns = (tableInfo.rows || []).map((row: any[]) => row[0]);
        console.log('[BlobStorage] Existing columns:', existingColumns);

        // Check if we need to add new columns
        const requiredColumns = [
          'deleted_at', 'deleted_by', 'thumbnail_hash', 'tags', 'is_favorite',
          'file_description', 'download_count', 'last_accessed_at', 'share_token',
          'share_expires_at', 'share_password', 'share_access_count',
          'parent_version_id', 'version_number'
        ];

        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

        if (missingColumns.length > 0) {
          console.log('[BlobStorage] Missing columns detected:', missingColumns);
          console.log('[BlobStorage] Some enterprise features will be disabled until migration.');

          addNotification({
            type: 'info',
            title: 'Table Migration Available',
            message: `Table "${table}" can be upgraded with enterprise features. Create a new table or run migration manually.`,
          });

          // Don't auto-migrate during load - it's too risky
          // User should either create a new table or manually migrate
        }

        // Build WHERE clause
        const whereClauses: string[] = [];

        if (folder) {
          whereClauses.push(`folder_path = '${folder.replace(/'/g, "''")}'`);
        }

        // Filter by trash status (only if column exists or was just added)
        const hasDeletedAtColumn = existingColumns.includes('deleted_at');
        if (hasDeletedAtColumn) {
          if (showTrashed) {
            whereClauses.push(`deleted_at IS NOT NULL`);
          } else {
            whereClauses.push(`deleted_at IS NULL`);
          }
        }

        const whereClause = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

        // First, get total count
        const countSql = `SELECT COUNT(*) FROM ${metadataTable}${whereClause}`;
        const countResponse = await fetch('/api/sql?t=' + Date.now(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: JSON.stringify({ stmt: countSql }),
        });

        if (countResponse.ok) {
          const countData = await countResponse.json();
          count = countData.rows?.[0]?.[0] || 0;
          setTotalCount(count);
        }

        // Build SELECT statement with only existing columns
        const baseColumns = ['id', 'sha1_hash', 'filename', 'folder_path', 'file_size', 'content_type', 'uploaded_at', 'uploaded_by', 'metadata'];
        const selectColumns = [...baseColumns];

        // Add enterprise columns if they exist
        const enterpriseColumns = [
          'deleted_at', 'deleted_by', 'thumbnail_hash', 'tags', 'is_favorite',
          'file_description', 'download_count', 'last_accessed_at', 'share_token',
          'share_expires_at', 'share_password', 'share_access_count',
          'parent_version_id', 'version_number'
        ];

        enterpriseColumns.forEach(col => {
          if (existingColumns.includes(col)) {
            selectColumns.push(col);
          }
        });

        // Then get paginated results with specific columns
        let sql = `SELECT ${selectColumns.join(', ')} FROM ${metadataTable}${whereClause}`;
        sql += ' ORDER BY uploaded_at DESC';
        sql += ` LIMIT ${size} OFFSET ${(page - 1) * size}`;

        const response = await fetch('/api/sql?t=' + Date.now(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify({ stmt: sql }),
          cache: 'no-store', // Prevent browser caching
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[BlobStorage] Load failed:', errorText);
          throw new Error(`Failed to load blobs: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Parse rows into BlobMetadata - map by column name
        result = (data.rows || []).map((row: any[]) => {
          const blob: any = {};
          selectColumns.forEach((col, idx) => {
            blob[col] = row[idx];
          });

          // Ensure all required fields exist with defaults
          return {
            id: blob.id || '',
            sha1_hash: blob.sha1_hash || '',
            filename: blob.filename || '',
            folder_path: blob.folder_path || null,
            file_size: blob.file_size || 0,
            content_type: blob.content_type || '',
            uploaded_at: blob.uploaded_at || new Date().toISOString(),
            uploaded_by: blob.uploaded_by || null,
            metadata: blob.metadata || null,
            deleted_at: blob.deleted_at || null,
            deleted_by: blob.deleted_by || null,
            thumbnail_hash: blob.thumbnail_hash || null,
            tags: blob.tags || null,
            is_favorite: blob.is_favorite || false,
            file_description: blob.file_description || null,
            download_count: blob.download_count || 0,
            last_accessed_at: blob.last_accessed_at || null,
            share_token: blob.share_token || null,
            share_expires_at: blob.share_expires_at || null,
            share_password: blob.share_password || null,
            share_access_count: blob.share_access_count || 0,
            parent_version_id: blob.parent_version_id || null,
            version_number: blob.version_number || 1,
          };
        });
      }

      setBlobs(result);
    } catch (error: any) {
      console.error('[BlobStorage] Failed to load blobs:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Load BLOBs',
        message: error.toString(),
      });
    } finally {
      setLoading(false);
    }
  }, [activeConnection, addNotification, currentPage, pageSize, showTrashed]);

  const uploadFile = useCallback(async (table: string, file: File, folder?: string) => {
    if (!activeConnection) {
      addNotification({
        type: 'error',
        title: 'No Connection',
        message: 'Please connect to a database first',
      });
      return;
    }

    // Initialize progress
    const progressKey = `${file.name}-${Date.now()}`;
    setUploadProgress(prev => new Map(prev).set(progressKey, {
      filename: file.name,
      progress: 0,
      status: 'pending',
    }));

    try {
      console.log(`[BlobUpload] Starting upload for ${file.name} (${file.size} bytes)`);
      console.log(`[BlobUpload] Mode: ${typeof window !== 'undefined' && window.__TAURI__ ? 'Tauri Desktop' : 'Web Browser'}`);

      // Read file content
      console.log(`[BlobUpload] Reading file content...`);
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      console.log(`[BlobUpload] File read successfully, ${fileBytes.length} bytes`);

      // Calculate SHA-1 hash
      console.log(`[BlobUpload] Calculating SHA-1 hash...`);
      const hashBuffer = await crypto.subtle.digest('SHA-1', fileBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha1Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      console.log(`[BlobUpload] SHA-1: ${sha1Hash}`);

      // Update progress to uploading
      setUploadProgress(prev => new Map(prev).set(progressKey, {
        filename: file.name,
        progress: 30,
        status: 'uploading',
      }));

      const isTauri = typeof window !== 'undefined' && window.__TAURI__;
      let result: {
        id: string;
        sha1_hash: string;
        blob_url: string;
        metadata_row_id: string;
      };

      if (isTauri) {
        // Tauri mode - use invoke command
        console.log(`[BlobUpload] Using Tauri API...`);
        result = await invoke('upload_blob', {
          request: {
            connection_id: activeConnection.id,
            table_name: table,
            file_content: Array.from(fileBytes),
            filename: file.name,
            folder_path: folder || null,
            content_type: file.type || 'application/octet-stream',
            metadata: null,
          },
        });
      } else {
        // Browser mode - use proxy API to avoid CORS
        console.log(`[BlobUpload] Using proxy API...`);

        // Upload blob via Next.js API proxy
        const proxyUrl = `/api/blob/${table}/${sha1Hash}`;
        console.log(`[BlobUpload] Uploading to proxy: ${proxyUrl}`);

        const uploadResponse = await fetch(proxyUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: fileBytes,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        console.log(`[BlobUpload] Blob uploaded successfully, status: ${uploadResponse.status}`);

        // Update progress
        setUploadProgress(prev => new Map(prev).set(progressKey, {
          filename: file.name,
          progress: 70,
          status: 'uploading',
        }));

        // Insert metadata into shadow table
        const metadataId = crypto.randomUUID();
        const metadataTable = `${table}_blob_metadata`;

        const insertSql = `INSERT INTO ${metadataTable} (id, sha1_hash, filename, folder_path, file_size, content_type, uploaded_at, uploaded_by, metadata)
          VALUES ('${metadataId}', '${sha1Hash}', '${file.name.replace(/'/g, "''")}', ${folder ? `'${folder.replace(/'/g, "''")}'` : 'NULL'}, ${file.size}, '${file.type || 'application/octet-stream'}', CURRENT_TIMESTAMP, NULL, NULL)`;

        console.log(`[BlobUpload] Inserting metadata...`);
        const metadataResponse = await fetch('/api/sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: JSON.stringify({ stmt: insertSql }),
        });

        if (!metadataResponse.ok) {
          console.warn(`[BlobUpload] Metadata insert failed: ${metadataResponse.status}`);
        } else {
          console.log(`[BlobUpload] Metadata inserted successfully`);
        }

        result = {
          id: metadataId,
          sha1_hash: sha1Hash,
          blob_url: `/_blobs/${table}/${sha1Hash}`,
          metadata_row_id: metadataId,
        };
      }

      console.log(`[BlobUpload] Upload successful! SHA-1: ${result.sha1_hash}`);

      // Update progress to completed
      setUploadProgress(prev => new Map(prev).set(progressKey, {
        filename: file.name,
        progress: 100,
        status: 'completed',
        sha1_hash: result.sha1_hash,
      }));

      addNotification({
        type: 'success',
        title: 'Upload Successful',
        message: `${file.name} uploaded successfully`,
      });

      // Reload blobs
      await loadBlobs(table, folder);

      // Remove progress after delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const updated = new Map(prev);
          updated.delete(progressKey);
          return updated;
        });
      }, 3000);
    } catch (error: any) {
      console.error(`[BlobUpload] Upload failed for ${file.name}:`, error);
      console.error(`[BlobUpload] Error details:`, {
        message: error.message,
        stack: error.stack,
        toString: error.toString()
      });

      setUploadProgress(prev => new Map(prev).set(progressKey, {
        filename: file.name,
        progress: 0,
        status: 'failed',
        error: error.toString(),
      }));

      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error.toString(),
      });

      // Remove failed progress after delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const updated = new Map(prev);
          updated.delete(progressKey);
          return updated;
        });
      }, 5000);

      // Re-throw to ensure the error is handled by the caller
      throw error;
    }
  }, [activeConnection, addNotification, loadBlobs]);

  const downloadBlob = useCallback(async (table: string, sha1Hash: string, filename: string) => {
    if (!activeConnection) return;

    try {
      const isTauri = typeof window !== 'undefined' && window.__TAURI__;

      if (isTauri) {
        // Tauri mode - save to file system
        const destinationPath = `/tmp/${filename}`;
        await invoke<string>('download_blob', {
          request: {
            connection_id: activeConnection.id,
            table_name: table,
            sha1_hash: sha1Hash,
            destination_path: destinationPath,
          },
        });

        addNotification({
          type: 'success',
          title: 'Download Successful',
          message: `${filename} downloaded to ${destinationPath}`,
        });
      } else {
        // Browser mode - download via proxy
        const proxyUrl = `/api/blob/${table}/${sha1Hash}`;

        const response = await fetch(proxyUrl, {
          headers: {
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
        });
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        addNotification({
          type: 'success',
          title: 'Download Successful',
          message: `${filename} downloaded`,
        });
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification]);

  const downloadBlobsAsZip = useCallback(async (table: string, blobs: BlobMetadata[]) => {
    if (!activeConnection) return;

    if (blobs.length === 0) {
      addNotification({
        type: 'error',
        title: 'No Files Selected',
        message: 'Please select files to download',
      });
      return;
    }

    try {
      const isTauri = typeof window !== 'undefined' && window.__TAURI__;

      if (isTauri) {
        // Tauri mode - create zip on backend
        const zipPath = await invoke<string>('download_blobs_as_zip', {
          connectionId: activeConnection.id,
          tableName: table,
          blobs: blobs,
        });

        addNotification({
          type: 'success',
          title: 'ZIP Download Successful',
          message: `${blobs.length} file(s) downloaded to ${zipPath}`,
        });
      } else {
        // Browser mode - download files individually
        addNotification({
          type: 'info',
          title: 'Downloading Files',
          message: `Downloading ${blobs.length} file(s) individually...`,
        });

        for (const blob of blobs) {
          await downloadBlob(table, blob.sha1_hash, blob.filename);
          // Small delay to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        addNotification({
          type: 'success',
          title: 'Download Complete',
          message: `${blobs.length} file(s) downloaded`,
        });
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification, downloadBlob]);

  const deleteBlob = useCallback(async (table: string, sha1Hash: string, metadataRowId: string, permanent = false) => {
    if (!activeConnection) return;

    try {
      const isTauri = typeof window !== 'undefined' && window.__TAURI__;

      if (isTauri) {
        // Tauri mode
        await invoke<void>('delete_blob', {
          request: {
            connection_id: activeConnection.id,
            table_name: table,
            sha1_hash: sha1Hash,
            metadata_row_id: metadataRowId,
          },
        });
      } else {
        // Browser mode
        const metadataTable = `${table}_blob_metadata`;

        if (permanent) {
          // Permanent delete - remove metadata and blob
          const deleteSql = `DELETE FROM ${metadataTable} WHERE id = '${metadataRowId.replace(/'/g, "''")}'`;

          const metadataResponse = await fetch('/api/sql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-monkdb-host': activeConnection.config.host,
              'x-monkdb-port': activeConnection.config.port.toString(),
            },
            body: JSON.stringify({ stmt: deleteSql }),
          });

          if (!metadataResponse.ok) {
            throw new Error(`Failed to delete metadata: ${metadataResponse.status}`);
          }

          // Delete blob via proxy
          const proxyUrl = `/api/blob/${table}/${sha1Hash}`;
          const blobResponse = await fetch(proxyUrl, {
            method: 'DELETE',
            headers: {
              'x-monkdb-host': activeConnection.config.host,
              'x-monkdb-port': activeConnection.config.port.toString(),
            },
          });

          if (!blobResponse.ok && blobResponse.status !== 404) {
            console.warn(`[BlobStorage] Blob delete returned ${blobResponse.status}`);
          }

          addNotification({
            type: 'success',
            title: 'Permanently Deleted',
            message: 'File permanently deleted',
          });
        } else {
          // Soft delete - move to trash
          const updateSql = `UPDATE ${metadataTable}
            SET deleted_at = CURRENT_TIMESTAMP, deleted_by = 'user'
            WHERE id = '${metadataRowId.replace(/'/g, "''")}'`;

          const updateResponse = await fetch('/api/sql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-monkdb-host': activeConnection.config.host,
              'x-monkdb-port': activeConnection.config.port.toString(),
            },
            body: JSON.stringify({ stmt: updateSql }),
          });

          if (!updateResponse.ok) {
            throw new Error(`Failed to move to trash: ${updateResponse.status}`);
          }

          addNotification({
            type: 'success',
            title: 'Moved to Trash',
            message: 'File moved to trash. You can restore it within 30 days.',
          });
        }
      }

      // Reload blobs
      await loadBlobs(table, currentFolder || undefined);
    } catch (error: any) {
      console.error('[BlobStorage] Delete failed:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification, loadBlobs, currentFolder]);

  const renameBlob = useCallback(async (table: string, metadataRowId: string, newFilename: string) => {
    if (!activeConnection) return;

    try {
      const isTauri = typeof window !== 'undefined' && window.__TAURI__;

      if (isTauri) {
        // Tauri mode - would need Rust implementation
        throw new Error('Rename not yet implemented for desktop mode');
      } else {
        // Browser mode - update filename in metadata table
        const metadataTable = `${table}_blob_metadata`;
        const updateSql = `UPDATE ${metadataTable} SET filename = '${newFilename.replace(/'/g, "''")}' WHERE id = '${metadataRowId.replace(/'/g, "''")}'`;

        // Execute UPDATE
        const updateResponse = await fetch('/api/sql?t=' + Date.now(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify({ stmt: updateSql }),
          cache: 'no-store',
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(`Failed to rename file: ${updateResponse.status} - ${JSON.stringify(errorData.error || 'Unknown error')}`);
        }

        const updateResult = await updateResponse.json();

        // Verify the update was successful
        if (updateResult.rowcount === 0) {
          throw new Error('No rows updated - file may not exist');
        }

        // Execute REFRESH TABLE to make changes immediately visible
        const refreshSql = `REFRESH TABLE ${metadataTable}`;

        const refreshResponse = await fetch('/api/sql?t=' + Date.now(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify({ stmt: refreshSql }),
          cache: 'no-store',
        });

        if (!refreshResponse.ok) {
          console.warn('[BlobStorage] REFRESH TABLE failed, changes may not be immediately visible');
        }
      }

      addNotification({
        type: 'success',
        title: 'Rename Successful',
        message: `File renamed to ${newFilename}`,
      });

      // Wait a moment for table refresh to propagate
      await new Promise(resolve => setTimeout(resolve, 200));

      // Reload blobs to show updated filename with force refresh
      await loadBlobs(table, currentFolder || undefined);
    } catch (error: any) {
      console.error('[BlobStorage] Rename failed:', error);
      addNotification({
        type: 'error',
        title: 'Rename Failed',
        message: error.toString(),
      });
      throw error;
    }
  }, [activeConnection, addNotification, loadBlobs, currentFolder]);

  // Restore blob from trash
  const restoreBlob = useCallback(async (table: string, metadataRowId: string) => {
    if (!activeConnection) return;

    try {
      const metadataTable = `${table}_blob_metadata`;
      const updateSql = `UPDATE ${metadataTable}
        SET deleted_at = NULL, deleted_by = NULL
        WHERE id = '${metadataRowId.replace(/'/g, "''")}'`;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: updateSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to restore file: ${response.status}`);
      }

      addNotification({
        type: 'success',
        title: 'Restored',
        message: 'File restored successfully',
      });

      await loadBlobs(table, currentFolder || undefined);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Restore Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification, loadBlobs, currentFolder]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (table: string, metadataRowId: string, isFavorite: boolean) => {
    console.log('[toggleFavorite] Called with:', { table, metadataRowId, isFavorite });
    if (!activeConnection) {
      console.error('[toggleFavorite] No active connection');
      return;
    }

    try {
      const metadataTable = `${table}_blob_metadata`;
      const updateSql = `UPDATE ${metadataTable}
        SET is_favorite = ${!isFavorite}
        WHERE id = '${metadataRowId.replace(/'/g, "''")}'`;

      console.log('[toggleFavorite] Executing SQL:', updateSql);

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: updateSql }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[toggleFavorite] Update failed:', errorText);
        throw new Error(`Failed to toggle favorite: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[toggleFavorite] Update result:', result);

      // Refresh table to make changes visible
      await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: `REFRESH TABLE ${metadataTable}` }),
      });

      console.log('[toggleFavorite] Reloading blobs...');
      await loadBlobs(table, currentFolder || undefined);
      console.log('[toggleFavorite] Complete');
    } catch (error: any) {
      console.error('[toggleFavorite] Error:', error);
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification, loadBlobs, currentFolder]);

  // Update tags
  const updateTags = useCallback(async (table: string, metadataRowId: string, tags: string[]) => {
    if (!activeConnection) return;

    try {
      const metadataTable = `${table}_blob_metadata`;
      const tagsArray = tags.length > 0 ? `['${tags.join("','")}']` : 'NULL';
      const updateSql = `UPDATE ${metadataTable}
        SET tags = ${tagsArray}
        WHERE id = '${metadataRowId.replace(/'/g, "''")}'`;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: updateSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update tags: ${response.status}`);
      }

      addNotification({
        type: 'success',
        title: 'Tags Updated',
        message: 'File tags updated successfully',
      });

      await loadBlobs(table, currentFolder || undefined);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification, loadBlobs, currentFolder]);

  // Update description
  const updateDescription = useCallback(async (table: string, metadataRowId: string, description: string) => {
    if (!activeConnection) return;

    try {
      const metadataTable = `${table}_blob_metadata`;
      const updateSql = `UPDATE ${metadataTable}
        SET file_description = '${description.replace(/'/g, "''")}'
        WHERE id = '${metadataRowId.replace(/'/g, "''")}'`;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: updateSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update description: ${response.status}`);
      }

      addNotification({
        type: 'success',
        title: 'Description Updated',
        message: 'File description updated successfully',
      });

      await loadBlobs(table, currentFolder || undefined);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification, loadBlobs, currentFolder]);

  // Get storage analytics
  const getStorageAnalytics = useCallback(async (table: string) => {
    if (!activeConnection) return null;

    try {
      const metadataTable = `${table}_blob_metadata`;

      // Get analytics data
      const analyticsSql = `
        SELECT
          COUNT(*) as total_files,
          SUM(file_size) as total_size,
          COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_files,
          COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as trashed_files,
          SUM(CASE WHEN deleted_at IS NOT NULL THEN file_size ELSE 0 END) as trashed_size,
          COUNT(CASE WHEN is_favorite = true THEN 1 END) as favorite_files,
          AVG(file_size) as avg_file_size,
          MAX(file_size) as max_file_size,
          MIN(file_size) as min_file_size,
          AVG(download_count) as avg_downloads,
          SUM(download_count) as total_downloads
        FROM ${metadataTable}
      `;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: analyticsSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.status}`);
      }

      const data = await response.json();
      const row = data.rows?.[0];

      // Get file type breakdown
      const typesSql = `
        SELECT content_type, COUNT(*) as count, SUM(file_size) as total_size
        FROM ${metadataTable}
        WHERE deleted_at IS NULL
        GROUP BY content_type
        ORDER BY count DESC
        LIMIT 10
      `;

      const typesResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: typesSql }),
      });

      const typesData = await typesResponse.json();

      // Get largest files
      const largestFilesSql = `
        SELECT filename, content_type, file_size
        FROM ${metadataTable}
        WHERE deleted_at IS NULL
        ORDER BY file_size DESC
        LIMIT 10
      `;

      const largestResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: largestFilesSql }),
      });

      const largestData = await largestResponse.json();

      // Get recent uploads (last 30 days)
      const recentUploadsSql = `
        SELECT COUNT(*) as recent_uploads
        FROM ${metadataTable}
        WHERE uploaded_at >= CURRENT_TIMESTAMP - INTERVAL '30' DAY
      `;

      const recentResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: recentUploadsSql }),
      });

      const recentData = await recentResponse.json();

      // Get unique uploaders
      const usersSql = `
        SELECT COUNT(DISTINCT uploaded_by) as active_users
        FROM ${metadataTable}
        WHERE uploaded_by IS NOT NULL
      `;

      const usersResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: usersSql }),
      });

      const usersData = await usersResponse.json();

      // Get recent activity (last 20 uploads)
      const activitySql = `
        SELECT filename, uploaded_at, 'upload' as type
        FROM ${metadataTable}
        ORDER BY uploaded_at DESC
        LIMIT 20
      `;

      const activityResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: activitySql }),
      });

      const activityData = await activityResponse.json();

      return {
        totalFiles: row?.[0] || 0,
        totalSize: row?.[1] || 0,
        activeFiles: row?.[2] || 0,
        trashedFiles: row?.[3] || 0,
        trashedSize: row?.[4] || 0,
        favoriteCount: row?.[5] || 0,
        avgFileSize: row?.[6] || 0,
        maxFileSize: row?.[7] || 0,
        minFileSize: row?.[8] || 0,
        avgDownloads: row?.[9] || 0,
        totalDownloads: row?.[10] || 0,
        recentUploads: recentData.rows?.[0]?.[0] || 0,
        activeUsers: usersData.rows?.[0]?.[0] || 0,
        fileTypeBreakdown: typesData.rows?.map((r: any[]) => ({
          contentType: r[0],
          count: r[1],
          size: r[2],
        })) || [],
        largestFiles: largestData.rows?.map((r: any[]) => ({
          filename: r[0],
          content_type: r[1],
          file_size: r[2],
        })) || [],
        recentActivity: activityData.rows?.map((r: any[]) => ({
          filename: r[0],
          timestamp: r[1],
          type: r[2],
        })) || [],
      };
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get analytics:', error);
      return null;
    }
  }, [activeConnection]);

  const createMetadataTable = useCallback(async (table: string) => {
    if (!activeConnection) return;

    try {
      console.log(`[BlobStorage] Creating BLOB table and metadata table for: ${table}`);

      const isTauri = typeof window !== 'undefined' && window.__TAURI__;

      if (isTauri) {
        // Tauri mode - create blob table (which also creates metadata table)
        await invoke<void>('create_blob_table', {
          connectionId: activeConnection.id,
          tableName: table,
          numShards: 4,
          blobsPath: null,
          numberOfReplicas: 0,
        });
      } else {
        // Browser mode - create BLOB table first
        console.log(`[BlobStorage] Step 1: Creating BLOB table: ${table}`);
        const createBlobTableSql = `CREATE BLOB TABLE ${table} CLUSTERED INTO 4 SHARDS WITH (number_of_replicas = 0)`;

        const blobTableResponse = await fetch('/api/sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: JSON.stringify({ stmt: createBlobTableSql }),
        });

        if (!blobTableResponse.ok) {
          const errorText = await blobTableResponse.text();

          // Check if table already exists (ignore this error)
          if (errorText.includes('RelationAlreadyExists') || errorText.includes('already exists')) {
            console.log(`[BlobStorage] BLOB table already exists: ${table}`);
          } else {
            console.error(`[BlobStorage] Failed to create BLOB table: ${errorText}`);
            throw new Error(`Failed to create BLOB table: ${blobTableResponse.status} - ${errorText}`);
          }
        } else {
          console.log(`[BlobStorage] BLOB table created successfully: ${table}`);
        }

        // Step 2: Create metadata table with enterprise features
        console.log(`[BlobStorage] Step 2: Creating metadata table with enterprise features`);
        const metadataTable = `${table}_blob_metadata`;
        const createSql = `CREATE TABLE IF NOT EXISTS ${metadataTable} (
          id TEXT PRIMARY KEY,
          sha1_hash TEXT NOT NULL,
          filename TEXT NOT NULL,
          folder_path TEXT,
          file_size BIGINT NOT NULL,
          content_type TEXT NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          uploaded_by TEXT,
          metadata OBJECT,
          -- Soft delete / Trash bin
          deleted_at TIMESTAMP,
          deleted_by TEXT,
          -- Thumbnail system
          thumbnail_hash TEXT,
          -- Tags and organization
          tags ARRAY(TEXT),
          is_favorite BOOLEAN DEFAULT FALSE,
          file_description TEXT,
          -- Usage tracking
          download_count INT DEFAULT 0,
          last_accessed_at TIMESTAMP,
          -- Shareable links
          share_token TEXT,
          share_expires_at TIMESTAMP,
          share_password TEXT,
          share_access_count INT DEFAULT 0,
          -- Versioning
          parent_version_id TEXT,
          version_number INT DEFAULT 1
        )`;

        const response = await fetch('/api/sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: JSON.stringify({ stmt: createSql }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[BlobStorage] Failed to create metadata table: ${errorText}`);
          throw new Error(`Failed to create metadata table: ${response.status}`);
        }

        console.log(`[BlobStorage] Metadata table created successfully: ${metadataTable}`);

        // Create indexes for enterprise features
        console.log(`[BlobStorage] Step 3: Creating indexes for enterprise features`);
        const indexes = [
          `CREATE INDEX IF NOT EXISTS idx_${table}_sha1_hash ON ${metadataTable} (sha1_hash)`,
          `CREATE INDEX IF NOT EXISTS idx_${table}_folder_path ON ${metadataTable} (folder_path)`,
          `CREATE INDEX IF NOT EXISTS idx_${table}_uploaded_at ON ${metadataTable} (uploaded_at)`,
          `CREATE INDEX IF NOT EXISTS idx_${table}_filename ON ${metadataTable} (filename)`,
          `CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${metadataTable} (deleted_at)`,
          `CREATE INDEX IF NOT EXISTS idx_${table}_is_favorite ON ${metadataTable} (is_favorite)`,
          `CREATE INDEX IF NOT EXISTS idx_${table}_share_token ON ${metadataTable} (share_token)`,
          `CREATE INDEX IF NOT EXISTS idx_${table}_content_type ON ${metadataTable} (content_type)`,
        ];

        for (const indexSql of indexes) {
          await fetch('/api/sql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-monkdb-host': activeConnection.config.host,
              'x-monkdb-port': activeConnection.config.port.toString(),
            },
            body: JSON.stringify({ stmt: indexSql }),
          }).catch(err => console.warn('[BlobStorage] Index creation warning:', err));
        }

        console.log(`[BlobStorage] All indexes created successfully`);
      }

      addNotification({
        type: 'success',
        title: 'Table Created',
        message: `BLOB table ${table} created successfully`,
      });
    } catch (error: any) {
      console.error('[BlobStorage] Create table failed:', error);
      addNotification({
        type: 'error',
        title: 'Table Creation Failed',
        message: error.toString(),
      });
      throw error;
    }
  }, [activeConnection, addNotification]);

  const value: BlobContextValue = {
    currentTable,
    setCurrentTable,
    currentFolder,
    setCurrentFolder,
    blobs,
    loading,
    uploadProgress,
    totalCount,
    currentPage,
    pageSize,
    showTrashed,
    setShowTrashed,
    setCurrentPage,
    setPageSize,
    loadBlobs,
    uploadFile,
    downloadBlob,
    downloadBlobsAsZip,
    deleteBlob,
    restoreBlob,
    renameBlob,
    toggleFavorite,
    updateTags,
    updateDescription,
    createMetadataTable,
    getStorageAnalytics,
  };

  return <BlobContext.Provider value={value}>{children}</BlobContext.Provider>;
}

export function useBlobStorage() {
  const context = useContext(BlobContext);
  if (!context) {
    throw new Error('useBlobStorage must be used within BlobProvider');
  }
  return context;
}
