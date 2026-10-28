/**
 * Keyboard shortcuts help dialog. Lists only the global shortcuts (see
 * features/editor/shortcuts.ts) and the editor's own keys; everything else is
 * in the header menu and the command palette (F1).
 */

'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { Kbd, KeyCombo, useModifierKey } from '@/components/ui/Kbd';
import { GLOBAL_SHORTCUTS, shortcutKeys } from '@/features/editor/shortcuts';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  const t = useTranslations('shortcuts');
  const mod = useModifierKey();

  const groups: { group: 'global' | 'inEditor'; items: { keys: string[]; label: string }[] }[] = [
    {
      group: 'global',
      items: [
        { keys: shortcutKeys(GLOBAL_SHORTCUTS.run, mod), label: t('run') },
        { keys: shortcutKeys(GLOBAL_SHORTCUTS.stop, mod), label: t('stop') },
        { keys: shortcutKeys(GLOBAL_SHORTCUTS.save, mod), label: t('save') },
        { keys: ['?'], label: t('help') },
        { keys: ['Esc'], label: t('closeDialog') },
      ],
    },
    {
      group: 'inEditor',
      items: [
        { keys: ['F1'], label: t('palette') },
        // Monaco keeps Tab for indentation; this is its built-in escape hatch for keyboard users.
        { keys: mod === '⌘' ? ['Ctrl', 'Shift', 'M'] : ['Ctrl', 'M'], label: t('tabFocus') },
      ],
    },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={t('title')}
      description={t.rich('toggleHint', { key: () => <Kbd>?</Kbd> })}
      size="md"
    >
      <div className="space-y-6">
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
        <p className="text-sm text-fg-muted">{t('menuNote')}</p>
      </div>
    </Dialog>
  );
}
