'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
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
          setError('Name is required');
          setLoading(false);
          return;
        }
        await register(email, password, name);
      }
      onClose();
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      role="dialog"
      aria-labelledby="auth-modal-title"
      aria-modal="true"
    >
      <div className="rounded-lg p-6 max-w-md w-full mx-4" style={{ backgroundColor: 'var(--editor-zone)', border: '1px solid var(--border-hair)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 id="auth-modal-title" className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--text-whisper)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-whisper)'}
            aria-label="Close authentication modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-void)',
                  border: '1px solid var(--border-hair)',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-hair)'}
                required={mode === 'register'}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-void)',
                border: '1px solid var(--border-hair)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-hair)'}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-void)',
                border: '1px solid var(--border-hair)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-hair)'}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(232, 69, 69, 0.1)', border: '1px solid var(--accent-crimson)' }} role="alert">
              <p className="text-sm" style={{ color: 'var(--accent-crimson)' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
            style={{
              backgroundColor: loading ? 'var(--border-hair)' : 'var(--accent-indigo)',
              color: '#ffffff',
              opacity: loading ? 0.5 : 1
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#3d4daa')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent-indigo)')}
            aria-busy={loading}
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={toggleMode}
            className="text-sm transition-colors"
            style={{ color: 'var(--accent-indigo)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3d4daa'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-indigo)'}
            aria-label={mode === 'login' ? "Switch to sign up form" : "Switch to login form"}
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
