/**
 * Tests for useLanguages hook.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useLanguages } from '../useLanguages'
import * as api from '@/lib/api'

// Mock the API module
jest.mock('@/lib/api')

const mockLanguages = [
  {
    id: 'python_3_12',
    name: 'Python 3.12',
    version: '3.12.0',
    extensions: ['.py'],
    compiler: '',
    runner: 'python3.12',
  },
  {
    id: 'go_1_22',
    name: 'Go 1.22',
    version: '1.22.0',
    extensions: ['.go'],
    compiler: 'go',
    runner: 'go run',
  },
]

describe('useLanguages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful API call
    ;(api.languagesAPI.list as jest.Mock) = jest.fn().mockResolvedValue(mockLanguages)
  })

  it('should load languages on mount', async () => {
    const { result } = renderHook(() => useLanguages())

    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.languages).toEqual([])

    // Wait for languages to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 3000 })

    // Check languages loaded
    expect(result.current.languages).toHaveLength(2)
    expect(result.current.languages[0].id).toBe('python_3_12')
    expect(result.current.languages[1].id).toBe('go_1_22')
  })

  it('should set default language to Python', async () => {
    const { result } = renderHook(() => useLanguages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 3000 })

    expect(result.current.selectedLanguage).toBe('python_3_12')
    expect(result.current.code).toContain('안녕하세요, 세상!')
  })

  it('should change language and code', async () => {
    const { result } = renderHook(() => useLanguages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 3000 })

    // Change to Go
    await waitFor(() => {
      result.current.changeLanguage('go_1_22')
    })

    expect(result.current.selectedLanguage).toBe('go_1_22')
    expect(result.current.code).toContain('package main')
  })
})
