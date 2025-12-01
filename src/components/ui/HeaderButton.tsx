/**
 * Reusable header button component with consistent styling
 */

'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';
import { useHeaderButtonHover } from '@/hooks/useButtonHover';

interface HeaderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button icon */
  icon?: ReactNode;
  /** Button label */
  label?: string;
  /** Show icon only (no label) */
  iconOnly?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Variant style */
  variant?: 'default' | 'primary' | 'danger';
}

/**
 * Header toolbar button with hover effects
 */
export function HeaderButton({
  icon,
  label,
  iconOnly = false,
  loading = false,
  disabled = false,
  variant = 'default',
  className = '',
  children,
  ...props
}: HeaderButtonProps) {
  const { onMouseEnter, onMouseLeave } = useHeaderButtonHover();

  const baseStyles = {
    height: '40px',
    padding: iconOnly ? '0 12px' : '0 16px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1,
  };

  const variantStyles = {
    default: {
      color: 'var(--text-whisper)',
      backgroundColor: 'transparent',
    },
    primary: {
      color: '#ffffff',
      backgroundColor: 'var(--accent-indigo)',
    },
    danger: {
      color: '#ef4444',
      backgroundColor: 'transparent',
    },
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    if (variant === 'primary') {
      e.currentTarget.style.backgroundColor = '#3d4daa';
    } else {
      onMouseEnter(e);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary') {
      e.currentTarget.style.backgroundColor = 'var(--accent-indigo)';
    } else {
      onMouseLeave(e);
    }
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{ ...baseStyles, ...variantStyles[variant] }}
      className={`transition-colors ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon && <span className={iconOnly ? '' : 'mr-2 inline'}>{icon}</span>}
      {!iconOnly && (label || children)}
      {loading && !iconOnly && '...'}
    </button>
  );
}

/**
 * Divider between button groups
 */
export function HeaderDivider() {
  return (
    <div
      className="h-6"
      style={{ width: '1px', backgroundColor: 'var(--border-hair)' }}
    />
  );
}
