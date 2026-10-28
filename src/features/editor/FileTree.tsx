'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileCode2, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { FileMenu, useFileMenu } from './FileMenu';
import { FileItem } from '@/features/editor/useFiles';
import { Button, IconButton } from '@/components/ui/Button';
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
  /** Resolved entry file (see entry.ts). */
  entryFileId?: string | null;
  onSetEntry?: (id: string) => void;
}

/**
 * File list beside the editor (an overlay drawer below the lg breakpoint).
 * Rename and delete are row buttons, so they work from the keyboard.
 */
export default function FileTree({
  isOpen,
  onClose,
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onRenameFile,
  onDeleteFile,
  entryFileId = null,
  onSetEntry,
}: FileTreeProps) {
  const menu = useFileMenu();
  const t = useTranslations('files');
  const tc = useTranslations('common');
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

  const deleteFile = (id: string) => {
    if (files.length === 1) {
      toast.warning(t('lastFile'));
      return;
    }
    onDeleteFile(id);
    toast.success(t('deleted'));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-scrim lg:hidden" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-hair bg-surface lg:relative lg:z-auto"
        aria-label={t('treeTitle')}
      >
        <div className="flex h-10 items-center justify-between border-b border-hair pl-4 pr-1">
          <h2 className="text-[13px] font-semibold text-fg-secondary">{t('treeTitle')}</h2>
          <div className="flex items-center">
            <IconButton label={t('add')} icon={<Plus />} size="sm" onClick={onAddFile} />
            <IconButton label={tc('close')} icon={<X />} size="sm" onClick={onClose} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {files.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-fg-muted">
              <p>{t('empty')}</p>
              <Button size="sm" className="mt-3" icon={<Plus />} onClick={onAddFile}>
                {t('add')}
              </Button>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {files.map((file) => {
                const isActive = file.id === activeFileId;
                const isRenaming = file.id === renamingFileId;
                return (
                  <li
                    key={file.id}
                    className={`group flex items-center gap-1 rounded-md pr-1 ${
                      isActive ? 'bg-accent-soft text-fg' : 'text-fg-secondary hover:bg-hover hover:text-fg'
                    }`}
                  >
                    {isRenaming ? (
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
                        className="m-1 h-7 min-w-0 flex-1 rounded-sm border border-accent bg-void px-2 font-mono text-[13px] text-fg"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectFile(file.id)}
                        onContextMenu={onSetEntry ? (e) => menu.open(e, file.id) : undefined}
                        onDoubleClick={() => startRename(file)}
                        onKeyDown={(e) => {
                          if (e.key === 'F2') {
                            e.preventDefault();
                            startRename(file);
                          }
                        }}
                        aria-current={isActive ? 'true' : undefined}
                        className="flex h-8 min-w-0 flex-1 items-center gap-2 px-2 text-left font-mono text-[13px]"
                      >
                        {file.id === entryFileId ? (
                          <Play className="size-3.5 shrink-0 fill-current text-accent-text" aria-hidden="true" />
                        ) : (
                          <FileCode2 className={`size-3.5 shrink-0 ${isActive ? 'text-accent-text' : 'text-fg-muted'}`} aria-hidden="true" />
                        )}
                        <span className="truncate">{file.name}</span>
                        {file.id === entryFileId && <span className="ml-auto shrink-0 pl-2 font-sans text-xs text-fg-muted">{t('entry')}</span>}
                      </button>
                    )}
                    {!isRenaming && (
                      <span className="flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100">
                        {onSetEntry && file.id !== entryFileId && (
                          <IconButton label={`${t('setEntry')}: ${file.name}`} icon={<Play />} size="sm" className="size-7" onClick={() => onSetEntry(file.id)} />
                        )}
                        <IconButton label={`${tc('rename')}: ${file.name}`} icon={<Pencil />} size="sm" className="size-7" onClick={() => startRename(file)} />
                        <IconButton label={`${tc('delete')}: ${file.name}`} icon={<Trash2 />} size="sm" className="size-7 hover:text-err" onClick={() => deleteFile(file.id)} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="border-t border-hair px-4 py-2 text-xs text-fg-muted">{t('count', { count: files.length })}</p>
      </aside>
      {onSetEntry && (
        <FileMenu
          menu={menu}
          entryFileId={entryFileId}
          fileName={(id) => files.find((f) => f.id === id)?.name ?? ''}
          onSetEntry={onSetEntry}
          onRename={(id) => {
            const file = files.find((f) => f.id === id);
            if (file) startRename(file);
          }}
          onRemove={deleteFile}
          removeLabel={tc('delete')}
        />
      )}
    </>
  );
}
