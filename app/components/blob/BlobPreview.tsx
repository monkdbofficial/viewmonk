'use client';

import { useState, useEffect } from 'react';
import { X, Download, Trash2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { BlobMetadata, useBlobStorage } from '../../lib/blob-context';
import { useActiveConnection } from '../../lib/monkdb-context';
// @ts-ignore
import * as mammoth from 'mammoth';
// @ts-ignore
import * as XLSX from 'xlsx';
// @ts-ignore
import JSZip from 'jszip';
// @ts-ignore
import Papa from 'papaparse';
// @ts-ignore
import { marked } from 'marked';
// @ts-ignore
import hljs from 'highlight.js/lib/core';
// @ts-ignore
import javascript from 'highlight.js/lib/languages/javascript';
// @ts-ignore
import python from 'highlight.js/lib/languages/python';
// @ts-ignore
import java from 'highlight.js/lib/languages/java';
// @ts-ignore
import json from 'highlight.js/lib/languages/json';
// @ts-ignore
import xml from 'highlight.js/lib/languages/xml';
// @ts-ignore
import sql from 'highlight.js/lib/languages/sql';
// @ts-ignore
import css from 'highlight.js/lib/languages/css';

// Register languages for syntax highlighting
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('css', css);

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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [officeHtml, setOfficeHtml] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [zipContents, setZipContents] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  // Find current blob index
  useEffect(() => {
    const index = allBlobs.findIndex((b) => b.id === blob.id);
    setCurrentIndex(index);
  }, [blob.id, allBlobs]);

  // Load media from BLOB API
  useEffect(() => {
    if (!activeConnection || !currentTable) return;

    const currentBlob = allBlobs[currentIndex];
    if (!currentBlob) return;

    const contentType = currentBlob.content_type;
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    const isAudio = contentType.startsWith('audio/');
    const isPDF = contentType === 'application/pdf';
    const isOfficeDoc = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/msword', // .doc
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-powerpoint', // .ppt
    ].includes(contentType);
    const isText = contentType.startsWith('text/') ||
                   contentType === 'application/json' ||
                   contentType === 'application/javascript' ||
                   contentType === 'application/xml';
    const isCSV = contentType === 'text/csv' || currentBlob.filename.endsWith('.csv');
    const isMarkdown = contentType === 'text/markdown' ||
                       currentBlob.filename.endsWith('.md') ||
                       currentBlob.filename.endsWith('.markdown');
    const isZip = contentType === 'application/zip' ||
                  contentType === 'application/x-zip-compressed' ||
                  currentBlob.filename.endsWith('.zip');
    const isCode = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.sql', '.css', '.html'].some(ext =>
                   currentBlob.filename.endsWith(ext));

    setLoading(true);
    setError(null);
    setImageUrl(null);
    setVideoUrl(null);
    setAudioUrl(null);
    setDocumentUrl(null);
    setTextContent(null);
    setOfficeHtml(null);
    setCsvData(null);
    setZipContents(null);

    // Construct BLOB URL via proxy API
    const blobUrl = `/api/blob/${currentTable}/${currentBlob.sha1_hash}?host=${activeConnection.config.host}&port=${activeConnection.config.port}`;

    if (isImage) {
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
    } else if (isVideo) {
      // Load video
      setVideoUrl(blobUrl);
      setLoading(false);
    } else if (isAudio) {
      // Load audio
      setAudioUrl(blobUrl);
      setLoading(false);
    } else if (isPDF) {
      // Load PDF - use browser's built-in PDF viewer
      setDocumentUrl(blobUrl);
      setLoading(false);
    } else if (isOfficeDoc) {
      // Parse Office documents using JavaScript libraries
      fetch(blobUrl, {
        method: 'GET',
        headers: {
          'x-monkdb-host': activeConnection.config.host,
          'x-monkdb-port': activeConnection.config.port.toString(),
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();

          // Check if we got actual data
          if (arrayBuffer.byteLength === 0) {
            throw new Error('Received empty file');
          }

          // Check file signature
          const uint8Array = new Uint8Array(arrayBuffer);

          // Check if this is a modern Office file (ZIP-based format)
          const isModernOffice = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B;
          const isOldWord = uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF; // .doc, .xls, .ppt

          if (!isModernOffice) {

            // Show download card for old formats or unknown files
            let fileTypeLabel = '📁 Office Document';
            let formatMessage = 'This file format requires desktop software to view.';

            if (isOldWord) {
              if (contentType.includes('word')) {
                fileTypeLabel = '📄 Word Document (.doc)';
                formatMessage = 'Legacy Word format (.doc) detected. Download to view in Microsoft Word or LibreOffice.';
              } else if (contentType.includes('spreadsheet')) {
                fileTypeLabel = '📊 Excel Spreadsheet (.xls)';
                formatMessage = 'Legacy Excel format (.xls) detected. Download to view in Microsoft Excel or LibreOffice.';
              } else if (contentType.includes('presentation')) {
                fileTypeLabel = '📽️ PowerPoint Presentation (.ppt)';
                formatMessage = 'Legacy PowerPoint format (.ppt) detected. Download to view in Microsoft PowerPoint or LibreOffice.';
              }
            }

            // Try Google Docs Viewer for legacy formats
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            if (isLocalhost) {
              // Localhost - show download card with conversion instructions
              setOfficeHtml(`
                <div style="text-align: center; padding: 3rem; max-width: 700px; margin: 0 auto;">
                  <div style="font-size: 4rem; margin-bottom: 1.5rem;">${fileTypeLabel.split(' ')[0]}</div>
                  <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #1f2937;">${currentBlob.filename}</h2>
                  <div style="display: inline-block; margin-bottom: 1.5rem; padding: 0.5rem 1rem; background: #f3f4f6; border-radius: 0.5rem;">
                    <span style="font-weight: 600; color: #6b7280;">${fileTypeLabel}</span>
                  </div>

                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; margin-bottom: 1.5rem; text-align: left; border-radius: 0.5rem;">
                    <strong style="color: #92400e;">⚠️ Legacy Format Detected</strong><br/>
                    <span style="color: #78350f; font-size: 0.875rem;">This is an old Office format (.doc/.xls/.ppt). Browser preview only works with modern formats (.docx/.xlsx/.pptx).</span>
                  </div>

                  <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 1rem; margin-bottom: 2rem; text-align: left; border-radius: 0.5rem;">
                    <strong style="color: #075985;">💡 How to Enable Preview:</strong><br/>
                    <ol style="color: #0c4a6e; font-size: 0.875rem; margin: 0.5rem 0 0 1.5rem; text-align: left;">
                      <li style="margin-bottom: 0.5rem;">Download this file using the button below</li>
                      <li style="margin-bottom: 0.5rem;">Open it in Microsoft Office or LibreOffice</li>
                      <li style="margin-bottom: 0.5rem;">Click "File" → "Save As"</li>
                      <li style="margin-bottom: 0.5rem;">Choose the modern format (.docx/.xlsx/.pptx)</li>
                      <li>Re-upload the converted file - it will now preview in browser!</li>
                    </ol>
                  </div>

                  <p style="color: #6b7280; margin-bottom: 1rem; font-size: 0.875rem; font-style: italic;">
                    Note: In production (non-localhost), this viewer will attempt to use Google Docs Viewer.
                  </p>
                </div>
              `);
              setLoading(false);
              return;
            } else {
              // Production - try multiple viewers
              const publicUrl = window.location.origin + blobUrl;
              const encodedUrl = encodeURIComponent(publicUrl);

              // Try Google Docs Viewer (free, no API key)
              setOfficeHtml(`
                <div style="width: 100%; height: 100%;">
                  <div style="margin-bottom: 1rem; text-align: center;">
                    <button
                      onclick="document.getElementById('viewer-frame').src = 'https://docs.google.com/viewer?url=${encodedUrl}&embedded=true'"
                      style="margin-right: 0.5rem; padding: 0.5rem 1rem; background: #4285f4; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;"
                    >
                      📊 Google Docs Viewer
                    </button>
                    <button
                      onclick="document.getElementById('viewer-frame').src = 'https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}'"
                      style="padding: 0.5rem 1rem; background: #0078d4; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;"
                    >
                      📄 Office 365 Viewer
                    </button>
                  </div>
                  <iframe
                    id="viewer-frame"
                    src="https://docs.google.com/viewer?url=${encodedUrl}&embedded=true"
                    style="width: 100%; height: 75vh; border: 1px solid #e5e7eb; border-radius: 0.5rem;"
                    frameborder="0"
                  ></iframe>
                  <p style="text-align: center; color: #6b7280; margin-top: 1rem; font-size: 0.75rem;">
                    💡 If one viewer doesn't work, try the other button above
                  </p>
                </div>
              `);
              setLoading(false);
              return;
            }
          }

          try {
            if (contentType.includes('word')) {
              // Parse Word document with Mammoth.js
              const result = await mammoth.convertToHtml({ arrayBuffer });
              setOfficeHtml(result.value);
              setLoading(false);
            } else if (contentType.includes('spreadsheet')) {
              // Parse Excel with SheetJS
              const workbook = XLSX.read(arrayBuffer, { type: 'array' });

              let html = '<div style="overflow: auto; max-height: 70vh;">';

              // Convert each sheet to HTML
              workbook.SheetNames.forEach((sheetName, index) => {
                const worksheet = workbook.Sheets[sheetName];
                html += `<div style="margin-bottom: 2rem;">`;
                html += `<h3 style="margin-bottom: 1rem; padding: 0.5rem; background: #f3f4f6; font-weight: bold; border-radius: 0.5rem;">${sheetName}</h3>`;
                html += XLSX.utils.sheet_to_html(worksheet, {
                  id: `sheet-${index}`,
                  editable: false
                });
                html += `</div>`;
              });

              html += '</div>';

              // Add table styling
              html += `<style>
                table {
                  border-collapse: collapse;
                  width: 100%;
                  font-size: 0.875rem;
                  background: white;
                  border-radius: 0.5rem;
                  overflow: hidden;
                }
                td, th {
                  border: 1px solid #e5e7eb;
                  padding: 0.5rem 0.75rem;
                  text-align: left;
                }
                th {
                  background-color: #f9fafb;
                  font-weight: 600;
                  color: #374151;
                }
                tr:hover {
                  background-color: #f9fafb;
                }
              </style>`;

              setOfficeHtml(html);
              setLoading(false);
            } else if (contentType.includes('presentation')) {
              // PowerPoint - show metadata and download option
              setOfficeHtml(`
                <div style="text-align: center; padding: 3rem;">
                  <div style="font-size: 3rem; margin-bottom: 1rem;">📽️</div>
                  <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">PowerPoint Presentation</h2>
                  <p style="color: #6b7280; margin-bottom: 2rem;">PowerPoint preview is not yet supported. Please download to view.</p>
                </div>
              `);
              setLoading(false);
            } else {
              setError('Unsupported Office document type');
              setLoading(false);
            }
          } catch (err: any) {
            setError(err.message || 'Failed to parse document');
            setLoading(false);
          }
        })
        .catch((err: any) => {
          setError(err.message || 'Failed to load document');
          setLoading(false);
        });
    } else if (isZip) {
      // Load ZIP archive and list contents
      fetch(blobUrl)
        .then(response => response.arrayBuffer())
        .then(async (arrayBuffer) => {
          const zip = await JSZip.loadAsync(arrayBuffer);
          const files: string[] = [];
          zip.forEach((relativePath, file) => {
            files.push(relativePath);
          });
          setZipContents(files.sort());
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to load ZIP archive');
          setLoading(false);
        });
    } else if (isCSV) {
      // Load CSV and parse to table
      fetch(blobUrl)
        .then(response => response.text())
        .then(text => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              setCsvData(results.data);
              setLoading(false);
            },
            error: () => {
              setError('Failed to parse CSV');
              setLoading(false);
            }
          });
        })
        .catch(err => {
          setError('Failed to load CSV');
          setLoading(false);
        });
    } else if (isMarkdown) {
      // Load Markdown and render as HTML
      fetch(blobUrl)
        .then(response => response.text())
        .then(async text => {
          const html = await marked(text);
          setOfficeHtml(html);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load Markdown');
          setLoading(false);
        });
    } else if (isCode) {
      // Load code with syntax highlighting
      fetch(blobUrl)
        .then(response => response.text())
        .then(text => {
          const ext = currentBlob.filename.split('.').pop() || '';
          const langMap: any = {
            js: 'javascript', jsx: 'javascript', ts: 'javascript', tsx: 'javascript',
            py: 'python', java: 'java', json: 'json', xml: 'xml', html: 'xml',
            sql: 'sql', css: 'css'
          };
          const lang = langMap[ext] || 'javascript';

          try {
            const highlighted = hljs.highlight(text, { language: lang }).value;
            setTextContent(highlighted);
          } catch (err) {
            // If highlighting fails, just show plain text
            setTextContent(text);
          }
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load code file');
          setLoading(false);
        });
    } else if (isText) {
      // Load plain text content
      fetch(blobUrl)
        .then(response => response.text())
        .then(text => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load text content');
          setLoading(false);
        });
    } else {
      // Unsupported type
      setLoading(false);
    }
  }, [currentIndex, allBlobs, activeConnection, currentTable]);

  const currentBlob = allBlobs[currentIndex] || blob;
  const contentType = currentBlob.content_type;
  const isImage = contentType.startsWith('image/');
  const isVideo = contentType.startsWith('video/');
  const isAudio = contentType.startsWith('audio/');
  const isPDF = contentType === 'application/pdf';
  const isOfficeDoc = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
  ].includes(contentType);
  const isText = contentType.startsWith('text/') ||
                 contentType === 'application/json' ||
                 contentType === 'application/javascript' ||
                 contentType === 'application/xml';
  const isDocument = isPDF || isOfficeDoc;

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
          {isImage && !isVideo && !isAudio && !isDocument && !isText && (
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
        ) : isVideo && videoUrl ? (
          <video
            key={videoUrl}
            src={videoUrl}
            controls
            autoPlay
            muted={false}
            playsInline
            className="max-h-full max-w-full rounded-lg"
            style={{ maxHeight: '80vh', maxWidth: '90vw' }}
            onLoadedMetadata={(e) => {
              // Ensure video is unmuted when loaded
              const video = e.currentTarget;
              video.muted = false;
              video.play().catch(() => {
                // If unmuted autoplay fails, play muted
                video.muted = true;
                video.play();
              });
            }}
          >
            Your browser does not support the video tag.
          </video>
        ) : isAudio && audioUrl ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-2xl rounded-xl bg-gradient-to-br from-blue-50 to-white p-8 shadow-2xl dark:from-gray-800 dark:to-gray-900">
              {/* Audio Icon */}
              <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30">
                <svg className="h-16 w-16 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>

              {/* File Info */}
              <h3 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
                {currentBlob.filename}
              </h3>
              <div className="mb-6 flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{formatFileSize(currentBlob.file_size)}</span>
                <span>•</span>
                <span>{currentBlob.content_type}</span>
              </div>

              {/* Audio Player */}
              <audio
                key={audioUrl}
                src={audioUrl}
                controls
                autoPlay
                className="w-full"
                style={{ height: '54px' }}
              >
                Your browser does not support the audio tag.
              </audio>

              {/* Additional Info */}
              <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                Use the controls above to play, pause, and adjust volume
              </p>
            </div>
          </div>
        ) : csvData && csvData.length > 0 ? (
          <div className="h-full w-full overflow-auto rounded-lg bg-white p-6 dark:bg-gray-800" style={{ maxHeight: '80vh', maxWidth: '90vw' }}>
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CSV Data</h3>
              <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">{csvData.length} rows</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                  <tr>
                    {Object.keys(csvData[0] || {}).map((key, idx) => (
                      <th key={idx} className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900 dark:border-gray-600 dark:text-white">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      {Object.values(row).map((value: any, colIdx) => (
                        <td key={colIdx} className="border border-gray-300 px-4 py-2 text-gray-800 dark:border-gray-600 dark:text-gray-200">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : zipContents && zipContents.length > 0 ? (
          <div className="h-full w-full overflow-auto rounded-lg bg-white p-6 dark:bg-gray-800" style={{ maxHeight: '80vh', maxWidth: '90vw' }}>
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ZIP Archive Contents</h3>
              <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">{zipContents.length} files</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              <ul className="space-y-1">
                {zipContents.map((file, idx) => {
                  const isFolder = file.endsWith('/');
                  const fileName = file.split('/').pop() || file;
                  const folderPath = file.substring(0, file.lastIndexOf('/'));

                  return (
                    <li key={idx} className="flex items-center gap-2 rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                      {isFolder ? (
                        <svg className="h-4 w-4 flex-shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-mono text-sm text-gray-900 dark:text-white">
                          {file}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : isPDF && documentUrl ? (
          <iframe
            key={documentUrl}
            src={documentUrl}
            className="h-full w-full rounded-lg border-0"
            style={{ minHeight: '80vh', width: '90vw' }}
            title={currentBlob.filename}
          />
        ) : isOfficeDoc && officeHtml ? (
          <div className="h-full w-full overflow-auto rounded-lg bg-white p-6 dark:bg-gray-800" style={{ maxHeight: '80vh', maxWidth: '90vw' }}>
            <div
              dangerouslySetInnerHTML={{ __html: officeHtml }}
              className="prose prose-sm max-w-none dark:prose-invert"
            />
          </div>
        ) : isText && textContent ? (
          <div className="h-full w-full overflow-auto rounded-lg bg-gray-900 p-6" style={{ maxHeight: '80vh', maxWidth: '90vw' }}>
            {textContent.includes('<span') ? (
              // Syntax-highlighted code
              <>
                <style>{`
                  .hljs { background: transparent; }
                  .hljs-keyword { color: #c678dd; }
                  .hljs-string { color: #98c379; }
                  .hljs-number { color: #d19a66; }
                  .hljs-comment { color: #5c6370; font-style: italic; }
                  .hljs-function { color: #61afef; }
                  .hljs-class { color: #e5c07b; }
                  .hljs-variable { color: #e06c75; }
                  .hljs-built_in { color: #56b6c2; }
                  .hljs-attr { color: #d19a66; }
                  .hljs-title { color: #61afef; font-weight: bold; }
                  .hljs-params { color: #abb2bf; }
                  .hljs-literal { color: #56b6c2; }
                  .hljs-meta { color: #61afef; }
                  .hljs-tag { color: #e06c75; }
                `}</style>
                <pre className="text-left text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">
                  <code dangerouslySetInnerHTML={{ __html: textContent }} />
                </pre>
              </>
            ) : (
              // Plain text
              <pre className="text-left text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">
                {textContent}
              </pre>
            )}
          </div>
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
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
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
