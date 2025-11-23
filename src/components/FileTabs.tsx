'use client';

import { useState } from 'react';
import { FileItem, getFileIcon } from '@/hooks/useFiles';
import { useToast } from '@/hooks/useToast';

interface FileTabsProps {
  files: FileItem[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCloseFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  onAddFile: () => void;
}

export default function FileTabs({
  files,
  activeFileId,
  onSelectFile,
  onCloseFile,
  onRenameFile,
  onAddFile,
}: FileTabsProps) {
  const toast = useToast();
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  const handleStartRename = (file: FileItem, event: React.MouseEvent) => {
    event.stopPropagation();
    setRenamingFileId(file.id);
    setRenamingValue(file.name);
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

  const handleCloseFile = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (files.length === 1) {
      toast.warning('Cannot close the last file');
      return;
    }

    onCloseFile(id);
  };

  return (
    <div
      className="flex items-center overflow-x-auto px-4"
      style={{ borderBottom: '1px solid var(--border-hair)' }}
    >
      <div className="flex items-center gap-2">
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const isRenaming = file.id === renamingFileId;

          return (
            <div
              key={file.id}
              onClick={() => !isRenaming && onSelectFile(file.id)}
              className="group flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors text-xs"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-whisper)',
                backgroundColor: 'transparent',
              }}
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
                  className="flex-1 px-1 py-0.5 text-sm bg-gray-700 border border-blue-500 rounded text-white focus:outline-none"
                  autoFocus
                />
              ) : (
                <span
                  className="flex-1 text-sm truncate"
                  onDoubleClick={(e) => handleStartRename(file, e)}
                  title={file.name}
                >
                  {file.name}
                </span>
              )}

              <button
                onClick={(e) => handleCloseFile(file.id, e)}
                className={`
                  flex-shrink-0 p-0.5 rounded hover:bg-gray-700 transition-colors
                  ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
                aria-label={`Close ${file.name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
