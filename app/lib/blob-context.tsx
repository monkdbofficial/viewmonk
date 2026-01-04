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
  loadBlobs: (table: string, folder?: string) => Promise<void>;
  uploadFile: (table: string, file: File, folder?: string) => Promise<void>;
  downloadBlob: (table: string, sha1Hash: string, filename: string) => Promise<void>;
  downloadBlobsAsZip: (table: string, blobs: BlobMetadata[]) => Promise<void>;
  deleteBlob: (table: string, sha1Hash: string, metadataRowId: string) => Promise<void>;
  createMetadataTable: (table: string) => Promise<void>;
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

  const loadBlobs = useCallback(async (table: string, folder?: string) => {
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
      const result = await invoke<BlobMetadata[]>('list_blobs', {
        request: {
          connection_id: activeConnection.id,
          table_name: table,
          folder_path: folder || null,
          limit: null,
          offset: null,
        },
      });

      setBlobs(result);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load BLOBs',
        message: error.toString(),
      });
    } finally {
      setLoading(false);
    }
  }, [activeConnection, addNotification]);

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
      // TODO: In a real implementation, use Tauri's dialog API to get file paths
      // For now, we'll use a placeholder path - the backend will need to handle File objects
      const tempPath = file.name; // This is a placeholder

      // Update progress to uploading
      setUploadProgress(prev => new Map(prev).set(progressKey, {
        filename: file.name,
        progress: 50,
        status: 'uploading',
      }));

      const result = await invoke<{
        id: string;
        sha1_hash: string;
        blob_url: string;
        metadata_row_id: string;
      }>('upload_blob', {
        request: {
          connection_id: activeConnection.id,
          table_name: table,
          file_path: tempPath,
          filename: file.name,
          folder_path: folder || null,
          content_type: file.type || 'application/octet-stream',
          metadata: null,
        },
      });

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
    }
  }, [activeConnection, addNotification, loadBlobs]);

  const downloadBlob = useCallback(async (table: string, sha1Hash: string, filename: string) => {
    if (!activeConnection) return;

    try {
      // TODO: Implement file save dialog with Tauri
      const destinationPath = `/tmp/${filename}`; // Temporary path

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
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'ZIP Download Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification]);

  const deleteBlob = useCallback(async (table: string, sha1Hash: string, metadataRowId: string) => {
    if (!activeConnection) return;

    try {
      await invoke<void>('delete_blob', {
        request: {
          connection_id: activeConnection.id,
          table_name: table,
          sha1_hash: sha1Hash,
          metadata_row_id: metadataRowId,
        },
      });

      addNotification({
        type: 'success',
        title: 'Delete Successful',
        message: 'BLOB deleted successfully',
      });

      // Reload blobs
      await loadBlobs(table, currentFolder || undefined);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification, loadBlobs, currentFolder]);

  const createMetadataTable = useCallback(async (table: string) => {
    if (!activeConnection) return;

    try {
      await invoke<void>('create_blob_metadata_table', {
        connectionId: activeConnection.id,
        tableName: table,
      });

      addNotification({
        type: 'success',
        title: 'Table Created',
        message: `Metadata table for ${table} created successfully`,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Table Creation Failed',
        message: error.toString(),
      });
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
    loadBlobs,
    uploadFile,
    downloadBlob,
    downloadBlobsAsZip,
    deleteBlob,
    createMetadataTable,
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
