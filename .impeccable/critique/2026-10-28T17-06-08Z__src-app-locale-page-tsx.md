---
target: playground page (before UI pass)
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/kevin/work/github/references/playground-frontend/src/app/[locale]/page.tsx"
target_fingerprint: "sha256:27dab7dde1eacb02e7f3ee468d279bac744d55b2363dea62eb14b3deba141f5d"
target_path: /Users/kevin/work/github/references/playground-frontend/src/app/[locale]/page.tsx
timestamp: 2026-10-28T17-06-08Z
slug: src-app-locale-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser), baseline copy of refactor/connect-next16 before the UI pass.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Running state mixes "Streaming execution..."/"Executing code..."; no elapsed time; unavailable mode leaves an empty language select with Run enabled |
| 2 | Match System / Real World | 1 | /ko chrome almost entirely English; raw "exit 137", "Compilation:" |
| 3 | User Control and Freedom | 1 | Templates/snippets/history overwrite the file with no undo; Esc does not close templates/share/history; no locale switch |
| 4 | Consistency and Standards | 1 | Three visual systems (tokens, raw Tailwind gray/blue, embed vs-dark); KR/EN mixed per surface |
| 5 | Error Prevention | 1 | Bare "?" shortcut swallows typing in the editor |
| 6 | Recognition Rather Than Recall | 2 | File tree, snippets, format reachable only by shortcuts; no "+" tab button |
| 7 | Flexibility and Efficiency | 3 | Broad shortcuts, resizable split; collisions with browser keys |
| 8 | Aesthetic and Minimalist Design | 2 | 10 equal-weight header controls; status said three times on errors |
| 9 | Error Recovery | 2 | Diagnostics not clickable; unavailable state has no retry; embed 404 dead end |
| 10 | Help and Documentation | 2 | Shortcut sheet English-only, not linked visibly |
| **Total** | | **17/40** | **Poor** |

## Deterministic scan
CLI source scan: 0 findings. URL scans: /ko 11 low-contrast (#6e7191 on #12121a/#16161f = 3.8-3.9:1), embed 2 low-contrast + 1 flat-type-hierarchy. Compile-error view adds 3 low-contrast (crimson/indigo text on panels). At 390/360 px seven header controls including Run are clipped (header scrollWidth 874, body overflow hidden). File-tab close button 20x20.

## Priority Issues
- [P0] Mobile header overflow makes Run unreachable at 390 px; embed split fixed 50/50.
- [P1] Global "?" shortcut hijacks typing in Monaco.
- [P1] Localisation is a facade: hard-coded English chrome, Korean-only template UI on /en, LanguageToggle unused.
- [P1] Code replaced without confirm or undo (templates, snippets, history).
- [P2] Identity fracture and contrast: light theme green 2.3:1, dark whisper text 3.8-3.9:1, embed ignores theme; Login out-shouts Run.
