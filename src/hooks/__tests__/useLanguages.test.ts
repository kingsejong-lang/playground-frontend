const { renderHook, waitFor } = require('@testing-library/react')
import { useLanguages } from '../useLanguages'
import * as api from '@/lib/api'

// Mock the API module
jest.mock('@/lib/api', () => ({
  languagesAPI: {
    list: jest.fn(),
  },
}))

const mockLanguages = [
  {
    id: 'python_3_12',
    name: 'Python 3.12',
    version: '3.12.0',
    extensions: ['.py'],
    mime_types: ['text/x-python'],
  },
  {
    id: 'go_1_22',
    name: 'Go 1.22',
    version: '1.22.0',
    extensions: ['.go'],
    mime_types: ['text/x-go'],
  },
]

describe('useLanguages', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    ;(api.languagesAPI.list as jest.Mock) = jest.fn().mockResolvedValue(mockLanguages)
  })

  it('should load languages successfully', async () => {
    const { result } = renderHook(() => useLanguages())

    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.languages).toEqual([])

    // Wait for languages to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Check languages loaded
    expect(result.current.languages).toHaveLength(2)
    expect(result.current.languages[0].id).toBe('python_3_12')
    expect(result.current.languages[1].id).toBe('go_1_22')
    expect(result.current.error).toBeNull()
  })

  it('should set first language as selected by default', async () => {
    const { result } = renderHook(() => useLanguages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.selectedLanguage).toBe('python_3_12')
  })

  it('should handle API errors', async () => {
    // Mock API error
    ;(api.languagesAPI.list as jest.Mock).mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useLanguages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.languages).toEqual([])
  })

  it('should change selected language', async () => {
    const { result } = renderHook(() => useLanguages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Change language
    await waitFor(() => {
      result.current.changeLanguage('go_1_22')
      expect(result.current.selectedLanguage).toBe('go_1_22')
    })
  })

  it('should not change to invalid language', async () => {
    const { result } = renderHook(() => useLanguages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const previousLanguage = result.current.selectedLanguage

    // Try to change to invalid language
    await waitFor(() => {
      result.current.changeLanguage('invalid_language')
      // Should remain unchanged
      expect(result.current.selectedLanguage).toBe(previousLanguage)
    })
  })
})
