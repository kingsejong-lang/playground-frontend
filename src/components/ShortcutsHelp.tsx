/**
 * Keyboard shortcuts help dialog, grouped by task. Key names follow the platform
 * (⌘ on macOS, Ctrl elsewhere).
 */

'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { Kbd, KeyCombo, useModifierKey } from '@/components/ui/Kbd';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

type Group = 'execution' | 'editor' | 'panels' | 'view';

export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  const t = useTranslations('shortcuts');
  const mod = useModifierKey();

  const groups: { group: Group; items: { keys: string[]; label: string }[] }[] = [
    {
      group: 'execution',
      items: [
        { keys: [mod, 'Enter'], label: t('run') },
        { keys: [mod, 'K'], label: t('clear') },
      ],
    },
    {
      group: 'editor',
      items: [
        { keys: [mod, 'Shift', 'F'], label: t('format') },
        { keys: [mod, 'S'], label: t('share') },
        // Monaco keeps Tab for indentation; this is its built-in escape hatch for keyboard users.
        { keys: mod === '⌘' ? ['Ctrl', 'Shift', 'M'] : ['Ctrl', 'M'], label: t('tabFocus') },
      ],
    },
    {
      group: 'panels',
      items: [
        { keys: [mod, 'T'], label: t('templates') },
        { keys: [mod, 'L'], label: t('snippets') },
        { keys: [mod, 'H'], label: t('history') },
        { keys: [mod, 'F'], label: t('fileTree') },
        { keys: [mod, ','], label: t('settings') },
        { keys: ['?'], label: t('help') },
        { keys: ['Esc'], label: t('closeDialog') },
      ],
    },
    {
      group: 'view',
      items: [
        { keys: [mod, '/'], label: t('theme') },
        { keys: [mod, 'B'], label: t('layout') },
      ],
    },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={t('title')}
      description={t.rich('toggleHint', { key: () => <Kbd>?</Kbd> })}
      size="lg"
    >
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {groups.map(({ group, items }) => (
          <section key={group}>
            <h3 className="mb-2 text-xs font-semibold text-fg-muted">{t(group)}</h3>
            <dl className="divide-y divide-hair">
              {items.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-sm text-fg">{item.label}</dt>
                  <dd className="shrink-0">
                    <KeyCombo keys={item.keys} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
