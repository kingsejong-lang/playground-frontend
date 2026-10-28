/**
 * Server-side formatting (LanguageService.FormatCode).
 *
 * Usage:
 *   const format = useFormatCode();
 *   const r = await format('kingsejong', 'main.ksj', code);
 *   if (r.ok) setCode(r.content); else toast.error(r.message);
 */
import { useCallback } from 'react';
import { create } from '@bufbuild/protobuf';
import { FormatCodeRequestSchema } from '@kingsejong-lang/playground-proto';
import { useTranslations } from 'next-intl';
import { assertValid, useRpc } from '@/lib/rpc';
import { useFailureText } from '@/hooks/useFailureText';

export type FormatResult = { ok: true; content: string } | { ok: false; message: string };

export function useFormatCode() {
  const api = useRpc();
  const t = useTranslations('errors');
  const failureText = useFailureText();
  return useCallback(
    async (languageId: string, path: string, content: string): Promise<FormatResult> => {
      try {
        const request = create(FormatCodeRequestSchema, { languageId, file: { path, content } });
        assertValid(FormatCodeRequestSchema, request);
        const res = await api.language.formatCode(request);
        if (res.diagnostics.length > 0) {
          const d = res.diagnostics[0];
          return { ok: false, message: d.line ? t('formatAt', { line: d.line, message: d.message }) : d.message };
        }
        return { ok: true, content: res.file?.content ?? content };
      } catch (err) {
        return { ok: false, message: failureText(err) };
      }
    },
    [api, t, failureText]
  );
}
