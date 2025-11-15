import { renderHook, waitFor } from '@testing-library/react'
import { useSettings } from '../useSettings'
import * as api from '@/lib/api'

// Mock the API module
jest.mock('@/lib/api', () => ({
  settingsAPI: {
    get: jest.fn(),
    save: jest.fn(),
  },
}))

const mockSettings = {
  editor: {
    font_size: 16,
    font_family: 'Monaco',
    tab_size: 4,
    auto_save: true,
    minimap: false,
  },
  theme: {
    theme: 'light',
    color_scheme: 'vs-light',
  },
}

const DEFAULT_EDITOR_SETTINGS = {
  font_size: 14,
  font_family: 'Fira Code, Monaco, monospace',
  tab_size: 2,
  auto_save: false,
  minimap: true,
}

const DEFAULT_THEME_SETTINGS = {
  theme: 'dark',
  color_scheme: 'vs-dark',
}

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Silence console.log and console.error in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() => useSettings(false))

      expect(result.current.editorSettings).toEqual(DEFAULT_EDITOR_SETTINGS)
      expect(result.current.themeSettings).toEqual(DEFAULT_THEME_SETTINGS)
      expect(result.current.error).toBeNull()
    })
  })

  describe('loadSettings', () => {
    it('should load settings when authenticated', async () => {
      ;(api.settingsAPI.get as jest.Mock).mockResolvedValue(mockSettings)

      const { result } = renderHook(() => useSettings(true))

      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(mockSettings.editor)
        expect(result.current.themeSettings).toEqual(mockSettings.theme)
      })

      expect(api.settingsAPI.get).toHaveBeenCalledTimes(1)
    })

    it('should use default settings when not authenticated', async () => {
      const { result } = renderHook(() => useSettings(false))

      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(DEFAULT_EDITOR_SETTINGS)
        expect(result.current.themeSettings).toEqual(DEFAULT_THEME_SETTINGS)
      })

      expect(api.settingsAPI.get).not.toHaveBeenCalled()
    })

    it('should use default settings on API error', async () => {
      ;(api.settingsAPI.get as jest.Mock).mockRejectedValue(new Error('API Error'))

      const { result } = renderHook(() => useSettings(true))

      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(DEFAULT_EDITOR_SETTINGS)
        expect(result.current.themeSettings).toEqual(DEFAULT_THEME_SETTINGS)
      })
    })

    it('should reload settings when authentication status changes', async () => {
      ;(api.settingsAPI.get as jest.Mock).mockResolvedValue(mockSettings)

      const { result, rerender } = renderHook(
        ({ isAuthenticated }) => useSettings(isAuthenticated),
        { initialProps: { isAuthenticated: false } }
      )

      // Initially not authenticated, should use defaults
      expect(result.current.editorSettings).toEqual(DEFAULT_EDITOR_SETTINGS)

      // Change to authenticated
      rerender({ isAuthenticated: true })

      // Should load settings from API
      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(mockSettings.editor)
        expect(result.current.themeSettings).toEqual(mockSettings.theme)
      })

      expect(api.settingsAPI.get).toHaveBeenCalled()
    })
  })

  describe('saveSettings', () => {
    it('should save settings when authenticated', async () => {
      ;(api.settingsAPI.get as jest.Mock).mockResolvedValue(mockSettings)
      ;(api.settingsAPI.save as jest.Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useSettings(true))

      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(mockSettings.editor)
      })

      const newEditorSettings = {
        ...mockSettings.editor,
        font_size: 18,
      }
      const newThemeSettings = {
        theme: 'dark' as const,
        color_scheme: 'vs-dark',
      }

      await waitFor(async () => {
        await result.current.saveSettings(newEditorSettings, newThemeSettings)
      })

      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(newEditorSettings)
        expect(result.current.themeSettings).toEqual(newThemeSettings)
        expect(result.current.error).toBeNull()
      })

      expect(api.settingsAPI.save).toHaveBeenCalledWith({
        editor: newEditorSettings,
        theme: newThemeSettings,
      })
    })

    it('should save settings locally when not authenticated', async () => {
      const { result } = renderHook(() => useSettings(false))

      const newEditorSettings = {
        ...DEFAULT_EDITOR_SETTINGS,
        font_size: 20,
      }
      const newThemeSettings = {
        theme: 'light' as const,
        color_scheme: 'vs-light',
      }

      await waitFor(async () => {
        await result.current.saveSettings(newEditorSettings, newThemeSettings)
      })

      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(newEditorSettings)
        expect(result.current.themeSettings).toEqual(newThemeSettings)
        expect(result.current.error).toBeNull()
      })

      expect(api.settingsAPI.save).not.toHaveBeenCalled()
    })

    it('should set error on save failure', async () => {
      ;(api.settingsAPI.get as jest.Mock).mockResolvedValue(mockSettings)
      ;(api.settingsAPI.save as jest.Mock).mockRejectedValue(new Error('Save failed'))

      const { result } = renderHook(() => useSettings(true))

      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(mockSettings.editor)
      })

      const newEditorSettings = {
        ...mockSettings.editor,
        font_size: 18,
      }
      const newThemeSettings = {
        theme: 'dark' as const,
        color_scheme: 'vs-dark',
      }

      await waitFor(async () => {
        await result.current.saveSettings(newEditorSettings, newThemeSettings)
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Settings should still be updated locally
      expect(result.current.editorSettings).toEqual(newEditorSettings)
      expect(result.current.themeSettings).toEqual(newThemeSettings)
    })

    it('should apply settings locally before saving to backend', async () => {
      ;(api.settingsAPI.get as jest.Mock).mockResolvedValue(mockSettings)
      ;(api.settingsAPI.save as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      const { result } = renderHook(() => useSettings(true))

      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(mockSettings.editor)
      })

      const newEditorSettings = {
        ...mockSettings.editor,
        font_size: 18,
      }
      const newThemeSettings = {
        theme: 'dark' as const,
        color_scheme: 'vs-dark',
      }

      await waitFor(async () => {
        result.current.saveSettings(newEditorSettings, newThemeSettings)
      })

      // Settings should be updated immediately, before backend save completes
      await waitFor(() => {
        expect(result.current.editorSettings).toEqual(newEditorSettings)
        expect(result.current.themeSettings).toEqual(newThemeSettings)
      })
    })
  })

  describe('manual loadSettings call', () => {
    it('should manually reload settings', async () => {
      const updatedSettings = {
        editor: {
          ...mockSettings.editor,
          font_size: 20,
        },
        theme: mockSettings.theme,
      }

      ;(api.settingsAPI.get as jest.Mock)
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce(updatedSettings)

      const { result } = renderHook(() => useSettings(true))

      await waitFor(() => {
        expect(result.current.editorSettings.font_size).toBe(16)
      })

      // Manually reload
      await waitFor(async () => {
        await result.current.loadSettings()
      })

      await waitFor(() => {
        expect(result.current.editorSettings.font_size).toBe(20)
      })

      expect(api.settingsAPI.get).toHaveBeenCalledTimes(2)
    })
  })
})
