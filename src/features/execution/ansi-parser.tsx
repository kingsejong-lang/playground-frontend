/**
 * ANSI color code parser for terminal output
 * Converts ANSI escape sequences to React elements with appropriate styling
 */

import React from 'react';

// ANSI codes map to the --ansi-N tokens in globals.css (AA on the output panel in both themes)
const COLOR_MAP: Record<string, string> = {
  '30': 'text-ansi-0',
  '31': 'text-ansi-1',
  '32': 'text-ansi-2',
  '33': 'text-ansi-3',
  '34': 'text-ansi-4',
  '35': 'text-ansi-5',
  '36': 'text-ansi-6',
  '37': 'text-ansi-7',
  '90': 'text-ansi-8',
  '91': 'text-ansi-9',
  '92': 'text-ansi-10',
  '93': 'text-ansi-11',
  '94': 'text-ansi-12',
  '95': 'text-ansi-13',
  '96': 'text-ansi-14',
  '97': 'text-ansi-15',
  '40': 'bg-ansi-0/20',
  '41': 'bg-ansi-1/20',
  '42': 'bg-ansi-2/20',
  '43': 'bg-ansi-3/20',
  '44': 'bg-ansi-4/20',
  '45': 'bg-ansi-5/20',
  '46': 'bg-ansi-6/20',
  '47': 'bg-ansi-7/20',
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

/** Splits text around case-insensitive matches of `query`, marking the matches. */
function highlightParts(text: string, query: string, keyPrefix: string): React.ReactNode[] {
  if (!query) return [text];
  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let from = 0;
  let at = lower.indexOf(q, from);
  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={`${keyPrefix}-${at}`} className="rounded-xs bg-warn-soft text-fg outline outline-1 outline-warn">
        {text.slice(at, at + q.length)}
      </mark>
    );
    from = at + q.length;
    at = lower.indexOf(q, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

/**
 * Convert ANSI-colored text to React elements, optionally marking search matches.
 */
export function AnsiText({ children, highlight = '' }: { children: string; highlight?: string }): React.ReactElement {
  const segments = parseAnsi(children);

  return (
    <>
      {segments.map((segment, index) => {
        const content = highlightParts(segment.text, highlight, String(index));
        if (segment.classes.length > 0) {
          return (
            <span key={index} className={segment.classes.join(' ')}>
              {content}
            </span>
          );
        }
        return <React.Fragment key={index}>{content}</React.Fragment>;
      })}
    </>
  );
}

/** Number of case-insensitive occurrences of `query` in `text`. */
export function countMatches(text: string, query: string): number {
  if (!query) return 0;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let n = 0;
  for (let at = lower.indexOf(q); at !== -1; at = lower.indexOf(q, at + q.length)) n++;
  return n;
}

/**
 * Strip ANSI codes from text (for copying/downloading)
 */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]+m/g, '');
}
