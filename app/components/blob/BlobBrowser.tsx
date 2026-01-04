'use client';

import { useState } from 'react';
import {
  File,
  Image,
  FileText,
  Archive,
  Video,
  Music,
  Download,
  Trash2,
  Eye,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { BlobMetadata, useBlobStorage } from '../../lib/blob-context';
import BlobPreview from './BlobPreview';

interface BlobBrowserProps {
  blobs: BlobMetadata[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  currentFolder: string | null;
  onFolderChange: (folder: string | null) => void;
}

export default function BlobBrowser({
  blobs,
  loading,
  viewMode,
  currentFolder,
  onFolderChange,
}: BlobBrowserProps) {
  const { downloadBlob, downloadBlobsAsZip, deleteBlob, currentTable } = useBlobStorage();
  const [selectedBlobs, setSelectedBlobs] = useState<Set<string>>(new Set());
  const [previewBlob, setPreviewBlob] = useState<BlobMetadata | null>(null);

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return Image;
    if (contentType.startsWith('video/')) return Video;
    if (contentType.startsWith('audio/')) return Music;
    if (contentType.startsWith('text/') || contentType.includes('pdf')) return FileText;
    if (
      contentType.includes('zip') ||
      contentType.includes('tar') ||
      contentType.includes('gzip')
    )
      return Archive;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleDownload = async (blob: BlobMetadata) => {
    if (!currentTable) return;
    await downloadBlob(currentTable, blob.sha1_hash, blob.filename);
  };

  const handleDelete = async (blob: BlobMetadata) => {
    if (!currentTable) return;
    if (confirm(`Are you sure you want to delete ${blob.filename}?`)) {
      await deleteBlob(currentTable, blob.sha1_hash, blob.id);
    }
  };

  const toggleSelection = (blobId: string) => {
    setSelectedBlobs((prev) => {
      const updated = new Set(prev);
      if (updated.has(blobId)) {
        updated.delete(blobId);
      } else {
        updated.add(blobId);
      }
      return updated;
    });
  };

  const handleBatchDelete = async () => {
    if (!currentTable) return;
    if (selectedBlobs.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedBlobs.size} file(s)?`)) {
      for (const blobId of selectedBlobs) {
        const blob = blobs.find((b) => b.id === blobId);
        if (blob) {
          await deleteBlob(currentTable, blob.sha1_hash, blob.id);
        }
      }
      setSelectedBlobs(new Set());
    }
  };

  const handleBatchDownloadZip = async () => {
    if (!currentTable) return;
    if (selectedBlobs.size === 0) return;

    const selectedBlobsArray = blobs.filter((b) => selectedBlobs.has(b.id));
    await downloadBlobsAsZip(currentTable, selectedBlobsArray);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading files...
          </p>
        </div>
      </div>
    );
  }

  if (blobs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FolderOpen className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No Files Found
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload files to get started
          </p>
        </div>
      </div>
    );
  }

  // Grid View
  if (viewMode === 'grid') {
    return (
      <div>
        {/* Batch Actions */}
        {selectedBlobs.size > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
              {selectedBlobs.size} file(s) selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedBlobs(new Set())}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBatchDownloadZip}
                className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
              >
                <Archive className="h-4 w-4" />
                Download as ZIP
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {blobs.map((blob) => {
            const IconComponent = getFileIcon(blob.content_type);
            const isSelected = selectedBlobs.has(blob.id);
            const isImage = blob.content_type.startsWith('image/');

            return (
              <div
                key={blob.id}
                onClick={() => toggleSelection(blob.id)}
                className={`group relative cursor-pointer overflow-hidden rounded-lg border transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500 dark:border-purple-400 dark:bg-purple-900/30'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-900">
                  {isImage ? (
                    <div className="flex h-full items-center justify-center p-4">
                      <IconComponent className="h-16 w-16 text-gray-400" />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <IconComponent className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {blob.filename}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(blob.file_size)}
                  </p>
                </div>

                {/* Actions */}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {isImage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewBlob(blob);
                      }}
                      className="rounded-lg bg-white p-2 shadow-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(blob);
                    }}
                    className="rounded-lg bg-white p-2 shadow-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(blob);
                    }}
                    className="rounded-lg bg-white p-2 shadow-lg hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/30"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Preview Modal */}
        {previewBlob && (
          <BlobPreview
            blob={previewBlob}
            allBlobs={blobs}
            onClose={() => setPreviewBlob(null)}
            onDelete={handleDelete}
          />
        )}
      </div>
    );
  }

  // List View
  return (
    <div>
      {/* Batch Actions */}
      {selectedBlobs.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
            {selectedBlobs.size} file(s) selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedBlobs(new Set())}
              className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBatchDownloadZip}
              className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Archive className="h-4 w-4" />
              Download as ZIP
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedBlobs.size === blobs.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBlobs(new Set(blobs.map((b) => b.id)));
                    } else {
                      setSelectedBlobs(new Set());
                    }
                  }}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Uploaded
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {blobs.map((blob) => {
              const IconComponent = getFileIcon(blob.content_type);
              const isSelected = selectedBlobs.has(blob.id);
              const isImage = blob.content_type.startsWith('image/');

              return (
                <tr
                  key={blob.id}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(blob.id)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {blob.filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(blob.file_size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {blob.content_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(blob.uploaded_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isImage && (
                        <button
                          onClick={() => setPreviewBlob(blob)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(blob)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(blob)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {previewBlob && (
        <BlobPreview
          blob={previewBlob}
          allBlobs={blobs}
          onClose={() => setPreviewBlob(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
