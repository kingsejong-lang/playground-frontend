import { renderHook, act } from '@testing-library/react'
import { useFiles, getFileExtension, getFileIcon } from '../useFiles'

describe('useFiles', () => {
  describe('initial state', () => {
    it('should initialize with default file', () => {
      const { result } = renderHook(() => useFiles())

      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0].name).toBe('main.ks')
      expect(result.current.files[0].content).toBe('')
      expect(result.current.activeFileId).toBe(result.current.files[0].id)
      expect(result.current.activeFile).toEqual(result.current.files[0])
    })

    it('should initialize with custom file name and content', () => {
      const { result } = renderHook(() => useFiles('test.py', 'print("hello")'))

      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0].name).toBe('test.py')
      expect(result.current.files[0].content).toBe('print("hello")')
    })
  })

  describe('addFile', () => {
    it('should add new file with default content', () => {
      const { result } = renderHook(() => useFiles())

      act(() => {
        result.current.addFile('test.py')
      })

      expect(result.current.files).toHaveLength(2)
      expect(result.current.files[1].name).toBe('test.py')
      expect(result.current.files[1].content).toBe('')
    })

    it('should add new file with custom content', () => {
      const { result } = renderHook(() => useFiles())

      act(() => {
        result.current.addFile('test.py', 'print("hello")')
      })

      expect(result.current.files).toHaveLength(2)
      expect(result.current.files[1].name).toBe('test.py')
      expect(result.current.files[1].content).toBe('print("hello")')
    })

    it('should set new file as active', () => {
      const { result } = renderHook(() => useFiles())
      const originalActiveId = result.current.activeFileId

      act(() => {
        result.current.addFile('test.py')
      })

      expect(result.current.activeFileId).not.toBe(originalActiveId)
      expect(result.current.activeFile?.name).toBe('test.py')
    })
  })

  describe('deleteFile', () => {
    it('should delete file by id', () => {
      const { result } = renderHook(() => useFiles())

      act(() => {
        result.current.addFile('test.py')
      })

      expect(result.current.files).toHaveLength(2)

      const fileToDelete = result.current.files[0]

      act(() => {
        result.current.deleteFile(fileToDelete.id)
      })

      expect(result.current.files).toHaveLength(1)
      expect(result.current.files.find(f => f.id === fileToDelete.id)).toBeUndefined()
    })

    it('should switch to first file when active file is deleted', () => {
      const { result } = renderHook(() => useFiles())

      act(() => {
        result.current.addFile('test.py')
      })

      const firstFile = result.current.files[0]
      const activeFileId = result.current.activeFileId

      act(() => {
        result.current.deleteFile(activeFileId!)
      })

      expect(result.current.activeFileId).toBe(firstFile.id)
      expect(result.current.activeFile?.id).toBe(firstFile.id)
    })

    it('should create default file when deleting last file', () => {
      const { result } = renderHook(() => useFiles())

      const fileId = result.current.files[0].id

      act(() => {
        result.current.deleteFile(fileId)
      })

      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0].name).toBe('main.ks')
      expect(result.current.files[0].content).toBe('')
      expect(result.current.activeFileId).toBe(result.current.files[0].id)
    })
  })

  describe('renameFile', () => {
    it('should rename file', () => {
      const { result } = renderHook(() => useFiles())

      const fileId = result.current.files[0].id

      act(() => {
        result.current.renameFile(fileId, 'renamed.py')
      })

      expect(result.current.files[0].name).toBe('renamed.py')
      expect(result.current.files[0].id).toBe(fileId)
    })

    it('should not affect other files', () => {
      const { result } = renderHook(() => useFiles())

      act(() => {
        result.current.addFile('test1.py')
        result.current.addFile('test2.py')
      })

      const fileToRename = result.current.files[1]

      act(() => {
        result.current.renameFile(fileToRename.id, 'renamed.py')
      })

      expect(result.current.files[0].name).toBe('main.ks')
      expect(result.current.files[1].name).toBe('renamed.py')
      expect(result.current.files[2].name).toBe('test2.py')
    })
  })

  describe('updateFileContent', () => {
    it('should update file content', () => {
      const { result } = renderHook(() => useFiles())

      const fileId = result.current.files[0].id

      act(() => {
        result.current.updateFileContent(fileId, 'new content')
      })

      expect(result.current.files[0].content).toBe('new content')
      expect(result.current.files[0].id).toBe(fileId)
    })

    it('should not affect other files', () => {
      const { result } = renderHook(() => useFiles())

      act(() => {
        result.current.addFile('test1.py', 'content1')
        result.current.addFile('test2.py', 'content2')
      })

      const fileToUpdate = result.current.files[1]

      act(() => {
        result.current.updateFileContent(fileToUpdate.id, 'updated content')
      })

      expect(result.current.files[0].content).toBe('')
      expect(result.current.files[1].content).toBe('updated content')
      expect(result.current.files[2].content).toBe('content2')
    })
  })

  describe('setActiveFile', () => {
    it('should change active file', () => {
      const { result } = renderHook(() => useFiles())

      act(() => {
        result.current.addFile('test.py')
      })

      const firstFileId = result.current.files[0].id

      act(() => {
        result.current.setActiveFile(firstFileId)
      })

      expect(result.current.activeFileId).toBe(firstFileId)
      expect(result.current.activeFile?.id).toBe(firstFileId)
    })
  })

  describe('getFilesObject', () => {
    it('should return files as object with filename keys', () => {
      const { result } = renderHook(() => useFiles('main.ks', 'content1'))

      act(() => {
        result.current.addFile('test.py', 'content2')
      })

      const filesObject = result.current.getFilesObject()

      expect(filesObject).toEqual({
        'main.ks': 'content1',
        'test.py': 'content2',
      })
    })

    it('should return empty object for no files', () => {
      const { result } = renderHook(() => useFiles('main.ks', ''))

      act(() => {
        result.current.deleteFile(result.current.files[0].id)
      })

      const defaultFileId = result.current.files[0].id

      act(() => {
        result.current.updateFileContent(defaultFileId, '')
      })

      const filesObject = result.current.getFilesObject()

      expect(filesObject['main.ks']).toBe('')
    })
  })

  describe('loadFiles', () => {
    it('should load files from object', () => {
      const { result } = renderHook(() => useFiles())

      const filesObject = {
        'file1.py': 'content1',
        'file2.js': 'content2',
        'file3.ks': 'content3',
      }

      act(() => {
        result.current.loadFiles(filesObject)
      })

      expect(result.current.files).toHaveLength(3)
      expect(result.current.files[0].name).toBe('file1.py')
      expect(result.current.files[0].content).toBe('content1')
      expect(result.current.files[1].name).toBe('file2.js')
      expect(result.current.files[1].content).toBe('content2')
      expect(result.current.files[2].name).toBe('file3.ks')
      expect(result.current.files[2].content).toBe('content3')
    })

    it('should set first loaded file as active', () => {
      const { result } = renderHook(() => useFiles())

      const filesObject = {
        'file1.py': 'content1',
        'file2.js': 'content2',
      }

      act(() => {
        result.current.loadFiles(filesObject)
      })

      expect(result.current.activeFileId).toBe(result.current.files[0].id)
      expect(result.current.activeFile?.name).toBe('file1.py')
    })

    it('should replace existing files', () => {
      const { result } = renderHook(() => useFiles())

      act(() => {
        result.current.addFile('existing.py')
      })

      expect(result.current.files).toHaveLength(2)

      const filesObject = {
        'new1.py': 'new content 1',
        'new2.py': 'new content 2',
      }

      act(() => {
        result.current.loadFiles(filesObject)
      })

      expect(result.current.files).toHaveLength(2)
      expect(result.current.files[0].name).toBe('new1.py')
      expect(result.current.files[1].name).toBe('new2.py')
    })

    it('should handle empty object', () => {
      const { result } = renderHook(() => useFiles())

      const originalFilesLength = result.current.files.length

      act(() => {
        result.current.loadFiles({})
      })

      expect(result.current.files).toHaveLength(originalFilesLength)
    })
  })

  describe('clearFiles', () => {
    it('should clear all files and create default file', () => {
      const { result } = renderHook(() => useFiles())

      act(() => {
        result.current.addFile('test1.py', 'content1')
        result.current.addFile('test2.py', 'content2')
      })

      expect(result.current.files).toHaveLength(3)

      act(() => {
        result.current.clearFiles()
      })

      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0].name).toBe('main.ks')
      expect(result.current.files[0].content).toBe('')
      expect(result.current.activeFileId).toBe(result.current.files[0].id)
    })
  })

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('test.py')).toBe('py')
      expect(getFileExtension('script.js')).toBe('js')
      expect(getFileExtension('main.ks')).toBe('ks')
    })

    it('should handle multiple dots', () => {
      expect(getFileExtension('archive.tar.gz')).toBe('gz')
    })

    it('should return empty string for no extension', () => {
      expect(getFileExtension('README')).toBe('')
    })

    it('should handle dotfiles', () => {
      expect(getFileExtension('.gitignore')).toBe('gitignore')
    })
  })

  describe('getFileIcon', () => {
    it('should return correct icon for known extensions', () => {
      expect(getFileIcon('main.ks')).toBe('👑')
      expect(getFileIcon('script.py')).toBe('🐍')
      expect(getFileIcon('app.js')).toBe('📜')
      expect(getFileIcon('component.tsx')).toBe('⚛️')
      expect(getFileIcon('main.go')).toBe('🔵')
      expect(getFileIcon('lib.rs')).toBe('🦀')
    })

    it('should be case insensitive', () => {
      expect(getFileIcon('Script.PY')).toBe('🐍')
      expect(getFileIcon('Main.KS')).toBe('👑')
    })

    it('should return default icon for unknown extensions', () => {
      expect(getFileIcon('file.unknown')).toBe('📄')
      expect(getFileIcon('noextension')).toBe('📄')
    })
  })
})
