/**
 * Buttons of the Code Sanctuary system. One primary per surface (Run, or a dialog's
 * confirm action); everything else is secondary, ghost or danger.
 *
 * Usage:
 *   <Button variant="primary" icon={<Play />}>실행</Button>
 *   <IconButton label="설정" icon={<Settings />} onClick={open} />
 */
'use client';

import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-hair bg-raised text-fg hover:border-strong hover:bg-hover',
  ghost: 'text-fg-secondary hover:bg-hover hover:text-fg aria-pressed:bg-accent-soft aria-pressed:text-accent-text',
  danger: 'bg-danger text-on-accent hover:bg-danger-hover',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-sm',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'size-8',
  md: 'size-9',
};

export function buttonClass({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  className = '',
}: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}): string {
  return [BASE, VARIANTS[variant], iconOnly ? ICON_SIZES[size] : SIZES[size], className].filter(Boolean).join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant, size, icon, className, children, type = 'button', ref, ...props }: ButtonProps) {
  return (
    <button ref={ref} type={type} className={buttonClass({ variant, size, className })} {...props}>
      {icon && <span className="inline-flex size-4 items-center justify-center [&>svg]:size-4" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name; also shown as the tooltip unless `title` is given. */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({ label, icon, variant = 'ghost', size = 'md', className, title, type = 'button', ref, ...props }: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={buttonClass({ variant, size, iconOnly: true, className: `px-0 ${className ?? ''}` })}
      {...props}
    >
      <span className="inline-flex size-4 items-center justify-center [&>svg]:size-4" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
