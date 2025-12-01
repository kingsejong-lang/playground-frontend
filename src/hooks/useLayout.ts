/**
 * Custom hook for managing layout settings.
 * Handles panel sizes, orientation, and localStorage persistence.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

export type LayoutOrientation = 'horizontal' | 'vertical';

interface LayoutSettings {
  orientation: LayoutOrientation;
  editorSize: number; // Percentage (0-100)
  outputSize: number; // Percentage (0-100)
}

interface UseLayoutReturn {
  orientation: LayoutOrientation;
  editorSize: number;
  outputSize: number;
  setOrientation: (orientation: LayoutOrientation) => void;
  toggleOrientation: () => void;
  setPanelSizes: (editorSize: number, outputSize: number) => void;
  resetLayout: () => void;
}

const DEFAULT_SETTINGS: LayoutSettings = {
  orientation: 'horizontal',
  editorSize: 50,
  outputSize: 50,
};

/**
 * Get stored layout settings or default
 */
function getStoredLayout(): LayoutSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAYOUT);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        orientation: parsed.orientation || DEFAULT_SETTINGS.orientation,
        editorSize: parsed.editorSize || DEFAULT_SETTINGS.editorSize,
        outputSize: parsed.outputSize || DEFAULT_SETTINGS.outputSize,
      };
    }
  } catch (e) {
    console.error('Failed to read layout from localStorage:', e);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Save layout settings to localStorage
 */
function saveLayout(settings: LayoutSettings) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save layout to localStorage:', e);
  }
}

export function useLayout(): UseLayoutReturn {
  const [settings, setSettings] = useState<LayoutSettings>(DEFAULT_SETTINGS);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = getStoredLayout();
    setSettings(stored);
  }, []);

  const setOrientation = useCallback((orientation: LayoutOrientation) => {
    setSettings(prev => {
      const newSettings = { ...prev, orientation };
      saveLayout(newSettings);
      return newSettings;
    });
  }, []);

  const toggleOrientation = useCallback(() => {
    setSettings(prev => {
      const newOrientation: LayoutOrientation =
        prev.orientation === 'horizontal' ? 'vertical' : 'horizontal';
      const newSettings = { ...prev, orientation: newOrientation };
      saveLayout(newSettings);
      return newSettings;
    });
  }, []);

  const setPanelSizes = useCallback((editorSize: number, outputSize: number) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        editorSize: Math.max(10, Math.min(90, editorSize)),
        outputSize: Math.max(10, Math.min(90, outputSize)),
      };
      saveLayout(newSettings);
      return newSettings;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveLayout(DEFAULT_SETTINGS);
  }, []);

  return {
    orientation: settings.orientation,
    editorSize: settings.editorSize,
    outputSize: settings.outputSize,
    setOrientation,
    toggleOrientation,
    setPanelSizes,
    resetLayout,
  };
}
