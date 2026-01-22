'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useActiveConnection } from './monkdb-context';
import { useNotifications } from './notification-context';
import { useUser } from './user-context';

// ============================================================================
// SQL Security Utilities
// ============================================================================

/**
 * Escapes SQL string literals by doubling single quotes.
 * Used for VALUES and WHERE clauses with string data.
 *
 * @param value - The string value to escape
 * @returns The escaped string safe for SQL embedding
 */
function escapeSqlString(value: string): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  // Double all single quotes for SQL string escaping
  return value.replace(/'/g, "''");
}

/**
 * Validates and escapes SQL identifiers (table names, column names).
 * Only allows alphanumeric characters, underscores, and hyphens.
 * Prevents SQL injection via table/column name manipulation.
 *
 * @param identifier - The identifier to validate and escape
 * @returns The safe identifier
 * @throws Error if identifier contains invalid characters
 */
function escapeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric, underscore, and hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}. Only alphanumeric characters, underscores, and hyphens are allowed.`);
  }
  return identifier;
}

/**
 * Safely constructs a metadata table name from a base table name.
 * Validates the table name to prevent injection attacks.
 *
 * @param tableName - The base BLOB table name
 * @returns The safe metadata table name
 */
function getMetadataTableName(tableName: string): string {
  const validated = escapeSqlIdentifier(tableName);
  return `${validated}_blob_metadata`;
}

// ============================================================================
// Authentication & Authorization Utilities (RBAC)
// ============================================================================

/**
 * Validates that a user is authenticated before performing operations.
 * Throws an error if the user is not authenticated.
 *
 * @param userId - The current user ID
 * @param operationName - Name of the operation being performed
 * @throws Error if user is not authenticated
 */
function requireAuthentication(userId: string | null, operationName: string): void {
  if (!userId || userId === 'anonymous') {
    throw new Error(`Authentication required to ${operationName}. Please log in.`);
  }
}

/**
 * Checks if a user has permission to modify a file based on ownership and role.
 * Supports RBAC with three roles:
 * - admin: Can modify any file
 * - user: Can modify their own files
 * - viewer: Cannot modify any files (read-only)
 *
 * @param userId - The current user ID
 * @param fileOwnerId - The ID of the user who owns the file
 * @param userRole - The current user's role
 * @returns true if user has permission, false otherwise
 */
function hasFilePermission(
  userId: string | null,
  fileOwnerId: string | null,
  userRole: 'admin' | 'user' | 'viewer'
): boolean {
  // Admins can modify any file
  if (userRole === 'admin') return true;

  // Viewers cannot modify any files
  if (userRole === 'viewer') return false;

  // Regular users can only modify their own files or files with no owner
  if (!userId) return false;
  if (!fileOwnerId) return true; // Files with no owner can be modified by anyone
  return userId === fileOwnerId;
}

/**
 * Format file size in bytes to human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// Type Definitions
// ============================================================================

export type SharePermission = 'view' | 'download';

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
  // File sharing features
  share_token: string | null;
  share_expires_at: string | null;
  share_password: string | null;
  share_access_count: number;
  share_permissions: SharePermission | null;
  is_public: boolean;
  // Versioning features
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

export type AuditAction =
  | 'upload'
  | 'download'
  | 'delete'
  | 'restore'
  | 'rename'
  | 'update_tags'
  | 'update_description'
  | 'toggle_favorite'
  | 'share'
  | 'unshare'
  | 'access_shared';

export interface AuditLogEntry {
  id: string;
  table_name: string;
  file_id: string | null;
  filename: string | null;
  action: AuditAction;
  user_id: string;
  user_role: string;
  timestamp: string;
  ip_address: string | null;
  details: Record<string, any> | null;
  success: boolean;
  error_message: string | null;
}

export type QuotaAlertLevel = 'info' | 'warning' | 'critical';

export interface QuotaSettings {
  maxSizeBytes: number | null; // null = unlimited
  warningThresholdPercent: number; // e.g., 80
  criticalThresholdPercent: number; // e.g., 90
  enableAlerts: boolean;
}

export interface QuotaUsage {
  currentSizeBytes: number;
  maxSizeBytes: number | null;
  usagePercent: number | null; // null if unlimited
  fileCount: number;
  alertLevel: QuotaAlertLevel | null;
  remainingBytes: number | null; // null if unlimited
}

export interface UserQuotaUsage extends QuotaUsage {
  userId: string;
  username: string;
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
  showFavoritesOnly: boolean;
  searchQuery: string;
  setShowTrashed: (show: boolean) => void;
  setShowFavoritesOnly: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
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
  // File sharing methods
  shareFile: (table: string, metadataRowId: string, permissions: SharePermission, expiresInDays?: number, password?: string) => Promise<string | null>;
  unshareFile: (table: string, metadataRowId: string) => Promise<void>;
  validateShareToken: (table: string, shareToken: string, password?: string) => Promise<BlobMetadata | null>;
  getSharedFile: (table: string, shareToken: string, password?: string) => Promise<{ metadata: BlobMetadata; blob: Blob } | null>;
  // Audit logging methods
  getAuditLogs: (table: string, filters?: { userId?: string; action?: AuditAction; startDate?: string; endDate?: string; limit?: number }) => Promise<AuditLogEntry[]>;
  getAuditSummary: (table: string) => Promise<any>;
  // Trash cleanup methods
  getTrashCleanupPreview: (table: string, daysOld?: number) => Promise<{ files: BlobMetadata[]; totalSize: number; count: number }>;
  cleanupOldTrashedFiles: (table: string, daysOld?: number) => Promise<{ deletedCount: number; freedSpace: number }>;
  // File versioning methods
  createNewVersion: (table: string, originalFileId: string, newFile: File) => Promise<string | null>;
  getFileVersionHistory: (table: string, fileId: string) => Promise<BlobMetadata[]>;
  restoreFileVersion: (table: string, versionId: string) => Promise<void>;
  deleteAllVersions: (table: string, fileId: string) => Promise<void>;
  // Search and filter methods
  getAllTags: (table: string) => Promise<string[]>;
  // Backup and recovery methods
  exportMetadata: (table: string, format: 'json' | 'sql') => Promise<string | null>;
  exportAllBlobs: (table: string) => Promise<void>;
  getBackupSummary: (table: string) => Promise<{ fileCount: number; totalSize: number; oldestFile: string; newestFile: string } | null>;
  // Storage quota and monitoring methods
  getQuotaSettings: (table: string) => Promise<QuotaSettings | null>;
  setQuotaSettings: (table: string, settings: QuotaSettings) => Promise<void>;
  getTableQuotaUsage: (table: string) => Promise<QuotaUsage | null>;
  getUserQuotaUsage: (table: string, userId: string) => Promise<UserQuotaUsage | null>;
  getAllUsersQuotaUsage: (table: string) => Promise<UserQuotaUsage[]>;
  checkQuotaBeforeUpload: (table: string, fileSize: number) => Promise<{ allowed: boolean; reason?: string; usage?: QuotaUsage }>;
}

const BlobContext = createContext<BlobContextValue | undefined>(undefined);

export function BlobProvider({ children }: { children: React.ReactNode }) {
  const activeConnection = useActiveConnection();
  const { addNotification } = useNotifications();
  const { userId, role, hasPermission } = useUser(); // Get current user ID, role, and permissions

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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        const metadataTable = getMetadataTableName(table);

        // First, check if table exists and migrate if needed
        const checkTableSql = `SELECT column_name FROM information_schema.columns WHERE table_name = '${escapeSqlString(metadataTable)}' AND table_schema = 'doc'`;
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
          whereClauses.push(`folder_path = '${escapeSqlString(folder)}'`);
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

        // Filter by favorites (only if column exists)
        const hasFavoriteColumn = existingColumns.includes('is_favorite');
        if (hasFavoriteColumn && showFavoritesOnly) {
          whereClauses.push(`is_favorite = true`);
        }

        // Full-text search across filename, description, and tags
        if (searchQuery && searchQuery.trim().length > 0) {
          const searchTerm = escapeSqlString(searchQuery.trim());
          const searchConditions: string[] = [];

          // Search in filename
          searchConditions.push(`filename LIKE '%${searchTerm}%'`);

          // Search in description (if column exists)
          const hasDescriptionColumn = existingColumns.includes('file_description');
          if (hasDescriptionColumn) {
            searchConditions.push(`file_description LIKE '%${searchTerm}%'`);
          }

          // Search in tags (if column exists)
          const hasTagsColumn = existingColumns.includes('tags');
          if (hasTagsColumn) {
            searchConditions.push(`ARRAY_TO_STRING(tags, ',') LIKE '%${searchTerm}%'`);
          }

          // Search in content type
          searchConditions.push(`content_type LIKE '%${searchTerm}%'`);

          whereClauses.push(`(${searchConditions.join(' OR ')})`);
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
  }, [activeConnection, addNotification, currentPage, pageSize, showTrashed, showFavoritesOnly, searchQuery]);

  const uploadFile = useCallback(async (table: string, file: File, folder?: string) => {
    if (!activeConnection) {
      addNotification({
        type: 'error',
        title: 'No Connection',
        message: 'Please connect to a database first',
      });
      return;
    }

    // Require authentication before upload
    try {
      requireAuthentication(userId, 'upload files');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    // Check role-based permission
    if (!hasPermission('upload_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to upload files.`,
      });
      return;
    }

    // Check quota before upload
    try {
      const quotaCheck = await checkQuotaBeforeUpload(table, file.size);
      if (!quotaCheck.allowed) {
        addNotification({
          type: 'error',
          title: 'Storage Quota Exceeded',
          message: quotaCheck.reason || 'Upload would exceed storage quota.',
        });
        return;
      }

      // Show warning if approaching quota
      if (quotaCheck.usage && quotaCheck.usage.alertLevel === 'warning') {
        addNotification({
          type: 'warning',
          title: 'Storage Warning',
          message: `Storage is at ${quotaCheck.usage.usagePercent?.toFixed(1)}% capacity. Consider cleaning up unused files.`,
        });
      } else if (quotaCheck.usage && quotaCheck.usage.alertLevel === 'critical') {
        addNotification({
          type: 'error',
          title: 'Storage Critical',
          message: `Storage is at ${quotaCheck.usage.usagePercent?.toFixed(1)}% capacity. Upload proceeding but cleanup is urgent.`,
        });
      }
    } catch (error: any) {
      console.error('[BlobUpload] Quota check failed:', error);
      // Continue with upload on quota check failure
    }

    console.log(`[BlobUpload] User ${userId} uploading file: ${file.name}`);

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
        const metadataTable = getMetadataTableName(table);

        const folderValue = folder ? `'${escapeSqlString(folder)}'` : 'NULL';
        const contentType = file.type || 'application/octet-stream';
        const uploadedByValue = userId ? `'${escapeSqlString(userId)}'` : 'NULL';
        const insertSql = `INSERT INTO ${metadataTable} (id, sha1_hash, filename, folder_path, file_size, content_type, uploaded_at, uploaded_by, metadata)
          VALUES ('${metadataId}', '${sha1Hash}', '${escapeSqlString(file.name)}', ${folderValue}, ${file.size}, '${escapeSqlString(contentType)}', CURRENT_TIMESTAMP, ${uploadedByValue}, NULL)`;

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

      // Log successful upload
      await logAudit(table, 'upload', result.id, file.name, true, {
        file_size: file.size,
        content_type: file.type,
        sha1_hash: result.sha1_hash,
        folder: folder || null,
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

      // Log failed upload
      await logAudit(table, 'upload', null, file.name, false, {
        file_size: file.size,
        content_type: file.type,
      }, error.toString());

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

    // Require authentication before delete
    try {
      requireAuthentication(userId, 'delete files');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    // Check role-based permission
    if (!hasPermission('delete_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to delete files.`,
      });
      return;
    }

    try {
      // Verify ownership before deleting
      const metadataTable = getMetadataTableName(table);
      const checkOwnershipSql = `SELECT uploaded_by FROM ${metadataTable} WHERE id = '${escapeSqlString(metadataRowId)}'`;

      const ownershipResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkOwnershipSql }),
      });

      if (ownershipResponse.ok) {
        const ownershipData = await ownershipResponse.json();
        const fileOwnerId = ownershipData.rows?.[0]?.[0];

        if (!hasFilePermission(userId, fileOwnerId, role)) {
          addNotification({
            type: 'error',
            title: 'Permission Denied',
            message: 'You do not have permission to delete this file. Only the file owner can delete it.',
          });
          console.warn(`[BlobStorage] User ${userId} attempted to delete file owned by ${fileOwnerId}`);
          return;
        }
      }

      console.log(`[BlobStorage] User ${userId} deleting file (permanent: ${permanent})`);

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
        const metadataTable = getMetadataTableName(table);

        if (permanent) {
          // Permanent delete - remove metadata and blob
          const deleteSql = `DELETE FROM ${metadataTable} WHERE id = '${escapeSqlString(metadataRowId)}'`;

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
          const deletedByValue = userId ? `'${escapeSqlString(userId)}'` : 'NULL';
          const updateSql = `UPDATE ${metadataTable}
            SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ${deletedByValue}
            WHERE id = '${escapeSqlString(metadataRowId)}'`;

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

    // Require authentication before rename
    try {
      requireAuthentication(userId, 'rename files');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      throw error;
    }

    // Check role-based permission
    if (!hasPermission('rename_files')) {
      const error = new Error(`Your role (${role}) does not have permission to rename files.`);
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: error.message,
      });
      throw error;
    }

    try {
      // Verify ownership before renaming
      const metadataTable = getMetadataTableName(table);
      const checkOwnershipSql = `SELECT uploaded_by FROM ${metadataTable} WHERE id = '${escapeSqlString(metadataRowId)}'`;

      const ownershipResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkOwnershipSql }),
      });

      if (ownershipResponse.ok) {
        const ownershipData = await ownershipResponse.json();
        const fileOwnerId = ownershipData.rows?.[0]?.[0];

        if (!hasFilePermission(userId, fileOwnerId, role)) {
          const error = new Error('You do not have permission to rename this file. Only the file owner can rename it.');
          addNotification({
            type: 'error',
            title: 'Permission Denied',
            message: error.message,
          });
          throw error;
        }
      }

      console.log(`[BlobStorage] User ${userId} renaming file to: ${newFilename}`);

      const isTauri = typeof window !== 'undefined' && window.__TAURI__;

      if (isTauri) {
        // Tauri mode - would need Rust implementation
        throw new Error('Rename not yet implemented for desktop mode');
      } else {
        // Browser mode - update filename in metadata table
        const updateSql = `UPDATE ${metadataTable} SET filename = '${escapeSqlString(newFilename)}' WHERE id = '${escapeSqlString(metadataRowId)}'`;

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

    // Require authentication
    try {
      requireAuthentication(userId, 'restore files');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    // Check role-based permission
    if (!hasPermission('restore_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to restore files.`,
      });
      return;
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Verify ownership
      const checkOwnershipSql = `SELECT uploaded_by FROM ${metadataTable} WHERE id = '${escapeSqlString(metadataRowId)}'`;
      const ownershipResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkOwnershipSql }),
      });

      if (ownershipResponse.ok) {
        const ownershipData = await ownershipResponse.json();
        const fileOwnerId = ownershipData.rows?.[0]?.[0];

        if (!hasFilePermission(userId, fileOwnerId, role)) {
          addNotification({
            type: 'error',
            title: 'Permission Denied',
            message: 'You can only restore your own files.',
          });
          return;
        }
      }

      const updateSql = `UPDATE ${metadataTable}
        SET deleted_at = NULL, deleted_by = NULL
        WHERE id = '${escapeSqlString(metadataRowId)}'`;

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
  }, [activeConnection, addNotification, loadBlobs, currentFolder, userId]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (table: string, metadataRowId: string, isFavorite: boolean) => {
    console.log('[toggleFavorite] Called with:', { table, metadataRowId, isFavorite });
    if (!activeConnection) {
      console.error('[toggleFavorite] No active connection');
      return;
    }

    // Require authentication
    try {
      requireAuthentication(userId, 'toggle favorites');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    // Check role-based permission
    if (!hasPermission('update_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to update files.`,
      });
      return;
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Verify ownership
      const checkOwnershipSql = `SELECT uploaded_by FROM ${metadataTable} WHERE id = '${escapeSqlString(metadataRowId)}'`;
      const ownershipResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkOwnershipSql }),
      });

      if (ownershipResponse.ok) {
        const ownershipData = await ownershipResponse.json();
        const fileOwnerId = ownershipData.rows?.[0]?.[0];

        if (!hasFilePermission(userId, fileOwnerId, role)) {
          addNotification({
            type: 'error',
            title: 'Permission Denied',
            message: 'You can only favorite your own files.',
          });
          return;
        }
      }

      const updateSql = `UPDATE ${metadataTable}
        SET is_favorite = ${!isFavorite}
        WHERE id = '${escapeSqlString(metadataRowId)}'`;

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

    // Require authentication
    try {
      requireAuthentication(userId, 'update tags');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    // Check role-based permission
    if (!hasPermission('update_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to update files.`,
      });
      return;
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Verify ownership
      const checkOwnershipSql = `SELECT uploaded_by FROM ${metadataTable} WHERE id = '${escapeSqlString(metadataRowId)}'`;
      const ownershipResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkOwnershipSql }),
      });

      if (ownershipResponse.ok) {
        const ownershipData = await ownershipResponse.json();
        const fileOwnerId = ownershipData.rows?.[0]?.[0];

        if (!hasFilePermission(userId, fileOwnerId, role)) {
          addNotification({
            type: 'error',
            title: 'Permission Denied',
            message: 'You can only update tags on your own files.',
          });
          return;
        }
      }

      // Properly escape each tag in the array
      const escapedTags = tags.map(tag => `'${escapeSqlString(tag)}'`);
      const tagsArray = tags.length > 0 ? `[${escapedTags.join(',')}]` : 'NULL';
      const updateSql = `UPDATE ${metadataTable}
        SET tags = ${tagsArray}
        WHERE id = '${escapeSqlString(metadataRowId)}'`;

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

    // Require authentication
    try {
      requireAuthentication(userId, 'update file description');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    // Check role-based permission
    if (!hasPermission('update_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to update files.`,
      });
      return;
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Verify ownership
      const checkOwnershipSql = `SELECT uploaded_by FROM ${metadataTable} WHERE id = '${escapeSqlString(metadataRowId)}'`;
      const ownershipResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkOwnershipSql }),
      });

      if (ownershipResponse.ok) {
        const ownershipData = await ownershipResponse.json();
        const fileOwnerId = ownershipData.rows?.[0]?.[0];

        if (!hasFilePermission(userId, fileOwnerId, role)) {
          addNotification({
            type: 'error',
            title: 'Permission Denied',
            message: 'You can only update descriptions for your own files.',
          });
          return;
        }
      }

      const updateSql = `UPDATE ${metadataTable}
        SET file_description = '${escapeSqlString(description)}'
        WHERE id = '${escapeSqlString(metadataRowId)}'`;

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
  }, [activeConnection, addNotification, loadBlobs, currentFolder, userId]);

  // Get storage analytics
  const getStorageAnalytics = useCallback(async (table: string) => {
    if (!activeConnection) return null;

    try {
      const metadataTable = getMetadataTableName(table);

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

  // ============================================================================
  // File Sharing Functions
  // ============================================================================

  /**
   * Generate a unique share token for file sharing
   */
  const generateShareToken = (): string => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    return `share_${timestamp}_${randomPart}${randomPart2}`;
  };

  /**
   * Share a file with a public link
   * @returns The share token if successful, null otherwise
   */
  const shareFile = useCallback(async (
    table: string,
    metadataRowId: string,
    permissions: SharePermission,
    expiresInDays?: number,
    password?: string
  ): Promise<string | null> => {
    console.log('[blob-context] shareFile called with:', { table, metadataRowId, permissions, expiresInDays });
    console.log('[blob-context] activeConnection:', !!activeConnection);
    console.log('[blob-context] userId:', userId);
    console.log('[blob-context] role:', role);

    if (!activeConnection) {
      console.error('[blob-context] No active connection');
      return null;
    }

    // Require authentication
    try {
      console.log('[blob-context] Checking authentication...');
      requireAuthentication(userId, 'share files');
      console.log('[blob-context] Authentication passed');
    } catch (error: any) {
      console.error('[blob-context] Authentication failed:', error);
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return null;
    }

    // Check role-based permission
    console.log('[blob-context] Checking permission for update_files...');
    if (!hasPermission('update_files')) {
      console.error('[blob-context] Permission denied for role:', role);
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to share files.`,
      });
      return null;
    }
    console.log('[blob-context] Permission check passed');

    try {
      const metadataTable = getMetadataTableName(table);

      // Verify ownership
      const checkOwnershipSql = `SELECT uploaded_by FROM ${metadataTable} WHERE id = '${escapeSqlString(metadataRowId)}'`;
      const ownershipResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkOwnershipSql }),
      });

      if (ownershipResponse.ok) {
        const ownershipData = await ownershipResponse.json();
        const fileOwnerId = ownershipData.rows?.[0]?.[0];

        if (!hasFilePermission(userId, fileOwnerId, role)) {
          addNotification({
            type: 'error',
            title: 'Permission Denied',
            message: 'You can only share your own files.',
          });
          return null;
        }
      }

      // Generate share token
      const shareToken = generateShareToken();

      // Calculate expiration date
      let expiresAt = 'NULL';
      if (expiresInDays && expiresInDays > 0) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiresInDays);
        expiresAt = `'${expiryDate.toISOString()}'`;
      }

      // Hash password if provided (simple escaping for now)
      const passwordValue = password ? `'${escapeSqlString(password)}'` : 'NULL';

      // Update file with share information
      const updateSql = `UPDATE ${metadataTable}
        SET
          share_token = '${escapeSqlString(shareToken)}',
          share_expires_at = ${expiresAt},
          share_password = ${passwordValue},
          share_permissions = '${escapeSqlString(permissions)}',
          is_public = ${!password}
        WHERE id = '${escapeSqlString(metadataRowId)}'`;

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
        throw new Error(`Failed to share file: ${response.status}`);
      }

      addNotification({
        type: 'success',
        title: 'File Shared',
        message: 'Share link created successfully',
      });

      await loadBlobs(table, currentFolder || undefined);
      return shareToken;
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Share Failed',
        message: error.toString(),
      });
      return null;
    }
  }, [activeConnection, addNotification, userId, role, hasPermission, loadBlobs, currentFolder]);

  /**
   * Remove share link from a file
   */
  const unshareFile = useCallback(async (table: string, metadataRowId: string) => {
    if (!activeConnection) return;

    // Require authentication
    try {
      requireAuthentication(userId, 'unshare files');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    // Check role-based permission
    if (!hasPermission('update_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to unshare files.`,
      });
      return;
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Verify ownership
      const checkOwnershipSql = `SELECT uploaded_by FROM ${metadataTable} WHERE id = '${escapeSqlString(metadataRowId)}'`;
      const ownershipResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkOwnershipSql }),
      });

      if (ownershipResponse.ok) {
        const ownershipData = await ownershipResponse.json();
        const fileOwnerId = ownershipData.rows?.[0]?.[0];

        if (!hasFilePermission(userId, fileOwnerId, role)) {
          addNotification({
            type: 'error',
            title: 'Permission Denied',
            message: 'You can only unshare your own files.',
          });
          return;
        }
      }

      // Remove share information
      const updateSql = `UPDATE ${metadataTable}
        SET
          share_token = NULL,
          share_expires_at = NULL,
          share_password = NULL,
          share_permissions = NULL,
          is_public = false
        WHERE id = '${escapeSqlString(metadataRowId)}'`;

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
        throw new Error(`Failed to unshare file: ${response.status}`);
      }

      addNotification({
        type: 'success',
        title: 'File Unshared',
        message: 'Share link removed successfully',
      });

      await loadBlobs(table, currentFolder || undefined);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Unshare Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, addNotification, userId, role, hasPermission, loadBlobs, currentFolder]);

  /**
   * Validate a share token and return file metadata if valid
   */
  const validateShareToken = useCallback(async (
    table: string,
    shareToken: string,
    password?: string
  ): Promise<BlobMetadata | null> => {
    if (!activeConnection) return null;

    try {
      const metadataTable = getMetadataTableName(table);

      // Get file metadata by share token
      const querySql = `SELECT * FROM ${metadataTable}
        WHERE share_token = '${escapeSqlString(shareToken)}'
        AND deleted_at IS NULL`;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: querySql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to validate share token: ${response.status}`);
      }

      const data = await response.json();
      const row = data.rows?.[0];

      if (!row) {
        addNotification({
          type: 'error',
          title: 'Invalid Link',
          message: 'This share link is invalid or has been removed.',
        });
        return null;
      }

      // Parse metadata
      const metadata: BlobMetadata = {
        id: row[0],
        sha1_hash: row[1],
        filename: row[2],
        folder_path: row[3],
        file_size: row[4],
        content_type: row[5],
        uploaded_at: row[6],
        uploaded_by: row[7],
        metadata: row[8] ? JSON.parse(row[8]) : null,
        deleted_at: row[9],
        deleted_by: row[10],
        thumbnail_hash: row[11],
        tags: row[12] ? JSON.parse(row[12]) : null,
        is_favorite: row[13],
        download_count: row[14],
        last_accessed_at: row[15],
        share_token: row[16],
        share_expires_at: row[17],
        share_password: row[18],
        share_access_count: row[19],
        share_permissions: row[20],
        is_public: row[21],
        parent_version_id: row[22],
        version_number: row[23],
        file_description: row[24],
      };

      // Check expiration
      if (metadata.share_expires_at) {
        const expiryDate = new Date(metadata.share_expires_at);
        if (expiryDate < new Date()) {
          addNotification({
            type: 'error',
            title: 'Link Expired',
            message: 'This share link has expired.',
          });
          return null;
        }
      }

      // Check password if required
      if (metadata.share_password) {
        if (!password || password !== metadata.share_password) {
          addNotification({
            type: 'error',
            title: 'Password Required',
            message: 'This shared file is password protected.',
          });
          return null;
        }
      }

      // Increment access count
      const incrementSql = `UPDATE ${metadataTable}
        SET share_access_count = share_access_count + 1,
            last_accessed_at = CURRENT_TIMESTAMP
        WHERE share_token = '${escapeSqlString(shareToken)}'`;

      await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: incrementSql }),
      });

      return metadata;
    } catch (error: any) {
      console.error('[BlobStorage] Failed to validate share token:', error);
      return null;
    }
  }, [activeConnection, addNotification]);

  /**
   * Get shared file with blob data
   */
  const getSharedFile = useCallback(async (
    table: string,
    shareToken: string,
    password?: string
  ): Promise<{ metadata: BlobMetadata; blob: Blob } | null> => {
    if (!activeConnection) return null;

    try {
      // Validate token first
      const metadata = await validateShareToken(table, shareToken, password);
      if (!metadata) return null;

      // Check download permission
      if (metadata.share_permissions === 'view') {
        addNotification({
          type: 'error',
          title: 'Download Not Allowed',
          message: 'This shared file is view-only and cannot be downloaded.',
        });
        return null;
      }

      // Download the blob
      const isTauri = typeof window !== 'undefined' && window.__TAURI__;

      if (isTauri) {
        const blobData = await invoke<number[]>('download_blob', {
          connectionId: activeConnection.id,
          table: escapeSqlIdentifier(table),
          sha1Hash: metadata.sha1_hash,
        });

        const uint8Array = new Uint8Array(blobData);
        const blob = new Blob([uint8Array], { type: metadata.content_type });

        return { metadata, blob };
      } else {
        // Browser mode
        const response = await fetch('/api/blob/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: JSON.stringify({
            table: escapeSqlIdentifier(table),
            sha1Hash: metadata.sha1_hash,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to download blob: ${response.status}`);
        }

        const blob = await response.blob();
        return { metadata, blob };
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: error.toString(),
      });
      return null;
    }
  }, [activeConnection, addNotification, validateShareToken]);

  // ============================================================================
  // Audit Logging Functions
  // ============================================================================

  /**
   * Get the audit log table name for a given BLOB table
   */
  const getAuditLogTableName = (tableName: string): string => {
    const validated = escapeSqlIdentifier(tableName);
    return `${validated}_blob_audit_log`;
  };

  /**
   * Log an audit entry for a BLOB operation
   */
  const logAudit = useCallback(async (
    table: string,
    action: AuditAction,
    fileId: string | null,
    filename: string | null,
    success: boolean,
    details?: Record<string, any>,
    errorMessage?: string
  ) => {
    if (!activeConnection || !userId) return;

    try {
      const auditTable = getAuditLogTableName(table);
      const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const detailsJson = details ? `'${escapeSqlString(JSON.stringify(details))}'` : 'NULL';
      const fileIdValue = fileId ? `'${escapeSqlString(fileId)}'` : 'NULL';
      const filenameValue = filename ? `'${escapeSqlString(filename)}'` : 'NULL';
      const errorValue = errorMessage ? `'${escapeSqlString(errorMessage)}'` : 'NULL';

      const insertSql = `INSERT INTO ${auditTable}
        (id, table_name, file_id, filename, action, user_id, user_role, timestamp, ip_address, details, success, error_message)
        VALUES (
          '${escapeSqlString(id)}',
          '${escapeSqlString(table)}',
          ${fileIdValue},
          ${filenameValue},
          '${escapeSqlString(action)}',
          '${escapeSqlString(userId)}',
          '${escapeSqlString(role)}',
          CURRENT_TIMESTAMP,
          NULL,
          ${detailsJson},
          ${success},
          ${errorValue}
        )`;

      await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: insertSql }),
      });
    } catch (error: any) {
      console.error('[BlobStorage] Failed to log audit entry:', error);
      // Don't throw - audit logging shouldn't break the main operation
    }
  }, [activeConnection, userId, role]);

  /**
   * Create audit log table for a BLOB table
   */
  const createAuditLogTable = useCallback(async (table: string) => {
    if (!activeConnection) return;

    try {
      const auditTable = getAuditLogTableName(table);

      const createSql = `CREATE TABLE IF NOT EXISTS ${auditTable} (
        id VARCHAR(100) PRIMARY KEY,
        table_name VARCHAR(255) NOT NULL,
        file_id VARCHAR(100),
        filename VARCHAR(500),
        action VARCHAR(50) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        details TEXT,
        success BOOLEAN DEFAULT true,
        error_message TEXT
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
        throw new Error(`Failed to create audit log table: ${response.status}`);
      }

      console.log(`[BlobStorage] Created audit log table: ${auditTable}`);
    } catch (error: any) {
      console.error('[BlobStorage] Failed to create audit log table:', error);
    }
  }, [activeConnection]);

  /**
   * Get audit logs with optional filtering
   */
  const getAuditLogs = useCallback(async (
    table: string,
    filters?: {
      userId?: string;
      action?: AuditAction;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<AuditLogEntry[]> => {
    if (!activeConnection) return [];

    try {
      const auditTable = getAuditLogTableName(table);

      // Check if audit table exists
      const checkTableSql = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = '${escapeSqlString(auditTable)}'
      `;

      const checkResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkTableSql }),
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (!checkData.rows || checkData.rows.length === 0) {
          // Table doesn't exist, create it
          await createAuditLogTable(table);
          // Return empty array since there are no logs yet
          return [];
        }
      }

      const limit = filters?.limit || 100;

      // Build WHERE clause
      const conditions: string[] = [];
      if (filters?.userId) {
        conditions.push(`user_id = '${escapeSqlString(filters.userId)}'`);
      }
      if (filters?.action) {
        conditions.push(`action = '${escapeSqlString(filters.action)}'`);
      }
      if (filters?.startDate) {
        conditions.push(`timestamp >= '${escapeSqlString(filters.startDate)}'`);
      }
      if (filters?.endDate) {
        conditions.push(`timestamp <= '${escapeSqlString(filters.endDate)}'`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const querySql = `SELECT * FROM ${auditTable}
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ${limit}`;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: querySql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get audit logs: ${response.status}`);
      }

      const data = await response.json();

      return data.rows?.map((row: any[]) => ({
        id: row[0],
        table_name: row[1],
        file_id: row[2],
        filename: row[3],
        action: row[4],
        user_id: row[5],
        user_role: row[6],
        timestamp: row[7],
        ip_address: row[8],
        details: row[9] ? JSON.parse(row[9]) : null,
        success: row[10],
        error_message: row[11],
      })) || [];
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get audit logs:', error);
      return [];
    }
  }, [activeConnection, createAuditLogTable]);

  /**
   * Get audit log summary statistics
   */
  const getAuditSummary = useCallback(async (table: string) => {
    if (!activeConnection) return null;

    try {
      const auditTable = getAuditLogTableName(table);

      // Check if audit table exists
      const checkTableSql = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = '${escapeSqlString(auditTable)}'
      `;

      const checkResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkTableSql }),
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (!checkData.rows || checkData.rows.length === 0) {
          // Table doesn't exist, return default summary
          return {
            total_events: 0,
            success_rate: 100,
            unique_users: 0,
            failed_events: 0,
          };
        }
      }

      // Get overall statistics
      const statsSql = `
        SELECT
          COUNT(*) as total_operations,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_operations,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_operations,
          COUNT(DISTINCT user_id) as unique_users,
          MIN(timestamp) as first_activity,
          MAX(timestamp) as last_activity
        FROM ${auditTable}
      `;

      const statsResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: statsSql }),
      });

      const statsData = await statsResponse.json();
      const statsRow = statsData.rows?.[0];

      // Get action breakdown
      const actionsSql = `
        SELECT action, COUNT(*) as count
        FROM ${auditTable}
        GROUP BY action
        ORDER BY count DESC
      `;

      const actionsResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: actionsSql }),
      });

      const actionsData = await actionsResponse.json();

      // Get top users
      const usersSql = `
        SELECT user_id, COUNT(*) as operation_count
        FROM ${auditTable}
        GROUP BY user_id
        ORDER BY operation_count DESC
        LIMIT 10
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

      // Get recent failures
      const failuresSql = `
        SELECT action, filename, error_message, timestamp
        FROM ${auditTable}
        WHERE success = false
        ORDER BY timestamp DESC
        LIMIT 20
      `;

      const failuresResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: failuresSql }),
      });

      const failuresData = await failuresResponse.json();

      return {
        totalOperations: statsRow?.[0] || 0,
        successfulOperations: statsRow?.[1] || 0,
        failedOperations: statsRow?.[2] || 0,
        uniqueUsers: statsRow?.[3] || 0,
        firstActivity: statsRow?.[4],
        lastActivity: statsRow?.[5],
        actionBreakdown: actionsData.rows?.map((r: any[]) => ({
          action: r[0],
          count: r[1],
        })) || [],
        topUsers: usersData.rows?.map((r: any[]) => ({
          userId: r[0],
          operationCount: r[1],
        })) || [],
        recentFailures: failuresData.rows?.map((r: any[]) => ({
          action: r[0],
          filename: r[1],
          errorMessage: r[2],
          timestamp: r[3],
        })) || [],
      };
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get audit summary:', error);
      return null;
    }
  }, [activeConnection]);

  // ============================================================================
  // Trash Cleanup Functions
  // ============================================================================

  /**
   * Get a preview of files that would be cleaned up
   * @param table - The BLOB table name
   * @param daysOld - Number of days a file must be in trash before cleanup (default: 30)
   */
  const getTrashCleanupPreview = useCallback(async (
    table: string,
    daysOld: number = 30
  ): Promise<{ files: BlobMetadata[]; totalSize: number; count: number }> => {
    if (!activeConnection) {
      return { files: [], totalSize: 0, count: 0 };
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Find files deleted more than {daysOld} days ago
      const querySql = `
        SELECT *
        FROM ${metadataTable}
        WHERE deleted_at IS NOT NULL
        AND deleted_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld}' DAY
        ORDER BY deleted_at ASC
      `;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: querySql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to preview cleanup: ${response.status}`);
      }

      const data = await response.json();
      const files: BlobMetadata[] = data.rows?.map((row: any[]) => ({
        id: row[0],
        sha1_hash: row[1],
        filename: row[2],
        folder_path: row[3],
        file_size: row[4],
        content_type: row[5],
        uploaded_at: row[6],
        uploaded_by: row[7],
        metadata: row[8] ? JSON.parse(row[8]) : null,
        deleted_at: row[9],
        deleted_by: row[10],
        thumbnail_hash: row[11],
        tags: row[12] ? JSON.parse(row[12]) : null,
        is_favorite: row[13],
        download_count: row[14],
        last_accessed_at: row[15],
        share_token: row[16],
        share_expires_at: row[17],
        share_password: row[18],
        share_access_count: row[19],
        share_permissions: row[20],
        is_public: row[21],
        parent_version_id: row[22],
        version_number: row[23],
        file_description: row[24],
      })) || [];

      const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);

      return {
        files,
        totalSize,
        count: files.length,
      };
    } catch (error: any) {
      console.error('[BlobStorage] Failed to preview cleanup:', error);
      return { files: [], totalSize: 0, count: 0 };
    }
  }, [activeConnection]);

  /**
   * Permanently delete files that have been in trash for more than the specified days
   * @param table - The BLOB table name
   * @param daysOld - Number of days a file must be in trash before cleanup (default: 30)
   * @returns Object with deletedCount and freedSpace
   */
  const cleanupOldTrashedFiles = useCallback(async (
    table: string,
    daysOld: number = 30
  ): Promise<{ deletedCount: number; freedSpace: number }> => {
    if (!activeConnection) {
      return { deletedCount: 0, freedSpace: 0 };
    }

    // Require authentication
    try {
      requireAuthentication(userId, 'cleanup trash');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return { deletedCount: 0, freedSpace: 0 };
    }

    // Check role-based permission (only admins can run cleanup)
    if (role !== 'admin') {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only administrators can run trash cleanup.',
      });
      return { deletedCount: 0, freedSpace: 0 };
    }

    try {
      // Get preview of what will be deleted
      const preview = await getTrashCleanupPreview(table, daysOld);

      if (preview.count === 0) {
        addNotification({
          type: 'info',
          title: 'No Files to Clean',
          message: `No files have been in trash for more than ${daysOld} days.`,
        });
        return { deletedCount: 0, freedSpace: 0 };
      }

      const metadataTable = getMetadataTableName(table);
      const isTauri = typeof window !== 'undefined' && window.__TAURI__;

      let deletedCount = 0;
      let freedSpace = 0;

      // Delete each file permanently
      for (const file of preview.files) {
        try {
          // Delete the actual BLOB
          if (isTauri) {
            await invoke<void>('delete_blob', {
              connectionId: activeConnection.id,
              table: escapeSqlIdentifier(table),
              sha1Hash: file.sha1_hash,
            });
          } else {
            const deleteResponse = await fetch(`/api/blob/${table}/${file.sha1_hash}`, {
              method: 'DELETE',
              headers: {
                'x-monkdb-host': activeConnection.config.host,
                'x-monkdb-port': activeConnection.config.port.toString(),
              },
            });

            if (!deleteResponse.ok) {
              console.warn(`[BlobStorage] Failed to delete BLOB ${file.sha1_hash}: ${deleteResponse.status}`);
            }
          }

          // Delete metadata record
          const deleteMetadataSql = `DELETE FROM ${metadataTable} WHERE id = '${escapeSqlString(file.id)}'`;
          await fetch('/api/sql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-monkdb-host': activeConnection.config.host,
              'x-monkdb-port': activeConnection.config.port.toString(),
            },
            body: JSON.stringify({ stmt: deleteMetadataSql }),
          });

          deletedCount++;
          freedSpace += file.file_size;

          // Log cleanup action
          await logAudit(table, 'delete', file.id, file.filename, true, {
            cleanup: true,
            days_old: daysOld,
            file_size: file.file_size,
            deleted_at: file.deleted_at,
          });
        } catch (fileError: any) {
          console.error(`[BlobStorage] Failed to cleanup file ${file.filename}:`, fileError);

          // Log failed cleanup
          await logAudit(table, 'delete', file.id, file.filename, false, {
            cleanup: true,
            days_old: daysOld,
          }, fileError.toString());
        }
      }

      // Format freed space
      const freedSpaceMB = (freedSpace / (1024 * 1024)).toFixed(2);

      addNotification({
        type: 'success',
        title: 'Cleanup Complete',
        message: `Permanently deleted ${deletedCount} file(s), freed ${freedSpaceMB} MB`,
      });

      // Reload blobs if we're viewing this table
      if (currentTable === table) {
        await loadBlobs(table, currentFolder || undefined);
      }

      return { deletedCount, freedSpace };
    } catch (error: any) {
      console.error('[BlobStorage] Cleanup failed:', error);
      addNotification({
        type: 'error',
        title: 'Cleanup Failed',
        message: error.toString(),
      });
      return { deletedCount: 0, freedSpace: 0 };
    }
  }, [activeConnection, userId, role, addNotification, getTrashCleanupPreview, logAudit, currentTable, loadBlobs, currentFolder]);

  // ============================================================================
  // File Versioning Functions
  // ============================================================================

  /**
   * Create a new version of an existing file
   * @param table - The BLOB table name
   * @param originalFileId - The ID of the current/original file
   * @param newFile - The new file content
   * @returns The ID of the new version, or null if failed
   */
  const createNewVersion = useCallback(async (
    table: string,
    originalFileId: string,
    newFile: File
  ): Promise<string | null> => {
    if (!activeConnection) return null;

    // Require authentication
    try {
      requireAuthentication(userId, 'create file version');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return null;
    }

    // Check role-based permission
    if (!hasPermission('upload_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to create file versions.`,
      });
      return null;
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Get original file metadata
      const originalSql = `SELECT * FROM ${metadataTable} WHERE id = '${escapeSqlString(originalFileId)}'`;
      const originalResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: originalSql }),
      });

      if (!originalResponse.ok) {
        throw new Error('Failed to fetch original file metadata');
      }

      const originalData = await originalResponse.json();
      const originalRow = originalData.rows?.[0];

      if (!originalRow) {
        throw new Error('Original file not found');
      }

      // Verify ownership
      const fileOwnerId = originalRow[7]; // uploaded_by
      if (!hasFilePermission(userId, fileOwnerId, role)) {
        addNotification({
          type: 'error',
          title: 'Permission Denied',
          message: 'You can only create versions of your own files.',
        });
        return null;
      }

      const originalFilename = originalRow[2];
      const originalFolder = originalRow[3];
      const currentVersionNumber = originalRow[23] || 1;

      // Read new file content
      const arrayBuffer = await newFile.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      // Calculate SHA-1 hash
      const hashBuffer = await crypto.subtle.digest('SHA-1', fileBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha1Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const isTauri = typeof window !== 'undefined' && window.__TAURI__;
      let result: { id: string; sha1_hash: string };

      // Upload the new version BLOB
      if (isTauri) {
        result = await invoke('upload_blob', {
          request: {
            connection_id: activeConnection.id,
            table_name: table,
            file_content: Array.from(fileBytes),
            filename: originalFilename,
            folder_path: originalFolder,
            content_type: newFile.type || 'application/octet-stream',
            metadata: null,
          },
        });
      } else {
        // Upload blob via proxy
        const proxyUrl = `/api/blob/${table}/${sha1Hash}`;
        const uploadResponse = await fetch(proxyUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': newFile.type || 'application/octet-stream',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: fileBytes,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        // Insert metadata for new version
        const newVersionId = crypto.randomUUID();
        const folderValue = originalFolder ? `'${escapeSqlString(originalFolder)}'` : 'NULL';
        const uploadedByValue = userId ? `'${escapeSqlString(userId)}'` : 'NULL';

        const insertSql = `INSERT INTO ${metadataTable}
          (id, sha1_hash, filename, folder_path, file_size, content_type, uploaded_at, uploaded_by, metadata, parent_version_id, version_number)
          VALUES (
            '${newVersionId}',
            '${sha1Hash}',
            '${escapeSqlString(originalFilename)}',
            ${folderValue},
            ${newFile.size},
            '${escapeSqlString(newFile.type || 'application/octet-stream')}',
            CURRENT_TIMESTAMP,
            ${uploadedByValue},
            NULL,
            '${escapeSqlString(originalFileId)}',
            ${currentVersionNumber + 1}
          )`;

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
          throw new Error('Failed to insert version metadata');
        }

        result = {
          id: newVersionId,
          sha1_hash: sha1Hash,
        };
      }

      addNotification({
        type: 'success',
        title: 'Version Created',
        message: `New version ${currentVersionNumber + 1} created successfully`,
      });

      // Log version creation
      await logAudit(table, 'upload', result.id, originalFilename, true, {
        version_number: currentVersionNumber + 1,
        parent_version_id: originalFileId,
        file_size: newFile.size,
      });

      await loadBlobs(table, originalFolder || undefined);
      return result.id;
    } catch (error: any) {
      console.error('[BlobStorage] Failed to create version:', error);
      addNotification({
        type: 'error',
        title: 'Version Creation Failed',
        message: error.toString(),
      });
      return null;
    }
  }, [activeConnection, userId, role, hasPermission, addNotification, logAudit, loadBlobs]);

  /**
   * Get version history for a file
   * @param table - The BLOB table name
   * @param fileId - The ID of any version of the file
   * @returns Array of all versions sorted by version number
   */
  const getFileVersionHistory = useCallback(async (
    table: string,
    fileId: string
  ): Promise<BlobMetadata[]> => {
    if (!activeConnection) return [];

    try {
      const metadataTable = getMetadataTableName(table);

      // First, get the file to find its root/parent
      const fileSql = `SELECT parent_version_id FROM ${metadataTable} WHERE id = '${escapeSqlString(fileId)}'`;
      const fileResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: fileSql }),
      });

      const fileData = await fileResponse.json();
      const parentVersionId = fileData.rows?.[0]?.[0];

      // Find the root version (the one with no parent)
      let rootId = fileId;
      if (parentVersionId) {
        // This is a version, find the root
        const rootSql = `
          WITH RECURSIVE version_tree AS (
            SELECT id, parent_version_id
            FROM ${metadataTable}
            WHERE id = '${escapeSqlString(fileId)}'
            UNION ALL
            SELECT m.id, m.parent_version_id
            FROM ${metadataTable} m
            INNER JOIN version_tree vt ON m.id = vt.parent_version_id
          )
          SELECT id FROM version_tree WHERE parent_version_id IS NULL
        `;

        const rootResponse = await fetch('/api/sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-monkdb-host': activeConnection.config.host,
            'x-monkdb-port': activeConnection.config.port.toString(),
          },
          body: JSON.stringify({ stmt: rootSql }),
        });

        if (rootResponse.ok) {
          const rootData = await rootResponse.json();
          rootId = rootData.rows?.[0]?.[0] || fileId;
        }
      }

      // Get all versions (root + descendants)
      const versionsSql = `
        SELECT * FROM ${metadataTable}
        WHERE id = '${escapeSqlString(rootId)}'
        OR parent_version_id = '${escapeSqlString(rootId)}'
        ORDER BY version_number ASC
      `;

      const versionsResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: versionsSql }),
      });

      if (!versionsResponse.ok) {
        throw new Error('Failed to fetch version history');
      }

      const versionsData = await versionsResponse.json();
      const versions: BlobMetadata[] = versionsData.rows?.map((row: any[]) => ({
        id: row[0],
        sha1_hash: row[1],
        filename: row[2],
        folder_path: row[3],
        file_size: row[4],
        content_type: row[5],
        uploaded_at: row[6],
        uploaded_by: row[7],
        metadata: row[8] ? JSON.parse(row[8]) : null,
        deleted_at: row[9],
        deleted_by: row[10],
        thumbnail_hash: row[11],
        tags: row[12] ? JSON.parse(row[12]) : null,
        is_favorite: row[13],
        download_count: row[14],
        last_accessed_at: row[15],
        share_token: row[16],
        share_expires_at: row[17],
        share_password: row[18],
        share_access_count: row[19],
        share_permissions: row[20],
        is_public: row[21],
        parent_version_id: row[22],
        version_number: row[23],
        file_description: row[24],
      })) || [];

      return versions;
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get version history:', error);
      return [];
    }
  }, [activeConnection]);

  /**
   * Restore a file to a previous version
   * @param table - The BLOB table name
   * @param versionId - The ID of the version to restore
   */
  const restoreFileVersion = useCallback(async (
    table: string,
    versionId: string
  ): Promise<void> => {
    if (!activeConnection) return;

    // Require authentication
    try {
      requireAuthentication(userId, 'restore file version');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    // Check role-based permission
    if (!hasPermission('restore_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to restore file versions.`,
      });
      return;
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Get the version to restore
      const versionSql = `SELECT * FROM ${metadataTable} WHERE id = '${escapeSqlString(versionId)}'`;
      const versionResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: versionSql }),
      });

      const versionData = await versionResponse.json();
      const versionRow = versionData.rows?.[0];

      if (!versionRow) {
        throw new Error('Version not found');
      }

      // Verify ownership
      const fileOwnerId = versionRow[7];
      if (!hasFilePermission(userId, fileOwnerId, role)) {
        addNotification({
          type: 'error',
          title: 'Permission Denied',
          message: 'You can only restore versions of your own files.',
        });
        return;
      }

      const versionFilename = versionRow[2];
      const versionNumber = versionRow[23];

      addNotification({
        type: 'success',
        title: 'Version Restored',
        message: `Restored to version ${versionNumber} of ${versionFilename}`,
      });

      // Log restoration
      await logAudit(table, 'restore', versionId, versionFilename, true, {
        restored_version: versionNumber,
      });

      await loadBlobs(table, versionRow[3] || undefined);
    } catch (error: any) {
      console.error('[BlobStorage] Failed to restore version:', error);
      addNotification({
        type: 'error',
        title: 'Restore Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, userId, role, hasPermission, addNotification, logAudit, loadBlobs]);

  /**
   * Delete all versions of a file
   * @param table - The BLOB table name
   * @param fileId - The ID of any version of the file
   */
  const deleteAllVersions = useCallback(async (
    table: string,
    fileId: string
  ): Promise<void> => {
    if (!activeConnection) return;

    // Require authentication
    try {
      requireAuthentication(userId, 'delete all file versions');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    // Check role-based permission
    if (!hasPermission('delete_files')) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: `Your role (${role}) does not have permission to delete files.`,
      });
      return;
    }

    try {
      // Get all versions
      const versions = await getFileVersionHistory(table, fileId);

      if (versions.length === 0) {
        throw new Error('No versions found');
      }

      // Verify ownership of the first version
      const firstVersion = versions[0];
      if (!hasFilePermission(userId, firstVersion.uploaded_by, role)) {
        addNotification({
          type: 'error',
          title: 'Permission Denied',
          message: 'You can only delete your own files.',
        });
        return;
      }

      // Delete all versions
      let deletedCount = 0;
      for (const version of versions) {
        // Use the existing deleteBlob function
        await deleteBlob(table, version.sha1_hash, version.id, true);
        deletedCount++;
      }

      addNotification({
        type: 'success',
        title: 'All Versions Deleted',
        message: `Deleted ${deletedCount} version(s) of ${firstVersion.filename}`,
      });

      await loadBlobs(table, firstVersion.folder_path || undefined);
    } catch (error: any) {
      console.error('[BlobStorage] Failed to delete all versions:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, userId, role, hasPermission, addNotification, getFileVersionHistory, deleteBlob, loadBlobs]);

  // ============================================================================
  // Search and Filter Functions
  // ============================================================================

  /**
   * Get all unique tags from all files for autocomplete
   * @param table - The BLOB table name
   * @returns Array of unique tag strings
   */
  const getAllTags = useCallback(async (table: string): Promise<string[]> => {
    if (!activeConnection) return [];

    try {
      const metadataTable = getMetadataTableName(table);

      // Get all tags from all files
      const tagsSql = `
        SELECT DISTINCT UNNEST(tags) as tag
        FROM ${metadataTable}
        WHERE tags IS NOT NULL
        AND deleted_at IS NULL
        ORDER BY tag ASC
      `;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: tagsSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get tags: ${response.status}`);
      }

      const data = await response.json();
      const tags = data.rows?.map((row: any[]) => row[0]).filter(Boolean) || [];

      return tags;
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get tags:', error);
      return [];
    }
  }, [activeConnection]);

  // ============================================================================
  // Backup and Recovery Functions
  // ============================================================================

  /**
   * Export metadata for all files in a table
   * @param table - The BLOB table name
   * @param format - Export format (json or sql)
   * @returns The exported data as a string
   */
  const exportMetadata = useCallback(async (
    table: string,
    format: 'json' | 'sql'
  ): Promise<string | null> => {
    if (!activeConnection) return null;

    // Require authentication
    try {
      requireAuthentication(userId, 'export metadata');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return null;
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Get all metadata
      const querySql = `SELECT * FROM ${metadataTable} ORDER BY uploaded_at ASC`;
      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: querySql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to export metadata: ${response.status}`);
      }

      const data = await response.json();
      const metadata: BlobMetadata[] = data.rows?.map((row: any[]) => ({
        id: row[0],
        sha1_hash: row[1],
        filename: row[2],
        folder_path: row[3],
        file_size: row[4],
        content_type: row[5],
        uploaded_at: row[6],
        uploaded_by: row[7],
        metadata: row[8] ? JSON.parse(row[8]) : null,
        deleted_at: row[9],
        deleted_by: row[10],
        thumbnail_hash: row[11],
        tags: row[12] ? JSON.parse(row[12]) : null,
        is_favorite: row[13],
        download_count: row[14],
        last_accessed_at: row[15],
        share_token: row[16],
        share_expires_at: row[17],
        share_password: row[18],
        share_access_count: row[19],
        share_permissions: row[20],
        is_public: row[21],
        parent_version_id: row[22],
        version_number: row[23],
        file_description: row[24],
      })) || [];

      let exportData: string;

      if (format === 'json') {
        // Export as JSON
        exportData = JSON.stringify({
          table: table,
          exported_at: new Date().toISOString(),
          exported_by: userId,
          file_count: metadata.length,
          files: metadata,
        }, null, 2);
      } else {
        // Export as SQL INSERT statements
        const sqlStatements: string[] = [];
        sqlStatements.push(`-- BLOB Metadata Backup for table: ${table}`);
        sqlStatements.push(`-- Exported at: ${new Date().toISOString()}`);
        sqlStatements.push(`-- Total files: ${metadata.length}`);
        sqlStatements.push('');

        for (const file of metadata) {
          const values = [
            `'${escapeSqlString(file.id)}'`,
            `'${escapeSqlString(file.sha1_hash)}'`,
            `'${escapeSqlString(file.filename)}'`,
            file.folder_path ? `'${escapeSqlString(file.folder_path)}'` : 'NULL',
            file.file_size,
            `'${escapeSqlString(file.content_type)}'`,
            `'${file.uploaded_at}'`,
            file.uploaded_by ? `'${escapeSqlString(file.uploaded_by)}'` : 'NULL',
            file.metadata ? `'${escapeSqlString(JSON.stringify(file.metadata))}'` : 'NULL',
            file.deleted_at ? `'${file.deleted_at}'` : 'NULL',
            file.deleted_by ? `'${escapeSqlString(file.deleted_by)}'` : 'NULL',
            file.thumbnail_hash ? `'${escapeSqlString(file.thumbnail_hash)}'` : 'NULL',
            file.tags ? `ARRAY[${file.tags.map(t => `'${escapeSqlString(t)}'`).join(', ')}]` : 'NULL',
            file.is_favorite ? 'TRUE' : 'FALSE',
            file.download_count,
            file.last_accessed_at ? `'${file.last_accessed_at}'` : 'NULL',
            file.share_token ? `'${escapeSqlString(file.share_token)}'` : 'NULL',
            file.share_expires_at ? `'${file.share_expires_at}'` : 'NULL',
            file.share_password ? `'${escapeSqlString(file.share_password)}'` : 'NULL',
            file.share_access_count,
            file.share_permissions ? `'${escapeSqlString(file.share_permissions)}'` : 'NULL',
            file.is_public ? 'TRUE' : 'FALSE',
            file.parent_version_id ? `'${escapeSqlString(file.parent_version_id)}'` : 'NULL',
            file.version_number,
            file.file_description ? `'${escapeSqlString(file.file_description)}'` : 'NULL',
          ];

          sqlStatements.push(
            `INSERT INTO ${metadataTable} VALUES (${values.join(', ')});`
          );
        }

        exportData = sqlStatements.join('\n');
      }

      // Create download
      const blob = new Blob([exportData], {
        type: format === 'json' ? 'application/json' : 'text/plain',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${table}_metadata_backup_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addNotification({
        type: 'success',
        title: 'Metadata Exported',
        message: `Exported ${metadata.length} file(s) as ${format.toUpperCase()}`,
      });

      // Log export
      await logAudit(table, 'download', null, null, true, {
        export_type: 'metadata',
        format: format,
        file_count: metadata.length,
      });

      return exportData;
    } catch (error: any) {
      console.error('[BlobStorage] Failed to export metadata:', error);
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: error.toString(),
      });
      return null;
    }
  }, [activeConnection, userId, addNotification, logAudit]);

  /**
   * Export all BLOBs as a ZIP archive
   * @param table - The BLOB table name
   */
  const exportAllBlobs = useCallback(async (table: string): Promise<void> => {
    if (!activeConnection) return;

    // Require authentication
    try {
      requireAuthentication(userId, 'export all blobs');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: error.message,
      });
      return;
    }

    try {
      const metadataTable = getMetadataTableName(table);

      // Get all active (non-deleted) files
      const querySql = `SELECT * FROM ${metadataTable} WHERE deleted_at IS NULL ORDER BY uploaded_at ASC`;
      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: querySql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get file list: ${response.status}`);
      }

      const data = await response.json();
      const files: BlobMetadata[] = data.rows?.map((row: any[]) => ({
        id: row[0],
        sha1_hash: row[1],
        filename: row[2],
        folder_path: row[3],
        file_size: row[4],
        content_type: row[5],
        uploaded_at: row[6],
        uploaded_by: row[7],
        metadata: row[8] ? JSON.parse(row[8]) : null,
        deleted_at: row[9],
        deleted_by: row[10],
        thumbnail_hash: row[11],
        tags: row[12] ? JSON.parse(row[12]) : null,
        is_favorite: row[13],
        download_count: row[14],
        last_accessed_at: row[15],
        share_token: row[16],
        share_expires_at: row[17],
        share_password: row[18],
        share_access_count: row[19],
        share_permissions: row[20],
        is_public: row[21],
        parent_version_id: row[22],
        version_number: row[23],
        file_description: row[24],
      })) || [];

      if (files.length === 0) {
        addNotification({
          type: 'info',
          title: 'No Files',
          message: 'No files to export',
        });
        return;
      }

      // Use the existing downloadBlobsAsZip function
      await downloadBlobsAsZip(table, files);

      addNotification({
        type: 'success',
        title: 'Backup Complete',
        message: `Exported ${files.length} file(s) as ZIP archive`,
      });

      // Log export
      await logAudit(table, 'download', null, null, true, {
        export_type: 'full_backup',
        file_count: files.length,
        total_size: files.reduce((sum, f) => sum + f.file_size, 0),
      });
    } catch (error: any) {
      console.error('[BlobStorage] Failed to export blobs:', error);
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: error.toString(),
      });
    }
  }, [activeConnection, userId, addNotification, downloadBlobsAsZip, logAudit]);

  /**
   * Get backup summary statistics
   * @param table - The BLOB table name
   * @returns Summary with file count, total size, and date range
   */
  const getBackupSummary = useCallback(async (
    table: string
  ): Promise<{ fileCount: number; totalSize: number; oldestFile: string; newestFile: string } | null> => {
    if (!activeConnection) return null;

    try {
      const metadataTable = getMetadataTableName(table);

      const summarySql = `
        SELECT
          COUNT(*) as file_count,
          SUM(file_size) as total_size,
          MIN(uploaded_at) as oldest_file,
          MAX(uploaded_at) as newest_file
        FROM ${metadataTable}
        WHERE deleted_at IS NULL
      `;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: summarySql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get backup summary: ${response.status}`);
      }

      const data = await response.json();
      const row = data.rows?.[0];

      if (!row) return null;

      return {
        fileCount: row[0] || 0,
        totalSize: row[1] || 0,
        oldestFile: row[2] || '',
        newestFile: row[3] || '',
      };
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get backup summary:', error);
      return null;
    }
  }, [activeConnection]);

  // ============================================================================
  // STORAGE QUOTA AND MONITORING FUNCTIONS
  // ============================================================================

  /**
   * Get quota settings for a table (stored in a separate settings table)
   */
  const getQuotaSettings = useCallback(async (table: string): Promise<QuotaSettings | null> => {
    if (!activeConnection) return null;

    try {
      const settingsTable = `${escapeSqlIdentifier(table)}_quota_settings`;

      // Check if settings table exists
      const checkTableSql = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = '${escapeSqlString(settingsTable)}'
      `;

      const checkResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: checkTableSql }),
      });

      if (!checkResponse.ok) {
        throw new Error(`Failed to check settings table: ${checkResponse.status}`);
      }

      const checkData = await checkResponse.json();

      // If settings table doesn't exist, return default settings
      if (!checkData.rows || checkData.rows.length === 0) {
        return {
          maxSizeBytes: null, // unlimited
          warningThresholdPercent: 80,
          criticalThresholdPercent: 90,
          enableAlerts: true,
        };
      }

      // Get settings
      const selectSql = `SELECT * FROM ${settingsTable} LIMIT 1`;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: selectSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get quota settings: ${response.status}`);
      }

      const data = await response.json();
      const row = data.rows?.[0];

      if (!row) {
        return {
          maxSizeBytes: null,
          warningThresholdPercent: 80,
          criticalThresholdPercent: 90,
          enableAlerts: true,
        };
      }

      return {
        maxSizeBytes: row[1],
        warningThresholdPercent: row[2] || 80,
        criticalThresholdPercent: row[3] || 90,
        enableAlerts: row[4] !== false,
      };
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get quota settings:', error);
      return null;
    }
  }, [activeConnection]);

  /**
   * Set quota settings for a table
   */
  const setQuotaSettings = useCallback(async (
    table: string,
    settings: QuotaSettings
  ): Promise<void> => {
    if (!activeConnection || !userId) return;

    // Require admin permission to set quota settings
    requireAuthentication(userId, 'set quota settings');
    if (role !== 'admin') {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only administrators can modify quota settings.',
      });
      throw new Error('Only administrators can modify quota settings');
    }

    try {
      const settingsTable = `${escapeSqlIdentifier(table)}_quota_settings`;

      // Create settings table if it doesn't exist
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS ${settingsTable} (
          id TEXT PRIMARY KEY,
          max_size_bytes BIGINT,
          warning_threshold_percent INT,
          critical_threshold_percent INT,
          enable_alerts BOOLEAN
        )
      `;

      const createResponse = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: createTableSql }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create settings table: ${createResponse.status}`);
      }

      // Delete existing settings
      const deleteSql = `DELETE FROM ${settingsTable}`;
      await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: deleteSql }),
      });

      // Insert new settings
      const insertSql = `
        INSERT INTO ${settingsTable}
        (id, max_size_bytes, warning_threshold_percent, critical_threshold_percent, enable_alerts)
        VALUES (
          'quota_settings',
          ${settings.maxSizeBytes === null ? 'NULL' : settings.maxSizeBytes},
          ${settings.warningThresholdPercent},
          ${settings.criticalThresholdPercent},
          ${settings.enableAlerts}
        )
      `;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: insertSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save quota settings: ${response.status}`);
      }

      addNotification({
        type: 'success',
        title: 'Quota Settings Updated',
        message: `Storage quota settings have been updated for ${table}.`,
      });

      console.log('[BlobStorage] Quota settings updated:', settings);
    } catch (error: any) {
      console.error('[BlobStorage] Failed to set quota settings:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Update Settings',
        message: error.message || 'Could not update quota settings.',
      });
      throw error;
    }
  }, [activeConnection, userId, role, addNotification]);

  /**
   * Get total quota usage for a table
   */
  const getTableQuotaUsage = useCallback(async (table: string): Promise<QuotaUsage | null> => {
    if (!activeConnection) return null;

    try {
      const metadataTable = getMetadataTableName(table);

      // Get settings
      const settings = await getQuotaSettings(table);

      // Get total storage used
      const usageSql = `
        SELECT
          COUNT(*) as file_count,
          COALESCE(SUM(file_size), 0) as total_size
        FROM ${metadataTable}
        WHERE deleted_at IS NULL
      `;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: usageSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get quota usage: ${response.status}`);
      }

      const data = await response.json();
      const row = data.rows?.[0];

      if (!row) return null;

      const fileCount = row[0] || 0;
      const currentSizeBytes = row[1] || 0;
      const maxSizeBytes = settings?.maxSizeBytes || null;

      let usagePercent: number | null = null;
      let alertLevel: QuotaAlertLevel | null = null;
      let remainingBytes: number | null = null;

      if (maxSizeBytes !== null && maxSizeBytes > 0) {
        usagePercent = (currentSizeBytes / maxSizeBytes) * 100;
        remainingBytes = maxSizeBytes - currentSizeBytes;

        const warningThreshold = settings?.warningThresholdPercent || 80;
        const criticalThreshold = settings?.criticalThresholdPercent || 90;

        if (usagePercent >= criticalThreshold) {
          alertLevel = 'critical';
        } else if (usagePercent >= warningThreshold) {
          alertLevel = 'warning';
        } else {
          alertLevel = 'info';
        }
      }

      return {
        currentSizeBytes,
        maxSizeBytes,
        usagePercent,
        fileCount,
        alertLevel,
        remainingBytes,
      };
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get table quota usage:', error);
      return null;
    }
  }, [activeConnection, getQuotaSettings]);

  /**
   * Get quota usage for a specific user
   */
  const getUserQuotaUsage = useCallback(async (
    table: string,
    targetUserId: string
  ): Promise<UserQuotaUsage | null> => {
    if (!activeConnection) return null;

    try {
      const metadataTable = getMetadataTableName(table);

      // Get settings
      const settings = await getQuotaSettings(table);

      // Get user storage used
      const usageSql = `
        SELECT
          COUNT(*) as file_count,
          COALESCE(SUM(file_size), 0) as total_size
        FROM ${metadataTable}
        WHERE deleted_at IS NULL
        AND uploaded_by = '${escapeSqlString(targetUserId)}'
      `;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: usageSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get user quota usage: ${response.status}`);
      }

      const data = await response.json();
      const row = data.rows?.[0];

      if (!row) return null;

      const fileCount = row[0] || 0;
      const currentSizeBytes = row[1] || 0;
      const maxSizeBytes = settings?.maxSizeBytes || null;

      let usagePercent: number | null = null;
      let alertLevel: QuotaAlertLevel | null = null;
      let remainingBytes: number | null = null;

      if (maxSizeBytes !== null && maxSizeBytes > 0) {
        usagePercent = (currentSizeBytes / maxSizeBytes) * 100;
        remainingBytes = maxSizeBytes - currentSizeBytes;

        const warningThreshold = settings?.warningThresholdPercent || 80;
        const criticalThreshold = settings?.criticalThresholdPercent || 90;

        if (usagePercent >= criticalThreshold) {
          alertLevel = 'critical';
        } else if (usagePercent >= warningThreshold) {
          alertLevel = 'warning';
        } else {
          alertLevel = 'info';
        }
      }

      return {
        userId: targetUserId,
        username: targetUserId, // In a real app, you'd look up the username
        currentSizeBytes,
        maxSizeBytes,
        usagePercent,
        fileCount,
        alertLevel,
        remainingBytes,
      };
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get user quota usage:', error);
      return null;
    }
  }, [activeConnection, getQuotaSettings]);

  /**
   * Get quota usage for all users
   */
  const getAllUsersQuotaUsage = useCallback(async (table: string): Promise<UserQuotaUsage[]> => {
    if (!activeConnection) return [];

    try {
      const metadataTable = getMetadataTableName(table);

      // Get settings
      const settings = await getQuotaSettings(table);

      // Get all users and their storage usage
      const usageSql = `
        SELECT
          uploaded_by,
          COUNT(*) as file_count,
          COALESCE(SUM(file_size), 0) as total_size
        FROM ${metadataTable}
        WHERE deleted_at IS NULL
        AND uploaded_by IS NOT NULL
        GROUP BY uploaded_by
        ORDER BY total_size DESC
      `;

      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
        body: JSON.stringify({ stmt: usageSql }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get all users quota usage: ${response.status}`);
      }

      const data = await response.json();

      if (!data.rows || data.rows.length === 0) return [];

      const maxSizeBytes = settings?.maxSizeBytes || null;
      const warningThreshold = settings?.warningThresholdPercent || 80;
      const criticalThreshold = settings?.criticalThresholdPercent || 90;

      const usages: UserQuotaUsage[] = data.rows.map((row: any[]) => {
        const targetUserId = row[0];
        const fileCount = row[1] || 0;
        const currentSizeBytes = row[2] || 0;

        let usagePercent: number | null = null;
        let alertLevel: QuotaAlertLevel | null = null;
        let remainingBytes: number | null = null;

        if (maxSizeBytes !== null && maxSizeBytes > 0) {
          usagePercent = (currentSizeBytes / maxSizeBytes) * 100;
          remainingBytes = maxSizeBytes - currentSizeBytes;

          if (usagePercent >= criticalThreshold) {
            alertLevel = 'critical';
          } else if (usagePercent >= warningThreshold) {
            alertLevel = 'warning';
          } else {
            alertLevel = 'info';
          }
        }

        return {
          userId: targetUserId,
          username: targetUserId, // In a real app, you'd look up the username
          currentSizeBytes,
          maxSizeBytes,
          usagePercent,
          fileCount,
          alertLevel,
          remainingBytes,
        };
      });

      return usages;
    } catch (error: any) {
      console.error('[BlobStorage] Failed to get all users quota usage:', error);
      return [];
    }
  }, [activeConnection, getQuotaSettings]);

  /**
   * Check if a file upload would exceed quota limits
   */
  const checkQuotaBeforeUpload = useCallback(async (
    table: string,
    fileSize: number
  ): Promise<{ allowed: boolean; reason?: string; usage?: QuotaUsage }> => {
    if (!activeConnection) {
      return { allowed: false, reason: 'No active database connection' };
    }

    try {
      const usage = await getTableQuotaUsage(table);

      if (!usage) {
        // If we can't get usage info, allow the upload
        return { allowed: true };
      }

      // If unlimited quota, allow
      if (usage.maxSizeBytes === null) {
        return { allowed: true, usage };
      }

      // Check if upload would exceed quota
      const afterUploadSize = usage.currentSizeBytes + fileSize;

      if (afterUploadSize > usage.maxSizeBytes) {
        const exceededBy = afterUploadSize - usage.maxSizeBytes;
        return {
          allowed: false,
          reason: `Upload would exceed storage quota by ${formatFileSize(exceededBy)}. Current usage: ${formatFileSize(usage.currentSizeBytes)} / ${formatFileSize(usage.maxSizeBytes)}`,
          usage,
        };
      }

      return { allowed: true, usage };
    } catch (error: any) {
      console.error('[BlobStorage] Failed to check quota before upload:', error);
      // On error, allow the upload
      return { allowed: true };
    }
  }, [activeConnection, getTableQuotaUsage]);

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
        const metadataTable = getMetadataTableName(table);
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
          share_permissions TEXT,
          is_public BOOLEAN DEFAULT FALSE,
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

      // Step 4: Create audit log table
      console.log(`[BlobStorage] Step 4: Creating audit log table`);
      await createAuditLogTable(table);

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
    showFavoritesOnly,
    searchQuery,
    setShowTrashed,
    setShowFavoritesOnly,
    setSearchQuery,
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
    shareFile,
    unshareFile,
    validateShareToken,
    getSharedFile,
    getAuditLogs,
    getAuditSummary,
    getTrashCleanupPreview,
    cleanupOldTrashedFiles,
    createNewVersion,
    getFileVersionHistory,
    restoreFileVersion,
    deleteAllVersions,
    getAllTags,
    exportMetadata,
    exportAllBlobs,
    getBackupSummary,
    getQuotaSettings,
    setQuotaSettings,
    getTableQuotaUsage,
    getUserQuotaUsage,
    getAllUsersQuotaUsage,
    checkQuotaBeforeUpload,
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
