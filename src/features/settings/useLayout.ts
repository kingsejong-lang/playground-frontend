/**
 * Custom hook for managing layout settings.
 * Handles panel sizes, orientation, and localStorage persistence.
 */

'use client';

import { useCallback } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';
import { createLocalStore, useLocalStore } from '@/lib/local-store';

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

/** Parses stored layout settings; anything unreadable falls back to the defaults. */
function parseLayout(raw: string | null): LayoutSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    return {
      orientation: parsed.orientation === 'vertical' ? 'vertical' : DEFAULT_SETTINGS.orientation,
      editorSize: Number(parsed.editorSize) || DEFAULT_SETTINGS.editorSize,
      outputSize: Number(parsed.outputSize) || DEFAULT_SETTINGS.outputSize,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const layoutStore = createLocalStore(STORAGE_KEYS.LAYOUT, parseLayout, DEFAULT_SETTINGS);

export function useLayout(): UseLayoutReturn {
  const settings = useLocalStore(layoutStore);

  const setOrientation = useCallback((orientation: LayoutOrientation) => {
    layoutStore.set({ ...layoutStore.getSnapshot(), orientation });
  }, []);

  const toggleOrientation = useCallback(() => {
    const current = layoutStore.getSnapshot();
    layoutStore.set({ ...current, orientation: current.orientation === 'horizontal' ? 'vertical' : 'horizontal' });
  }, []);

  const setPanelSizes = useCallback((editorSize: number, outputSize: number) => {
    layoutStore.set({
      ...layoutStore.getSnapshot(),
      editorSize: Math.max(10, Math.min(90, editorSize)),
      outputSize: Math.max(10, Math.min(90, outputSize)),
    });
  }, []);

  const resetLayout = useCallback(() => layoutStore.set(DEFAULT_SETTINGS), []);

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
