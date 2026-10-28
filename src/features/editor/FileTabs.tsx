'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileCode2, PanelLeft, Plus, X } from 'lucide-react';
import { FileItem } from '@/features/editor/useFiles';
import { IconButton } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

interface FileTabsProps {
  files: FileItem[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCloseFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  onAddFile: () => void;
  /** Shows the file-list toggle when given. */
  onToggleFileTree?: () => void;
  fileTreeOpen?: boolean;
}

/**
 * Open files as tabs. Each tab is a button (select) plus a close button;
 * double-click or F2 renames in place.
 */
export default function FileTabs({
  files,
  activeFileId,
  onSelectFile,
  onCloseFile,
  onRenameFile,
  onAddFile,
  onToggleFileTree,
  fileTreeOpen = false,
}: FileTabsProps) {
  const t = useTranslations('files');
  const toast = useToast();
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  const startRename = (file: FileItem) => {
    setRenamingFileId(file.id);
    setRenamingValue(file.name);
  };

  const submitRename = (id: string) => {
    const next = renamingValue.trim();
    if (next && next !== files.find((f) => f.id === id)?.name) {
      if (files.some((f) => f.name === next && f.id !== id)) {
        toast.error(t('exists'));
        setRenamingFileId(null);
        return;
      }
      onRenameFile(id, next);
      toast.success(t('renamed'));
    }
    setRenamingFileId(null);
  };

  const closeFile = (id: string) => {
    if (files.length === 1) {
      toast.warning(t('lastFile'));
      return;
    }
    onCloseFile(id);
  };

  return (
    <div className="flex h-10 shrink-0 items-stretch border-b border-hair bg-surface">
      {onToggleFileTree && (
        <div className="flex items-center border-r border-hair px-1">
          <IconButton
            label={t('toggleTree')}
            icon={<PanelLeft />}
            size="sm"
            onClick={onToggleFileTree}
            aria-pressed={fileTreeOpen}
            aria-expanded={fileTreeOpen}
          />
        </div>
      )}
      <ul className="flex min-w-0 items-stretch overflow-x-auto" aria-label={t('tabs')}>
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const isRenaming = file.id === renamingFileId;
          return (
            <li
              key={file.id}
              className={`group relative flex shrink-0 items-center border-r border-hair ${
                isActive ? 'bg-void/40 text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg'
              }`}
            >
              {/* Active tab marker: a short dancheong-blue rule on top. */}
              {isActive && <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" aria-hidden="true" />}
              {isRenaming ? (
                <span className="flex items-center gap-2 pl-3 pr-1">
                  <FileCode2 className="size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                  <input
                    type="text"
                    value={renamingValue}
                    onChange={(e) => setRenamingValue(e.target.value)}
                    onBlur={() => submitRename(file.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename(file.id);
                      if (e.key === 'Escape') setRenamingFileId(null);
                    }}
                    aria-label={t('renameLabel', { name: file.name })}
                    className="h-7 w-32 rounded-sm border border-accent bg-void px-1.5 font-mono text-[13px] text-fg focus-visible:outline-offset-0"
                    autoFocus
                  />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectFile(file.id)}
                  onDoubleClick={() => startRename(file)}
                  onKeyDown={(e) => {
                    if (e.key === 'F2') {
                      e.preventDefault();
                      startRename(file);
                    }
                  }}
                  aria-current={isActive ? 'true' : undefined}
                  title={t('renameHint')}
                  className="flex h-full items-center gap-2 pl-3 pr-1 font-mono text-[13px]"
                >
                  <FileCode2 className={`size-3.5 shrink-0 ${isActive ? 'text-accent-text' : ''}`} aria-hidden="true" />
                  <span className="max-w-40 truncate">{file.name}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => closeFile(file.id)}
                className={`mr-1 inline-flex size-6 items-center justify-center rounded-sm text-fg-muted hover:bg-hover hover:text-fg focus-visible:opacity-100 ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                }`}
                aria-label={t('close', { name: file.name })}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center px-1">
        <IconButton label={t('add')} icon={<Plus />} size="sm" onClick={onAddFile} />
      </div>
    </div>
  );
}
