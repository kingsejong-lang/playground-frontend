/**
 * Custom hook for button hover effects.
 * Provides consistent hover styling across the application.
 */

'use client';

import { useCallback, CSSProperties } from 'react';

interface ButtonHoverStyle {
  default: CSSProperties;
  hover: CSSProperties;
}

interface UseButtonHoverOptions {
  /** Default text color */
  defaultColor?: string;
  /** Hover text color */
  hoverColor?: string;
  /** Default background color */
  defaultBg?: string;
  /** Hover background color */
  hoverBg?: string;
}

interface UseButtonHoverReturn {
  /** Handler for mouseenter event */
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
  /** Handler for mouseleave event */
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => void;
  /** Get inline style props for the button */
  getStyleProps: () => {
    style: CSSProperties;
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => void;
  };
}

const DEFAULT_OPTIONS: Required<UseButtonHoverOptions> = {
  defaultColor: 'var(--text-whisper)',
  hoverColor: 'var(--text-primary)',
  defaultBg: 'transparent',
  hoverBg: 'var(--border-hair)',
};

/**
 * Hook for consistent button hover effects
 * @param options - Customization options for hover colors
 * @returns Event handlers and style props for hover effect
 */
export function useButtonHover(
  options: UseButtonHoverOptions = {}
): UseButtonHoverReturn {
  const {
    defaultColor = DEFAULT_OPTIONS.defaultColor,
    hoverColor = DEFAULT_OPTIONS.hoverColor,
    defaultBg = DEFAULT_OPTIONS.defaultBg,
    hoverBg = DEFAULT_OPTIONS.hoverBg,
  } = options;

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.color = hoverColor;
      e.currentTarget.style.backgroundColor = hoverBg;
    },
    [hoverColor, hoverBg]
  );

  const onMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.color = defaultColor;
      e.currentTarget.style.backgroundColor = defaultBg;
    },
    [defaultColor, defaultBg]
  );

  const getStyleProps = useCallback(
    () => ({
      style: {
        color: defaultColor,
        backgroundColor: defaultBg,
        transition: 'color 0.15s, background-color 0.15s',
      },
      onMouseEnter,
      onMouseLeave,
    }),
    [defaultColor, defaultBg, onMouseEnter, onMouseLeave]
  );

  return {
    onMouseEnter,
    onMouseLeave,
    getStyleProps,
  };
}

/**
 * Preset for header toolbar buttons
 */
export function useHeaderButtonHover(): UseButtonHoverReturn {
  return useButtonHover({
    defaultColor: 'var(--text-whisper)',
    hoverColor: 'var(--text-primary)',
    defaultBg: 'transparent',
    hoverBg: 'var(--border-hair)',
  });
}

/**
 * Preset for icon buttons (smaller, more subtle)
 */
export function useIconButtonHover(): UseButtonHoverReturn {
  return useButtonHover({
    defaultColor: 'var(--text-whisper)',
    hoverColor: 'var(--text-primary)',
    defaultBg: 'transparent',
    hoverBg: 'var(--bg-card)',
  });
}
