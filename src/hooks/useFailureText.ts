/**
 * Localised text for RPC failures (see src/lib/rpc/errors.ts for the kinds).
 * lib/rpc keeps an English `message` for logs and tests; the UI shows this instead.
 *
 * Usage:
 *   const failureText = useFailureText();
 *   catch (err) { setError(failureText(err)); }
 */
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toRpcFailure, type RpcFailure } from '@/lib/rpc';

export function useFailureText() {
  const t = useTranslations('errors');
  return useCallback(
    (error: unknown): string => {
      const f: RpcFailure = toRpcFailure(error);
      let text = t(f.kind);
      if (f.kind === 'validation') {
        // protovalidate's violation text is English-only; keep it as a technical detail.
        const detail = f.message.replace(/^The request is invalid:?\s*/, '');
        if (detail) text = `${text}: ${detail}`;
      }
      if (f.retryAfterSeconds && f.retryAfterSeconds > 0) text = `${text}. ${t('retryAfter', { seconds: f.retryAfterSeconds })}`;
      return text;
    },
    [t]
  );
}
