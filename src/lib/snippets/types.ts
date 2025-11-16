/**
 * Code snippet types and interfaces
 */

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
