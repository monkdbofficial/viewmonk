'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileImage, FileText, Table, Code, Share2, Link as LinkIcon, Mail } from 'lucide-react';

interface ExportPanelProps {
  dashboardName: string;
  onExport: (format: string) => void;
}

export default function ExportPanel({ dashboardName, onExport }: ExportPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl] = useState(`https://dashboard.example.com/share/${Math.random().toString(36).substring(7)}`);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
        setShowShareModal(false);
      }
    }

    if (showPanel || showShareModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPanel, showShareModal]);

  const exportOptions = [
    {
      format: 'pdf',
      icon: FileText,
      label: 'Export as PDF',
      description: 'Download dashboard as PDF document',
      color: 'text-red-600 dark:text-red-400',
    },
    {
      format: 'png',
      icon: FileImage,
      label: 'Export as PNG',
      description: 'Download dashboard as image',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      format: 'csv',
      icon: Table,
      label: 'Export Data (CSV)',
      description: 'Download raw data as CSV',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      format: 'json',
      icon: Code,
      label: 'Export Config (JSON)',
      description: 'Download dashboard configuration',
      color: 'text-purple-600 dark:text-purple-400',
    },
  ];

  const handleExport = (format: string) => {
    onExport(format);
    setShowPanel(false);
    // Show toast notification
    alert(`Exporting dashboard as ${format.toUpperCase()}...`);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Export Button - Icon Only */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="group relative p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all"
        title="Export Dashboard"
      >
        <Download className="h-4 w-4" />
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Export
        </span>
      </button>

      {/* Export Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-96 rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95" style={{ zIndex: 9999 }}>
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Export Dashboard
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {dashboardName}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left shadow-sm hover:shadow-md group"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${option.color} flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {option.description}
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="border-t border-gray-200 dark:border-gray-700 my-3" />

            {/* Share Options */}
            <button
              onClick={() => {
                setShowShareModal(true);
                setShowPanel(false);
              }}
              className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left shadow-sm hover:shadow-md group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
                <Share2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  Share Dashboard
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Get a shareable link
                </div>
              </div>
            </button>

            <button
              onClick={() => alert('Schedule report feature coming soon!')}
              className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all text-left shadow-sm hover:shadow-md group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  Schedule Email Report
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Set up automated reports
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200/50 dark:border-gray-700/50">
            <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Share Dashboard
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Public Link
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    onClick={copyShareLink}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                  Anyone with this link can view the dashboard
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                <p className="text-xs text-blue-900 dark:text-blue-200 font-medium">
                  💡 <strong>Tip:</strong> Share links are read-only and don't require login
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700/50 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
