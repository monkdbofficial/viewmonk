'use client';

import { useState, useEffect } from 'react';
import { X, Download, Trash2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { BlobMetadata, useBlobStorage } from '../../lib/blob-context';
import { useActiveConnection } from '../../lib/monkdb-context';

interface BlobPreviewProps {
  blob: BlobMetadata;
  allBlobs: BlobMetadata[];
  onClose: () => void;
  onDelete?: (blob: BlobMetadata) => void;
}

export default function BlobPreview({ blob, allBlobs, onClose, onDelete }: BlobPreviewProps) {
  const { downloadBlob, currentTable } = useBlobStorage();
  const activeConnection = useActiveConnection();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  // Find current blob index
  useEffect(() => {
    const index = allBlobs.findIndex((b) => b.id === blob.id);
    setCurrentIndex(index);
  }, [blob.id, allBlobs]);

  // Load image from BLOB API
  useEffect(() => {
    if (!activeConnection || !currentTable) return;

    const currentBlob = allBlobs[currentIndex];
    if (!currentBlob) return;

    // Only load images
    if (!currentBlob.content_type.startsWith('image/')) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Construct BLOB URL
    const blobUrl = `http://${activeConnection.config.host}:${activeConnection.config.port}/_blobs/${currentTable}/${currentBlob.sha1_hash}`;

    // Load image
    const img = new Image();
    img.onload = () => {
      setImageUrl(blobUrl);
      setLoading(false);
    };
    img.onerror = () => {
      setError('Failed to load image');
      setLoading(false);
    };
    img.src = blobUrl;
  }, [currentIndex, allBlobs, activeConnection, currentTable]);

  const currentBlob = allBlobs[currentIndex] || blob;
  const isImage = currentBlob.content_type.startsWith('image/');

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoom(100);
    }
  };

  const handleNext = () => {
    if (currentIndex < allBlobs.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setZoom(100);
    }
  };

  const handleDownload = async () => {
    if (!currentTable) return;
    await downloadBlob(currentTable, currentBlob.sha1_hash, currentBlob.filename);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(currentBlob);
      onClose();
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allBlobs.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{currentBlob.filename}</h3>
          <div className="mt-1 flex items-center gap-4 text-sm text-gray-300">
            <span>{formatFileSize(currentBlob.file_size)}</span>
            <span>•</span>
            <span>{currentBlob.content_type}</span>
            <span>•</span>
            <span>{formatDate(currentBlob.uploaded_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isImage && (
            <>
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="min-w-[4rem] text-center text-sm text-white">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <div className="mx-2 h-6 w-px bg-white/20" />
            </>
          )}

          <button
            onClick={handleDownload}
            className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </button>

          {onDelete && (
            <button
              onClick={handleDelete}
              className="rounded-lg bg-red-600/80 p-2 text-white hover:bg-red-600"
              title="Delete"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {allBlobs.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            title="Previous (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === allBlobs.length - 1}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            title="Next (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="flex h-full w-full items-center justify-center p-20">
        {loading ? (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="mt-4 text-sm text-gray-300">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
              <X className="h-10 w-10 text-red-500" />
            </div>
            <p className="mt-4 text-sm text-red-400">{error}</p>
          </div>
        ) : isImage && imageUrl ? (
          <img
            src={imageUrl}
            alt={currentBlob.filename}
            className="max-h-full max-w-full object-contain transition-transform"
            style={{ transform: `scale(${zoom / 100})` }}
          />
        ) : (
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-white">{currentBlob.filename}</p>
            <p className="mt-2 text-sm text-gray-400">Preview not available for this file type</p>
            <button
              onClick={handleDownload}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Download className="h-4 w-4" />
              Download File
            </button>
          </div>
        )}
      </div>

      {/* Footer - Image Counter */}
      {allBlobs.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 text-center">
          <p className="text-sm text-gray-300">
            {currentIndex + 1} of {allBlobs.length}
          </p>
        </div>
      )}

      {/* Backdrop - Click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close preview"
      />
    </div>
  );
}
