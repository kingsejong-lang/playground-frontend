/**
 * ANSI color code parser for terminal output
 * Converts ANSI escape sequences to React elements with appropriate styling
 */

import React from 'react';

// ANSI color mappings
const COLOR_MAP: Record<string, string> = {
  // Foreground colors
  '30': 'text-gray-900',      // Black
  '31': 'text-red-400',        // Red
  '32': 'text-green-400',      // Green
  '33': 'text-yellow-400',     // Yellow
  '34': 'text-blue-400',       // Blue
  '35': 'text-purple-400',     // Magenta
  '36': 'text-cyan-400',       // Cyan
  '37': 'text-gray-200',       // White
  '90': 'text-gray-600',       // Bright Black
  '91': 'text-red-300',        // Bright Red
  '92': 'text-green-300',      // Bright Green
  '93': 'text-yellow-300',     // Bright Yellow
  '94': 'text-blue-300',       // Bright Blue
  '95': 'text-purple-300',     // Bright Magenta
  '96': 'text-cyan-300',       // Bright Cyan
  '97': 'text-white',          // Bright White

  // Background colors (not commonly used, but included for completeness)
  '40': 'bg-gray-900',
  '41': 'bg-red-900',
  '42': 'bg-green-900',
  '43': 'bg-yellow-900',
  '44': 'bg-blue-900',
  '45': 'bg-purple-900',
  '46': 'bg-cyan-900',
  '47': 'bg-gray-300',
};

// Text style mappings
const STYLE_MAP: Record<string, string> = {
  '1': 'font-bold',      // Bold
  '2': 'opacity-50',     // Dim
  '3': 'italic',         // Italic
  '4': 'underline',      // Underline
};

interface AnsiSegment {
  text: string;
  classes: string[];
}

/**
 * Parse ANSI escape codes and return segments with their styling
 */
export function parseAnsi(text: string): AnsiSegment[] {
  // ANSI escape code regex: \x1b[...m or \u001b[...m
  const ansiRegex = /\x1b\[([0-9;]+)m/g;

  const segments: AnsiSegment[] = [];
  let currentClasses: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before the ANSI code
    if (match.index > lastIndex) {
      const textSegment = text.substring(lastIndex, match.index);
      if (textSegment) {
        segments.push({ text: textSegment, classes: [...currentClasses] });
      }
    }

    // Parse the ANSI code
    const codes = match[1].split(';');
    for (const code of codes) {
      if (code === '0') {
        // Reset
        currentClasses = [];
      } else if (COLOR_MAP[code]) {
        // Color code
        currentClasses.push(COLOR_MAP[code]);
      } else if (STYLE_MAP[code]) {
        // Style code
        currentClasses.push(STYLE_MAP[code]);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex), classes: [...currentClasses] });
  }

  // If no ANSI codes found, return the whole text as a single segment
  if (segments.length === 0) {
    segments.push({ text, classes: [] });
  }

  return segments;
}

/**
 * Convert ANSI-colored text to React elements
 */
export function AnsiText({ children }: { children: string }): React.ReactElement {
  const segments = parseAnsi(children);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.classes.length > 0) {
          return (
            <span key={index} className={segment.classes.join(' ')}>
              {segment.text}
            </span>
          );
        }
        return <React.Fragment key={index}>{segment.text}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Strip ANSI codes from text (for copying/downloading)
 */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]+m/g, '');
}
