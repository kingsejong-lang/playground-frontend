/**
 * Custom hook for sharing code.
 * Handles creating share links and loading shared code.
 */

import { useState, useCallback, useEffect } from 'react';
import { shareAPI, Language } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useToast } from './useToast';

interface UseShareReturn {
  shareUrl: string | null;
  sharing: boolean;
  error: string | null;
  createShare: (code: string, language: string, languages: Language[]) => Promise<void>;
  loadShared: (shareId: string, onLoad: (language: string, code: string) => void) => Promise<void>;
  copyToClipboard: () => Promise<void>;
  closeShareModal: () => void;
}

export function useShare(): UseShareReturn {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createShare = useCallback(async (
    code: string,
    language: string,
    languages: Language[]
  ) => {
    if (!code.trim()) {
      setError('Please write some code first');
      return;
    }

    setSharing(true);
    setShareUrl(null);
    setError(null);

    try {
      const lang = languages.find(l => l.id === language);
      if (!lang) {
        throw new Error('Language not found');
      }

      const extension = lang.extensions[0] || '.txt';
      const filename = `main${extension}`;

      const share = await shareAPI.create({
        language,
        files: {
          [filename]: code,
        },
        title: `${lang.name} Code`,
        description: 'Shared from Kingsejong Playground',
      });

      const url = `${window.location.origin}${window.location.pathname}?share=${share.id}`;
      setShareUrl(url);

      // Copy to clipboard
      await navigator.clipboard.writeText(url);
    } catch (err: any) {
      console.error('Share failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create share');
    } finally {
      setSharing(false);
    }
  }, []);

  const loadShared = useCallback(async (
    shareId: string,
    onLoad: (language: string, code: string) => void
  ) => {
    try {
      setError(null);
      const share = await shareAPI.get(shareId);

      // Get the first file's content
      const firstFile = Object.values(share.files)[0];
      onLoad(share.language, firstFile || '');
    } catch (err) {
      console.error('Failed to load shared code:', err);
      setError('Failed to load shared code');
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share URL copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
        toast.error('Failed to copy to clipboard');
        setError('Failed to copy to clipboard');
      }
    }
  }, [shareUrl, toast]);

  const closeShareModal = useCallback(() => {
    setShareUrl(null);
    setError(null);
  }, []);

  return {
    shareUrl,
    sharing,
    error,
    createShare,
    loadShared,
    copyToClipboard,
    closeShareModal,
  };
}
