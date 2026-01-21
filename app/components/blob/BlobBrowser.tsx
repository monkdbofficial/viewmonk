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
  Edit,
  Star,
  Tag,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  X as XIcon,
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
  const {
    downloadBlob,
    downloadBlobsAsZip,
    deleteBlob,
    renameBlob,
    currentTable,
    restoreBlob,
    toggleFavorite,
    updateTags,
    showTrashed,
    totalCount,
    currentPage,
    pageSize,
    setCurrentPage,
  } = useBlobStorage();
  const [selectedBlobs, setSelectedBlobs] = useState<Set<string>>(new Set());
  const [previewBlob, setPreviewBlob] = useState<BlobMetadata | null>(null);
  const [renameDialogBlob, setRenameDialogBlob] = useState<BlobMetadata | null>(null);
  const [newFilename, setNewFilename] = useState('');
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [tagsDialogBlob, setTagsDialogBlob] = useState<BlobMetadata | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [editingTags, setEditingTags] = useState<string[]>([]);


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
    // Handle both Unix timestamps (as string) and ISO date strings
    let date: Date;
    if (/^\d+$/.test(dateString)) {
      // It's a Unix timestamp in milliseconds
      date = new Date(parseInt(dateString));
    } else {
      // It's an ISO date string
      date = new Date(dateString);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }

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

  const handleRename = async () => {
    if (!currentTable || !renameDialogBlob || !newFilename.trim()) return;

    try {
      await renameBlob(currentTable, renameDialogBlob.id, newFilename.trim());

      // Close dialog after successful rename and reload
      setRenameDialogBlob(null);
      setNewFilename('');
    } catch (error) {
      console.error('[BlobBrowser] Rename failed:', error);
      // Keep dialog open on error so user can retry
    }
  };

  const openRenameDialog = (blob: BlobMetadata) => {
    setRenameDialogBlob(blob);
    setNewFilename(blob.filename);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, blob: BlobMetadata) => {
    e.stopPropagation();
    console.log('[BlobBrowser] Toggle favorite clicked:', blob.filename, 'Current:', blob.is_favorite);
    if (!currentTable) {
      console.error('[BlobBrowser] No current table');
      return;
    }
    try {
      await toggleFavorite(currentTable, blob.id, blob.is_favorite);
      console.log('[BlobBrowser] Favorite toggled successfully');
    } catch (error) {
      console.error('[BlobBrowser] Toggle favorite error:', error);
    }
  };

  const handleRestore = async (blob: BlobMetadata) => {
    if (!currentTable) return;
    if (confirm(`Restore ${blob.filename}?`)) {
      await restoreBlob(currentTable, blob.id);
    }
  };

  const openTagsDialog = (e: React.MouseEvent, blob: BlobMetadata) => {
    e.stopPropagation();
    setTagsDialogBlob(blob);
    setEditingTags(blob.tags || []);
    setTagInput('');
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (editingTags.includes(tagInput.trim())) return;
    setEditingTags([...editingTags, tagInput.trim()]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setEditingTags(editingTags.filter(t => t !== tag));
  };

  const handleSaveTags = async () => {
    if (!currentTable || !tagsDialogBlob) return;
    await updateTags(currentTable, tagsDialogBlob.id, editingTags);
    setTagsDialogBlob(null);
    setEditingTags([]);
    setTagInput('');
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
            const isVideo = blob.content_type.startsWith('video/');
            const isAudio = blob.content_type.startsWith('audio/');
            const isPDF = blob.content_type === 'application/pdf';
            const isOfficeDoc = [
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'application/msword',
              'application/vnd.ms-excel',
              'application/vnd.ms-powerpoint',
            ].includes(blob.content_type);
            const isText = blob.content_type.startsWith('text/') ||
                           blob.content_type === 'application/json' ||
                           blob.content_type === 'application/javascript' ||
                           blob.content_type === 'application/xml';
            const isPreviewable = isImage || isVideo || isAudio || isPDF || isOfficeDoc || isText;

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
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
                  {isImage ? (
                    <img
                      src={`/api/blob/${currentTable}/${blob.sha1_hash}`}
                      alt={blob.filename}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : isVideo ? (
                    <>
                      {playingVideo === blob.id ? (
                        <video
                          key={blob.id}
                          src={`/api/blob/${currentTable}/${blob.sha1_hash}`}
                          className="h-full w-full object-cover"
                          controls
                          autoPlay
                          muted={false}
                          playsInline
                          onEnded={() => setPlayingVideo(null)}
                          onLoadedMetadata={(e) => {
                            // Ensure video is unmuted when loaded
                            const video = e.currentTarget;
                            video.muted = false;
                            video.play().catch(err => {
                              // If unmuted autoplay fails, play muted
                              console.log('Autoplay with sound failed, trying muted:', err);
                              video.muted = true;
                              video.play();
                            });
                          }}
                        />
                      ) : (
                        <>
                          <video
                            src={`/api/blob/${currentTable}/${blob.sha1_hash}`}
                            className="h-full w-full object-cover"
                            preload="metadata"
                            muted
                          />
                          {/* Play icon overlay */}
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer hover:bg-black/40 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayingVideo(blob.id);
                            }}
                          >
                            <div className="rounded-full bg-white/90 p-3 hover:bg-white hover:scale-110 transition-transform">
                              <svg className="h-8 w-8 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : null}
                  <div className={`flex h-full items-center justify-center ${isImage || isVideo ? 'hidden' : ''}`}>
                    <IconComponent className="h-16 w-16 text-gray-400" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center gap-1 group/filename">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white flex-1">
                      {blob.filename}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openRenameDialog(blob);
                      }}
                      className="flex-shrink-0 opacity-0 group-hover/filename:opacity-100 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity"
                      title="Rename"
                    >
                      <Edit className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(blob.file_size)}
                  </p>
                  {/* Tags Display */}
                  {blob.tags && blob.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {blob.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {blob.tags.length > 3 && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          +{blob.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Favorite Star - Always visible in top-left */}
                <button
                  onClick={(e) => handleToggleFavorite(e, blob)}
                  className="absolute left-2 top-2 z-10 rounded-lg bg-white/90 p-2 shadow-lg hover:bg-white hover:scale-110 transition-transform dark:bg-gray-800/90 dark:hover:bg-gray-800"
                  title={blob.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={`h-4 w-4 transition-colors ${
                      blob.is_favorite
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-400 hover:text-yellow-300 dark:text-gray-500'
                    }`}
                  />
                </button>

                {/* Actions */}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => openTagsDialog(e, blob)}
                    className="rounded-lg bg-white p-2 shadow-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                    title="Manage Tags"
                  >
                    <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </button>
                  {isVideo && playingVideo !== blob.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayingVideo(blob.id);
                      }}
                      className="rounded-lg bg-white p-2 shadow-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                      title="Play Video"
                    >
                      <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  )}
                  {isPreviewable && (
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
                  {showTrashed ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(blob);
                      }}
                      className="rounded-lg bg-white p-2 shadow-lg hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900/20"
                      title="Restore"
                    >
                      <RotateCcw className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(blob);
                      }}
                      className="rounded-lg bg-white p-2 shadow-lg hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/30"
                      title="Move to Trash"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                  )}
                </div>

                {/* Selection Indicator - Bottom Left to not conflict with star */}
                {isSelected && (
                  <div className="absolute left-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg z-10">
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

        {/* Pagination Controls */}
        {totalCount > pageSize && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
              <span className="font-medium">{totalCount}</span> files
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewBlob && (
          <BlobPreview
            blob={previewBlob}
            allBlobs={blobs}
            onClose={() => setPreviewBlob(null)}
            onDelete={handleDelete}
          />
        )}

        {/* Rename Dialog */}
        {renameDialogBlob ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={(e) => {
              if (e.target === e.currentTarget) {
                setRenameDialogBlob(null);
                setNewFilename('');
              }
            }}>
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Rename File
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Current name: <span className="font-medium">{renameDialogBlob.filename}</span>
                </p>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    New filename
                  </label>
                  <input
                    type="text"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRename();
                      } else if (e.key === 'Escape') {
                        setRenameDialogBlob(null);
                        setNewFilename('');
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter new filename"
                    autoFocus
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setRenameDialogBlob(null);
                      setNewFilename('');
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRename}
                    disabled={!newFilename.trim() || newFilename === renameDialogBlob.filename}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600"
                  >
                    Rename
                  </button>
                </div>
              </div>
            </div>
        ) : null}

        {/* Tags Dialog */}
        {tagsDialogBlob && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => setTagsDialogBlob(null)}>
            <div className="max-w-lg w-full rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Manage Tags: {tagsDialogBlob.filename}
              </h3>

              {/* Current Tags */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Tags
                </label>
                <div className="flex flex-wrap gap-2 min-h-[40px] rounded-lg border border-gray-300 p-2 dark:border-gray-600">
                  {editingTags.length > 0 ? (
                    editingTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-purple-900 dark:hover:text-purple-200"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No tags yet</span>
                  )}
                </div>
              </div>

              {/* Add Tag */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add New Tag
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Type tag name and press Enter"
                  />
                  <button
                    onClick={handleAddTag}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setTagsDialogBlob(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTags}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                >
                  Save Tags
                </button>
              </div>
            </div>
          </div>
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
              <th className="w-12 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Fav
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Tags
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
              const isVideo = blob.content_type.startsWith('video/');
              const isAudio = blob.content_type.startsWith('audio/');
              const isPDF = blob.content_type === 'application/pdf';
              const isOfficeDoc = [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/msword',
                'application/vnd.ms-excel',
                'application/vnd.ms-powerpoint',
              ].includes(blob.content_type);
              const isText = blob.content_type.startsWith('text/') ||
                             blob.content_type === 'application/json' ||
                             blob.content_type === 'application/javascript' ||
                             blob.content_type === 'application/xml';
              const isPreviewable = isImage || isVideo || isAudio || isPDF || isOfficeDoc || isText;

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
                    <button
                      onClick={(e) => handleToggleFavorite(e, blob)}
                      className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title={blob.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className={`h-4 w-4 transition-colors ${
                          blob.is_favorite
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400 hover:text-yellow-300 dark:text-gray-500'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 group/filename">
                      {isImage ? (
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-900">
                          <img
                            src={`/api/blob/${currentTable}/${blob.sha1_hash}`}
                            alt={blob.filename}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = '<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                              }
                            }}
                          />
                        </div>
                      ) : isVideo ? (
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-900">
                          <video
                            src={`/api/blob/${currentTable}/${blob.sha1_hash}`}
                            className="h-full w-full object-cover"
                            preload="metadata"
                            muted
                          />
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer hover:bg-black/40 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayingVideo(blob.id);
                            }}
                          >
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <IconComponent className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white flex-1">
                        {blob.filename}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRenameDialog(blob);
                        }}
                        className="flex-shrink-0 opacity-0 group-hover/filename:opacity-100 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity"
                        title="Rename"
                      >
                        <Edit className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {blob.tags && blob.tags.length > 0 ? (
                        <>
                          {blob.tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                            >
                              {tag}
                            </span>
                          ))}
                          {blob.tags.length > 2 && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              +{blob.tags.length - 2}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      )}
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
                      <button
                        onClick={(e) => openTagsDialog(e, blob)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-700 dark:hover:text-purple-400"
                        title="Manage Tags"
                      >
                        <Tag className="h-4 w-4" />
                      </button>
                      {isVideo && playingVideo !== blob.id && (
                        <button
                          onClick={() => setPlayingVideo(blob.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          title="Play Video"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                      )}
                      {isPreviewable && (
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
                      {showTrashed ? (
                        <button
                          onClick={() => handleRestore(blob)}
                          className="rounded p-1 text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400"
                          title="Restore"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(blob)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          title="Move to Trash"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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

      {/* Rename Dialog */}
      {renameDialogBlob ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRenameDialogBlob(null);
              setNewFilename('');
            }
          }}>
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Rename File
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Current name: <span className="font-medium">{renameDialogBlob.filename}</span>
              </p>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New filename
                </label>
                <input
                  type="text"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRename();
                    } else if (e.key === 'Escape') {
                      setRenameDialogBlob(null);
                      setNewFilename('');
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter new filename"
                  autoFocus
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setRenameDialogBlob(null);
                    setNewFilename('');
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRename}
                  disabled={!newFilename.trim() || newFilename === renameDialogBlob.filename}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
      ) : null}

      {/* Tags Dialog */}
      {tagsDialogBlob && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => setTagsDialogBlob(null)}>
          <div className="max-w-lg w-full rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Manage Tags: {tagsDialogBlob.filename}
            </h3>

            {/* Current Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Tags
              </label>
              <div className="flex flex-wrap gap-2 min-h-[40px] rounded-lg border border-gray-300 p-2 dark:border-gray-600">
                {editingTags.length > 0 ? (
                  editingTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-purple-900 dark:hover:text-purple-200"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">No tags yet</span>
                )}
              </div>
            </div>

            {/* Add Tag */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add New Tag
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Type tag name and press Enter"
                />
                <button
                  onClick={handleAddTag}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTagsDialogBlob(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
              >
                Save Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
