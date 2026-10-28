# 03 Structure refactor — Design

See `docs/refactoring/REFACTORING_DESIGN.md` section 3 for the tree. Rules:

* Deferred: per-feature `index.ts` public files (imports currently point at files directly).
* Feature-neutral UI (`components/ui/*`, `Toast`, `ErrorBoundary`, `ShortcutsHelp`,
  `LanguageToggle`) and hooks (`useToast`, `useKeyboardShortcut`, `useButtonHover`,
  `useLocalStorage`) stay in `src/components`, `src/hooks`.
* `lib/utils/language.ts` now takes the generated `Language` type; it no longer depends on a
  transport module.
* `features/execution/history.ts` keeps the same localStorage key
  (`playground_execution_history`) and converts legacy `ExecuteResponse` entries on read.
* Page keeps its visual layout; modal state stays in the page (UI pass may extract a reducer).
