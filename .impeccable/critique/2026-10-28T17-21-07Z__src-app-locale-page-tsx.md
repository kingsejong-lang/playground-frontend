---
target: playground page (after UI pass)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/kevin/work/github/references/playground-frontend/src/app/[locale]/page.tsx"
target_fingerprint: "sha256:2151d5a597398591712b5d2c414cc96d2bb7393518d8e296c827cd685c61a243"
target_path: /Users/kevin/work/github/references/playground-frontend/src/app/[locale]/page.tsx
timestamp: 2026-10-28T17-21-07Z
slug: src-app-locale-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser), after the UI refinement pass (before the follow-up fixes listed at the end).

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Queue position, compile phase, elapsed time, sweep, metrics, live announcements; rate-limit wiped the chip |
| 2 | Match System / Real World | 3 | Plain 해요체 Korean; "백엔드" jargon and raw stdout/stderr leaked |
| 3 | User Control and Freedom | 3 | Undo toast on code replacement, Stop, Esc; Cmd+S still publishes a share |
| 4 | Consistency and Standards | 2 | Shortcuts collide with browser keys (Cmd+S/T/L/H/F) |
| 5 | Error Prevention | 2 | Cmd+S creates a public link; retry clickable during server-requested wait |
| 6 | Recognition Rather Than Recall | 3 | Visible Run hint, "?" help, menu hints; tiny ⌘ key cap |
| 7 | Flexibility and Efficiency | 3 | Full shortcut set, layouts, output search |
| 8 | Aesthetic and Minimalist Design | 3 | Calm hairline layout, one primary; duplicate backend-down callouts |
| 9 | Error Recovery | 3 | Clickable diagnostics + squiggles; server message replaced the next-step help; runtime locations not linked |
| 10 | Help and Documentation | 2 | No KingSejong keyword reference |
| **Total** | | **27/40** | **Acceptable (upper band)** |

## Deterministic scan
CLI source scan and URL scans (/ko, embed): 0 findings. Overlay: light compile-error chip/diagnostic label 4.44:1 (fixed: light error token #b42525, 5.0:1), flat-type-hierarchy advisory (dense Operate scale, documented). No overflow at 1440/390/360. Focus ring visible on every stop except Monaco (fixed: ring on .monaco-editor.focused). Diagnostic links 18.6px tall (fixed: min-h-6).

## Priority Issues (and follow-up)
- [P1] Browser-colliding shortcuts (Cmd+S share, Cmd+T/L/H/F) — left: behaviour change needs the owner's decision; menu alternatives + README note added.
- [P1] Backend-down duplicate callouts and jargon — fixed (one callout, learner copy).
- [P2] Rate-limit shown as red error with immediate retry — fixed (warning tone, Clock icon, countdown retry).
- [P2] Server message replaced next-step help; runtime file:line not linked — fixed (help first, server reason secondary; stderr locations are jump links).
- [P2] Embed unexplained to viewers — fixed (language label, read-only hint, specific not-found copy with a way out).
