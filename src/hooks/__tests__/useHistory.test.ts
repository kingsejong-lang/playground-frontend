import { renderHook, act, waitFor } from '@testing-library/react'
import { useHistory } from '../useHistory'
import * as historyLib from '@/lib/history'

// Mock the history library
jest.mock('@/lib/history', () => ({
  getHistoryItems: jest.fn(),
  addHistoryItem: jest.fn(),
  deleteHistoryItem: jest.fn(),
  clearHistory: jest.fn(),
  searchHistory: jest.fn(),
  filterHistoryByLanguage: jest.fn(),
  filterHistoryByStatus: jest.fn(),
  exportHistoryToJson: jest.fn(),
  importHistoryFromJson: jest.fn(),
  getHistoryStats: jest.fn(),
}))

const mockHistoryItems = [
  {
    id: '1',
    code: 'print("hello")',
    language: 'python',
    output: 'hello\n',
    success: true,
    timestamp: new Date('2024-01-01T10:00:00Z').getTime(),
  },
  {
    id: '2',
    code: 'console.log("world")',
    language: 'javascript',
    output: 'world\n',
    success: true,
    timestamp: new Date('2024-01-01T11:00:00Z').getTime(),
  },
  {
    id: '3',
    code: 'error code',
    language: 'python',
    output: 'Error: something went wrong',
    success: false,
    timestamp: new Date('2024-01-01T12:00:00Z').getTime(),
  },
]

const mockStats = {
  total: 3,
  successful: 2,
  failed: 1,
  byLanguage: {
    python: 2,
    javascript: 1,
  },
}

describe('useHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(historyLib.getHistoryItems as jest.Mock).mockReturnValue(mockHistoryItems)
    ;(historyLib.getHistoryStats as jest.Mock).mockReturnValue(mockStats)
    ;(historyLib.searchHistory as jest.Mock).mockImplementation((query) =>
      mockHistoryItems.filter(item => item.code.includes(query))
    )
  })

  describe('initial state', () => {
    it('should load history items on mount', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toEqual(mockHistoryItems)
      })

      expect(historyLib.getHistoryItems).toHaveBeenCalled()
    })

    it('should initialize with empty filters', () => {
      const { result } = renderHook(() => useHistory())

      expect(result.current.searchQuery).toBe('')
      expect(result.current.selectedLanguage).toBe('')
      expect(result.current.selectedStatus).toBe('all')
    })

    it('should load stats', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats)
      })
    })
  })

  describe('addItem', () => {
    it('should add new history item', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      const newItem = {
        code: 'new code',
        language: 'go',
        output: 'output',
        success: true,
      }

      const addedItem = {
        ...newItem,
        id: '4',
        timestamp: Date.now(),
      }

      ;(historyLib.addHistoryItem as jest.Mock).mockReturnValue(addedItem)
      ;(historyLib.getHistoryItems as jest.Mock).mockReturnValue([
        ...mockHistoryItems,
        addedItem,
      ])

      let returnedItem: any

      await act(async () => {
        returnedItem = result.current.addItem(newItem)
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(4)
      })

      expect(historyLib.addHistoryItem).toHaveBeenCalledWith(newItem)
      expect(returnedItem).toEqual(addedItem)
    })
  })

  describe('deleteItem', () => {
    it('should delete history item', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      ;(historyLib.getHistoryItems as jest.Mock).mockReturnValue(mockHistoryItems.slice(1))

      await act(async () => {
        result.current.deleteItem('1')
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      expect(historyLib.deleteHistoryItem).toHaveBeenCalledWith('1')
    })
  })

  describe('clearAll', () => {
    it('should clear all history', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      ;(historyLib.getHistoryItems as jest.Mock).mockReturnValue([])

      await act(async () => {
        result.current.clearAll()
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(0)
      })

      expect(historyLib.clearHistory).toHaveBeenCalled()
    })
  })

  describe('filtering', () => {
    it('should filter by search query', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      await waitFor(() => {
        result.current.setSearchQuery('print')
      })

      await waitFor(() => {
        expect(result.current.searchQuery).toBe('print')
      })

      expect(historyLib.searchHistory).toHaveBeenCalledWith('print')
    })

    it('should filter by language', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      await waitFor(() => {
        result.current.setSelectedLanguage('python')
      })

      await waitFor(() => {
        expect(result.current.selectedLanguage).toBe('python')
        expect(result.current.filteredItems).toHaveLength(2)
        expect(result.current.filteredItems.every(item => item.language === 'python')).toBe(true)
      })
    })

    it('should filter by success status', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      await waitFor(() => {
        result.current.setSelectedStatus('success')
      })

      await waitFor(() => {
        expect(result.current.selectedStatus).toBe('success')
        expect(result.current.filteredItems).toHaveLength(2)
        expect(result.current.filteredItems.every(item => item.success)).toBe(true)
      })
    })

    it('should filter by failed status', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      await waitFor(() => {
        result.current.setSelectedStatus('failed')
      })

      await waitFor(() => {
        expect(result.current.selectedStatus).toBe('failed')
        expect(result.current.filteredItems).toHaveLength(1)
        expect(result.current.filteredItems.every(item => !item.success)).toBe(true)
      })
    })

    it('should show all items when status is "all"', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      await waitFor(() => {
        result.current.setSelectedStatus('all')
      })

      await waitFor(() => {
        expect(result.current.filteredItems).toHaveLength(3)
      })
    })

    it('should apply multiple filters', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      await waitFor(() => {
        result.current.setSelectedLanguage('python')
        result.current.setSelectedStatus('success')
      })

      await waitFor(() => {
        expect(result.current.filteredItems).toHaveLength(1)
        expect(result.current.filteredItems[0].language).toBe('python')
        expect(result.current.filteredItems[0].success).toBe(true)
      })
    })
  })

  describe('exportToJson', () => {
    it('should export history to JSON file', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      const mockJsonString = JSON.stringify(mockHistoryItems)
      ;(historyLib.exportHistoryToJson as jest.Mock).mockReturnValue(mockJsonString)

      // Mock DOM APIs
      const mockUrl = 'blob:mock-url'
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      } as any

      const originalCreateElement = document.createElement.bind(document)
      const originalAppendChild = document.body.appendChild.bind(document.body)
      const originalRemoveChild = document.body.removeChild.bind(document.body)
      const originalCreateObjectURL = global.URL.createObjectURL
      const originalRevokeObjectURL = global.URL.revokeObjectURL

      global.URL.createObjectURL = jest.fn(() => mockUrl)
      global.URL.revokeObjectURL = jest.fn()
      document.createElement = jest.fn((tag) => {
        if (tag === 'a') return mockAnchor
        return originalCreateElement(tag)
      }) as any
      document.body.appendChild = jest.fn()
      document.body.removeChild = jest.fn()

      await act(async () => {
        result.current.exportToJson()
      })

      expect(historyLib.exportHistoryToJson).toHaveBeenCalled()
      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)

      // Restore originals
      document.createElement = originalCreateElement as any
      document.body.appendChild = originalAppendChild as any
      document.body.removeChild = originalRemoveChild as any
      global.URL.createObjectURL = originalCreateObjectURL
      global.URL.revokeObjectURL = originalRevokeObjectURL
    })
  })

  describe('importFromJson', () => {
    it('should import history from JSON', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      const importedItems = [
        {
          id: '10',
          code: 'imported code',
          language: 'rust',
          output: 'output',
          success: true,
          timestamp: Date.now(),
        },
      ]

      const jsonString = JSON.stringify(importedItems)

      ;(historyLib.getHistoryItems as jest.Mock).mockReturnValue(importedItems)

      await act(async () => {
        result.current.importFromJson(jsonString)
      })

      await waitFor(() => {
        expect(result.current.items).toEqual(importedItems)
      })

      expect(historyLib.importHistoryFromJson).toHaveBeenCalledWith(jsonString)
    })
  })

  describe('refresh', () => {
    it('should manually refresh items', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      const updatedItems = [...mockHistoryItems, {
        id: '4',
        code: 'new item',
        language: 'go',
        output: 'output',
        success: true,
        timestamp: Date.now(),
      }]

      ;(historyLib.getHistoryItems as jest.Mock).mockReturnValue(updatedItems)

      await act(async () => {
        result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(4)
      })

      expect(historyLib.getHistoryItems).toHaveBeenCalled()
    })
  })
})
