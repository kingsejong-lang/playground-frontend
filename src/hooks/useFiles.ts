/**
 * Custom hook for managing multiple files in the editor
 */

import { useState, useCallback } from 'react';

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
}

/**
 * Hook for managing multiple files
 */
export function useFiles(initialFileName: string = 'main.ksj', initialContent: string = ''): UseFilesReturn {
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: generateFileId(),
      name: initialFileName,
      content: initialContent,
    },
  ]);
  const [activeFileId, setActiveFileId] = useState<string | null>(files[0]?.id || null);

  // Get active file
  const activeFile = files.find(f => f.id === activeFileId) || null;

  // Add new file
  const addFile = useCallback((name: string, content: string = '') => {
    const newFile: FileItem = {
      id: generateFileId(),
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
          id: generateFileId(),
          name: 'main.ksj',
          content: '',
        };
        setActiveFileId(defaultFile.id);
        return [defaultFile];
      }

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
      id: generateFileId(),
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
      id: generateFileId(),
      name: 'main.ksj',
      content: '',
    };
    setFiles([defaultFile]);
    setActiveFileId(defaultFile.id);
  }, []);

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
  };
}

/**
 * Generate unique file ID
 */
function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Get file icon based on extension
 */
export function getFileIcon(filename: string): string {
  const ext = getFileExtension(filename).toLowerCase();

  const iconMap: Record<string, string> = {
    // Kingsejong
    'ks': '👑',
    'ksj': '👑',
    // Python
    'py': '🐍',
    'pyw': '🐍',
    // JavaScript/TypeScript
    'js': '📜',
    'jsx': '⚛️',
    'ts': '📘',
    'tsx': '⚛️',
    // Go
    'go': '🔵',
    // C/C++
    'c': '©️',
    'cpp': '©️',
    'h': '©️',
    'hpp': '©️',
    // Rust
    'rs': '🦀',
    // Java
    'java': '☕',
    // Other
    'txt': '📄',
    'md': '📝',
    'json': '{}',
    'xml': '🏷️',
    'html': '🌐',
    'css': '🎨',
  };

  return iconMap[ext] || '📄';
}
