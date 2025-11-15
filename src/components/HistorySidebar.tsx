'use client';

import { useState, useRef } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { HistoryItem } from '@/lib/history';
import { useToast } from '@/hooks/useToast';
import { Language } from '@/lib/api';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadHistory: (item: HistoryItem) => void;
  languages: Language[];
}

export default function HistorySidebar({ isOpen, onClose, onLoadHistory, languages }: HistorySidebarProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    filteredItems,
    stats,
    searchQuery,
    selectedLanguage,
    selectedStatus,
    setSearchQuery,
    setSelectedLanguage,
    setSelectedStatus,
    deleteItem,
    clearAll,
    exportToJson,
    importFromJson,
  } = useHistory();

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleLoadItem = (item: HistoryItem) => {
    onLoadHistory(item);
    onClose();
    toast.success('History loaded successfully');
  };

  const handleDeleteItem = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteItem(id);
    toast.success('History item deleted');
  };

  const handleClearAll = () => {
    clearAll();
    setShowConfirmClear(false);
    toast.success('All history cleared');
  };

  const handleExport = () => {
    exportToJson();
    toast.success('History exported');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        importFromJson(json);
        toast.success('History imported successfully');
      } catch (error) {
        toast.error('Failed to import history');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // More than 1 day
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const truncateCode = (code: string, maxLength: number = 50) => {
    if (code.length <= maxLength) return code;
    return code.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-96 bg-gray-900 border-l border-gray-800 z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Execution History</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              aria-label="Close history sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
            <div className="bg-gray-800 rounded p-2 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-gray-400">Total</div>
            </div>
            <div className="bg-green-900/20 border border-green-500 rounded p-2 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.successful}</div>
              <div className="text-gray-400">Success</div>
            </div>
            <div className="bg-red-900/20 border border-red-500 rounded p-2 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-gray-400">Failed</div>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm mb-3"
            aria-label="Search history by code content"
          />

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              aria-label="Filter history by programming language"
            >
              <option value="">All Languages</option>
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'success' | 'failed')}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              aria-label="Filter history by execution status"
            >
              <option value="all">All Status</option>
              <option value="success">Success Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 px-3 py-2 text-xs font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
              aria-label="Export history to JSON file"
            >
              Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-3 py-2 text-xs font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
              aria-label="Import history from JSON file"
            >
              Import
            </button>
            <button
              onClick={() => setShowConfirmClear(true)}
              className="flex-1 px-3 py-2 text-xs font-medium text-red-400 bg-red-900/20 border border-red-500 rounded hover:bg-red-900/30 transition-colors"
              aria-label="Clear all history items"
            >
              Clear All
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            aria-label="Select history JSON file to import"
          />
        </div>

        {/* History Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No history items found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleLoadItem(item)}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-blue-500 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.success ? (
                        <span className="text-green-400 text-lg">✓</span>
                      ) : (
                        <span className="text-red-400 text-lg">✗</span>
                      )}
                      <span className="text-sm font-medium text-white">
                        {languages.find(l => l.id === item.language)?.name || item.language}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                      aria-label="Delete history item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="text-xs text-gray-400 font-mono mb-2">
                    {truncateCode(item.code)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatTimestamp(item.timestamp)}</span>
                    <span>{item.output.metrics ? `${item.output.metrics.run_time_ms}ms` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Clear Modal */}
      {showConfirmClear && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-labelledby="clear-confirm-title"
          aria-describedby="clear-confirm-description"
          aria-modal="true"
        >
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 id="clear-confirm-title" className="text-lg font-bold text-white mb-4">Clear All History?</h3>
            <p id="clear-confirm-description" className="text-sm text-gray-400 mb-6">
              This will permanently delete all {stats.total} history items. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="Cancel clearing history"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                aria-label="Confirm clearing all history items"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
