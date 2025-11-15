'use client';

import { useState } from 'react';
import { FileItem, getFileIcon } from '@/hooks/useFiles';
import { useToast } from '@/hooks/useToast';

interface FileTreeProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileItem[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFile: () => void;
  onRenameFile: (id: string, newName: string) => void;
  onDeleteFile: (id: string) => void;
}

export default function FileTree({
  isOpen,
  onClose,
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onRenameFile,
  onDeleteFile,
}: FileTreeProps) {
  const toast = useToast();
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const [contextMenuFileId, setContextMenuFileId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  const handleSelectFile = (id: string) => {
    if (renamingFileId !== id) {
      onSelectFile(id);
    }
  };

  const handleStartRename = (file: FileItem) => {
    setRenamingFileId(file.id);
    setRenamingValue(file.name);
    setContextMenuFileId(null);
    setContextMenuPosition(null);
  };

  const handleRenameSubmit = (id: string) => {
    if (renamingValue.trim() && renamingValue !== files.find(f => f.id === id)?.name) {
      // Check if file name already exists
      if (files.some(f => f.name === renamingValue.trim() && f.id !== id)) {
        toast.error('File name already exists');
        setRenamingFileId(null);
        return;
      }

      onRenameFile(id, renamingValue.trim());
      toast.success('File renamed');
    }
    setRenamingFileId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(id);
    } else if (e.key === 'Escape') {
      setRenamingFileId(null);
    }
  };

  const handleDeleteFile = (id: string) => {
    if (files.length === 1) {
      toast.warning('Cannot delete the last file');
      return;
    }

    onDeleteFile(id);
    toast.success('File deleted');
    setContextMenuFileId(null);
    setContextMenuPosition(null);
  };

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setContextMenuFileId(fileId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenuFileId(null);
    setContextMenuPosition(null);
  };

  // Close context menu when clicking outside
  const handleClickOutside = () => {
    handleCloseContextMenu();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed lg:relative top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Files</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors lg:hidden"
              aria-label="Close file tree"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* New File Button */}
          <button
            onClick={onAddFile}
            className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            aria-label="Create new file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New File
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2" onClick={handleClickOutside}>
          {files.length === 0 ? (
            <div className="text-center text-gray-500 mt-8 px-4">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No files</p>
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => {
                const isActive = file.id === activeFileId;
                const isRenaming = file.id === renamingFileId;

                return (
                  <div
                    key={file.id}
                    onClick={() => handleSelectFile(file.id)}
                    onContextMenu={(e) => handleContextMenu(e, file.id)}
                    className={`
                      group flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors
                      ${isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                      }
                    `}
                  >
                    <span className="text-lg flex-shrink-0">{getFileIcon(file.name)}</span>

                    {isRenaming ? (
                      <input
                        type="text"
                        value={renamingValue}
                        onChange={(e) => setRenamingValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(file.id)}
                        onKeyDown={(e) => handleRenameKeyDown(e, file.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-1 text-sm bg-gray-700 border border-blue-500 rounded text-white focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1 text-sm truncate" title={file.name}>
                        {file.name}
                      </span>
                    )}

                    {!isRenaming && isActive && (
                      <div className="flex-shrink-0 w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* File count */}
        <div className="p-3 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </p>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenuFileId && contextMenuPosition && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={handleCloseContextMenu}
          />
          <div
            className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-[70] min-w-[150px]"
            style={{
              top: `${contextMenuPosition.y}px`,
              left: `${contextMenuPosition.x}px`,
            }}
          >
            <button
              onClick={() => {
                const file = files.find(f => f.id === contextMenuFileId);
                if (file) handleStartRename(file);
              }}
              className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              aria-label="Rename file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename
            </button>
            <button
              onClick={() => handleDeleteFile(contextMenuFileId)}
              className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
              aria-label="Delete file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}
