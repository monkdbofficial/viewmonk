'use client';

import { useState } from 'react';
import { X, Share2, Copy, Check, Lock, Calendar } from 'lucide-react';
import { BlobMetadata, useBlobStorage, SharePermission } from '../../lib/blob-context';

interface ShareFileDialogProps {
  blob: BlobMetadata;
  onClose: () => void;
}

export default function ShareFileDialog({ blob, onClose }: ShareFileDialogProps) {
  const { shareFile, unshareFile, currentTable } = useBlobStorage();
  const [loading, setLoading] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(blob.share_token || null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [permissions, setPermissions] = useState<SharePermission>(
    (blob.share_permissions as SharePermission) || 'view'
  );
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [password, setPassword] = useState<string>('');
  const [usePassword, setUsePassword] = useState<boolean>(false);

  const handleShare = async () => {
    if (!currentTable) return;

    setLoading(true);
    try {
      const token = await shareFile(
        currentTable,
        blob.id,
        permissions,
        expiresInDays > 0 ? expiresInDays : undefined,
        usePassword && password ? password : undefined
      );

      if (token) {
        setShareToken(token);
      }
    } catch {
      // share failed — token remains unset
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async () => {
    if (!currentTable) return;

    setLoading(true);
    try {
      await unshareFile(currentTable, blob.id);
      setShareToken(null);
    } catch {
      // unshare failed
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!shareToken) return;

    const shareUrl = `${window.location.origin}/share/${currentTable}/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getShareUrl = () => {
    if (!shareToken) return '';
    return `${window.location.origin}/share/${currentTable}/${shareToken}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Share File
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* File info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {blob.filename}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {blob.content_type} • {formatFileSize(blob.file_size)}
            </p>
          </div>

          {shareToken ? (
            /* Already shared - show link */
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                  File is currently shared
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={getShareUrl()}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                  <button
                    onClick={copyShareLink}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {blob.share_expires_at && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Expires: {new Date(blob.share_expires_at).toLocaleString()}
                </p>
              )}

              {blob.share_password && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Password protected
                </p>
              )}

              <button
                onClick={handleUnshare}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg"
              >
                {loading ? 'Removing...' : 'Stop Sharing'}
              </button>
            </div>
          ) : (
            /* Not shared - show share options */
            <div className="space-y-4">
              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permissions
                </label>
                <select
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value as SharePermission)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value="view">View Only</option>
                  <option value="download">View & Download</option>
                </select>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link Expiration
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={0}>Never expires</option>
                </select>
              </div>

              {/* Password protection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="rounded"
                  />
                  Password protect
                </label>
                {usePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                )}
              </div>

              <button
                onClick={handleShare}
                disabled={loading || (usePassword && !password)}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Creating Share Link...'
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Create Share Link
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
