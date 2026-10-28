/**
 * Custom hook for managing multiple files in the editor
 */

import { useState, useCallback } from 'react';
import { generateId } from '@/lib/utils/string';

export interface FileItem {
  id: string;
  name: string;
  content: string;
  language?: string;
}

export interface UseFilesReturn {
  files: FileItem[];
  activeFileId: string | null;
  activeFile: FileItem | null;
  addFile: (name: string, content?: string) => void;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string) => void;
  getFilesObject: () => Record<string, string>;
  loadFiles: (filesObject: Record<string, string>) => void;
  clearFiles: () => void;
  /** File chosen as the run entry; null means "use the default rule" (see entry.ts). */
  entryFileId: string | null;
  entryFile: FileItem | null;
  setEntryFile: (id: string | null) => void;
  /** Replaces the whole workspace (draft restore, shared code); entry/active are file names. */
  replaceFiles: (files: { name: string; content: string }[], options?: { entry?: string; active?: string }) => void;
}

/**
 * Hook for managing multiple files
 */
export function useFiles(initialFileName: string = 'main.ksj', initialContent: string = ''): UseFilesReturn {
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: generateId('file'),
      name: initialFileName,
      content: initialContent,
    },
  ]);
  const [activeFileId, setActiveFileId] = useState<string | null>(files[0]?.id || null);
  const [entryFileId, setEntryFileId] = useState<string | null>(null);

  // Get active file
  const activeFile = files.find(f => f.id === activeFileId) || null;
  const entryFile = files.find(f => f.id === entryFileId) || null;

  // Add new file
  const addFile = useCallback((name: string, content: string = '') => {
    const newFile: FileItem = {
      id: generateId('file'),
      name,
      content,
    };

    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, []);

  // Delete file
  const deleteFile = useCallback((id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);

      // If no files left, create a default file
      if (filtered.length === 0) {
        const defaultFile: FileItem = {
          id: generateId('file'),
          name: 'main.ksj',
          content: '',
        };
        setActiveFileId(defaultFile.id);
        return [defaultFile];
      }

      // A deleted entry falls back to the default rule.
      setEntryFileId((current) => (current === id ? null : current));

      // If active file was deleted, switch to first file
      if (id === activeFileId) {
        setActiveFileId(filtered[0].id);
      }

      return filtered;
    });
  }, [activeFileId]);

  // Rename file
  const renameFile = useCallback((id: string, newName: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, name: newName } : f
    ));
  }, []);

  // Update file content
  const updateFileContent = useCallback((id: string, content: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, content } : f
    ));
  }, []);

  // Set active file
  const setActiveFile = useCallback((id: string) => {
    setActiveFileId(id);
  }, []);

  // Get files as object (for API)
  const getFilesObject = useCallback((): Record<string, string> => {
    const result: Record<string, string> = {};
    files.forEach(file => {
      result[file.name] = file.content;
    });
    return result;
  }, [files]);

  // Load files from object
  const loadFiles = useCallback((filesObject: Record<string, string>) => {
    const newFiles: FileItem[] = Object.entries(filesObject).map(([name, content]) => ({
      id: generateId('file'),
      name,
      content,
    }));

    if (newFiles.length > 0) {
      setFiles(newFiles);
      setActiveFileId(newFiles[0].id);
    }
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    const defaultFile: FileItem = {
      id: generateId('file'),
      name: 'main.ksj',
      content: '',
    };
    setFiles([defaultFile]);
    setActiveFileId(defaultFile.id);
  }, []);

  const setEntryFile = useCallback((id: string | null) => {
    setEntryFileId(id);
  }, []);

  const replaceFiles = useCallback(
    (next: { name: string; content: string }[], options: { entry?: string; active?: string } = {}) => {
      if (next.length === 0) return;
      const items = next.map((f) => ({ id: generateId('file'), name: f.name, content: f.content }));
      setFiles(items);
      setActiveFileId((items.find((f) => f.name === options.active) ?? items[0]).id);
      setEntryFileId(items.find((f) => f.name === options.entry)?.id ?? null);
    },
    []
  );

  return {
    files,
    activeFileId,
    activeFile,
    addFile,
    deleteFile,
    renameFile,
    updateFileContent,
    setActiveFile,
    getFilesObject,
    loadFiles,
    clearFiles,
    entryFileId,
    entryFile,
    setEntryFile,
    replaceFiles,
  };
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}
