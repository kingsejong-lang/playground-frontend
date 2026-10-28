/**
 * Creates share links (ShareService.CreateShare) and loads shared code (GetShare).
 *
 * The anonymous `delete_token` is kept in memory only (never in storage); the
 * UI has no delete action yet.
 */

import { useState, useCallback } from 'react';
import { create } from '@bufbuild/protobuf';
import {
  CreateShareRequestSchema,
  GetShareRequestSchema,
  type Language,
  type Share,
} from '@kingsejong-lang/playground-proto';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/useToast';
import { useFailureText } from '@/hooks/useFailureText';
import { assertFilesFit, assertValid, RpcFailureError, useRpc } from '@/lib/rpc';
import { resolveLanguage } from '@/lib/utils/language';
import { buildRunFiles, type EntryOptions } from '@/features/editor/entry';

interface UseShareReturn {
  shareUrl: string | null;
  shareId: string | null;
  sharing: boolean;
  error: string | null;
  /** Shares every workspace file with the resolved entry file (see editor/entry.ts). */
  createShare: (
    files: readonly { name: string; content: string }[],
    entry: Pick<EntryOptions, 'preferred'>,
    language: string,
    languages: readonly Language[]
  ) => Promise<void>;
  loadShared: (shareId: string, onLoad: (language: string, files: { name: string; content: string }[], entryFile: string) => void) => Promise<void>;
  copyToClipboard: () => Promise<void>;
  closeShareModal: () => void;
}

/** Fetches a share after validating the id locally (no request for malformed ids). */
export async function fetchShare(api: ReturnType<typeof useRpc>, id: string): Promise<Share> {
  const request = create(GetShareRequestSchema, { id });
  assertValid(GetShareRequestSchema, request);
  const { share } = await api.share.getShare(request);
  if (!share) throw new RpcFailureError({ kind: 'not_found', message: 'Share not found' });
  return share;
}

export function useShare(): UseShareReturn {
  const api = useRpc();
  const toast = useToast();
  const t = useTranslations();
  const failureText = useFailureText();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [, setDeleteToken] = useState<string | null>(null);
  const [sharing, setSharing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createShare = useCallback(
    async (
      workspace: readonly { name: string; content: string }[],
      entry: Pick<EntryOptions, 'preferred'>,
      language: string,
      languages: readonly Language[]
    ) => {
      if (!workspace.some((f) => f.content.trim())) {
        setError(t('errors.emptyCode'));
        return;
      }

      const lang = resolveLanguage(language, languages);
      if (!lang) {
        setError(t('errors.languageNotFound'));
        return;
      }

      setSharing(true);
      setShareUrl(null);
      setError(null);

      try {
        const run = buildRunFiles(workspace, { preferred: entry.preferred, defaultEntryFile: lang.defaultEntryFile });
        const request = create(CreateShareRequestSchema, {
          languageId: language,
          files: { files: run.files },
          entryFile: run.entryFile ?? '',
          title: `${lang.displayName || lang.id} Code`,
          description: 'Shared from Kingsejong Playground',
        });
        assertValid(CreateShareRequestSchema, request);
        assertFilesFit(request.files?.files ?? []);

        const res = await api.share.createShare(request);
        const id = res.share?.id;
        if (!id) throw new Error(t('errors.shareNotCreated'));

        const url = `${window.location.origin}${window.location.pathname}?share=${encodeURIComponent(id)}`;
        setShareUrl(url);
        setShareId(id);
        setDeleteToken(res.deleteToken || null);

        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Clipboard permission denied; the modal still shows the URL.
        }
      } catch (err: unknown) {
        setError(failureText(err));
      } finally {
        setSharing(false);
      }
    },
    [api, t, failureText]
  );

  const loadShared = useCallback(
    async (id: string, onLoad: (language: string, files: { name: string; content: string }[], entryFile: string) => void) => {
      try {
        setError(null);
        const share = await fetchShare(api, id);
        const files = (share.files?.files ?? []).map((f) => ({ name: f.path, content: f.content }));
        onLoad(share.languageId, files, share.entryFile);
      } catch (err) {
        setError(`${t('errors.loadShare')} ${failureText(err)}`);
      }
    },
    [api, t, failureText]
  );

  const copyToClipboard = useCallback(async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t('share.urlCopied'));
      } catch {
        toast.error(t('errors.clipboard'));
      }
    }
  }, [shareUrl, toast, t]);

  const closeShareModal = useCallback(() => {
    setShareUrl(null);
    setShareId(null);
    setError(null);
  }, []);

  return {
    shareUrl,
    shareId,
    sharing,
    error,
    createShare,
    loadShared,
    copyToClipboard,
    closeShareModal,
  };
}
