/**
 * Code snippet types and interfaces
 */

import { z } from '@/lib/zod';

export interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
}

export interface SnippetCategory {
  id: string;
  name: string;
  snippets: Snippet[];
}

export type SnippetFilter = 'all' | 'favorites' | 'recent';

/** Validates snippets read from localStorage or an imported file (untrusted). */
export const SnippetSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  code: z.string(),
  language: z.string(),
  tags: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
  isFavorite: z.boolean().default(false),
});

/** Returns the valid snippets of an untrusted value; invalid entries are dropped. */
export function parseSnippets(data: unknown): Snippet[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw) => {
    const r = SnippetSchema.safeParse(raw);
    return r.success ? [r.data] : [];
  });
}
