'use client';

import { useState, useId } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthContext';
import { toRpcFailure } from '@/lib/rpc';
import { useFailureText } from '@/hooks/useFailureText';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

const FIELD = 'h-10 w-full rounded-md border border-strong bg-void px-3 text-sm text-fg disabled:opacity-60';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors');
  const failureText = useFailureText();
  const ids = { name: useId(), email: useId(), password: useId(), hint: useId(), error: useId() };
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name) {
          setError(tErr('nameRequired'));
          setLoading(false);
          return;
        }
        await register(email, password, name);
      }
      onClose();
      setEmail('');
      setPassword('');
      setName('');
    } catch (err: unknown) {
      const failure = toRpcFailure(err);
      setError(mode === 'login' && failure.kind === 'unauthenticated' ? tErr('invalidCredentials') : failureText(err));
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? t('login') : t('register');

  return (
    <Dialog open={isOpen} onClose={onClose} title={title} description={t('why')} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? ids.error : undefined}>
        {mode === 'register' && (
          <div>
            <label htmlFor={ids.name} className="mb-1.5 block text-sm font-medium text-fg">
              {t('name')}
            </label>
            <input
              type="text"
              id={ids.name}
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
              required
              disabled={loading}
            />
          </div>
        )}

        <div>
          <label htmlFor={ids.email} className="mb-1.5 block text-sm font-medium text-fg">
            {t('email')}
          </label>
          <input
            type="email"
            id={ids.email}
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor={ids.password} className="mb-1.5 block text-sm font-medium text-fg">
            {t('password')}
          </label>
          <input
            type="password"
            id={ids.password}
            name="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD}
            required
            minLength={mode === 'register' ? 10 : 1}
            aria-describedby={mode === 'register' ? ids.hint : undefined}
            disabled={loading}
          />
          {mode === 'register' && (
            <p id={ids.hint} className="mt-1 text-xs text-fg-muted">
              {t('passwordHint')}
            </p>
          )}
        </div>

        {error && (
          <p id={ids.error} className="rounded-md bg-err-soft px-3 py-2 text-sm text-err" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading} aria-busy={loading} className="w-full">
          {loading ? t('processing') : title}
        </Button>

        <p className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="text-sm text-accent-text underline-offset-4 hover:underline"
          >
            {mode === 'login' ? t('toRegister') : t('toLogin')}
          </button>
        </p>
      </form>
    </Dialog>
  );
}
