---
name: KingSejong Playground
description: Code Sanctuary, a quiet terminal-dark IDE with Korean dancheong accents
colors:
  bg-void: "#0a0a0e"
  editor-zone: "#12121a"
  output-zone: "#16161f"
  surface-raised: "#1c1c27"
  surface-hover: "#23232f"
  border-hair: "#2a2a35"
  border-strong: "#62667f"
  text-primary: "#e4e4e7"
  text-secondary: "#b4b7cf"
  text-whisper: "#8e92b3"
  dancheong-indigo: "#4c5fd5"
  dancheong-indigo-hover: "#3f51c4"
  dancheong-indigo-text: "#8f9cf7"
  dancheong-green: "#3fb68b"
  dancheong-crimson: "#c73636"
  dancheong-ochre: "#e9b949"
  status-success: "#4fd1a1"
  status-error: "#ff6b6b"
  status-warning: "#e9b949"
  light-bg-void: "#f4f5f7"
  light-editor-zone: "#fbfbfc"
  light-output-zone: "#eef0f3"
  light-border-hair: "#d6d9e0"
  light-border-strong: "#868b9f"
  light-text-primary: "#15161c"
  light-text-secondary: "#3f4253"
  light-text-whisper: "#5d6070"
  light-indigo: "#3b4ac0"
  light-success: "#1a7a57"
  light-error: "#b42525"
  light-warning: "#7a5000"
typography:
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', 'Noto Sans KR', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', 'Noto Sans KR', Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', 'Noto Sans KR', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.25
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', 'Noto Sans KR', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  code:
    fontFamily: "'D2Coding', 'Fira Code', Menlo, Monaco, Consolas, 'Ubuntu Mono', monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.85
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
components:
  button-primary:
    backgroundColor: "{colors.dancheong-indigo}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.dancheong-indigo-hover}"
  button-stop:
    backgroundColor: "{colors.dancheong-crimson}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    size: "36px"
  input:
    backgroundColor: "{colors.bg-void}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  status-chip:
    textColor: "{colors.status-success}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  dialog:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
---

# Design System: KingSejong Playground

## Overview

**Creative North Star: "The Code Sanctuary"**

A quiet, dark workroom where Korean code is the brightest thing on screen. The interface is a
working IDE first: header, editor, output, in the arrangement every developer already knows. The
identity lives in a few precise details taken from 단청 (dancheong, the painted palette of Korean
temple eaves): a hairline band of 청·적·황·녹 across the top edge, an indigo primary action, and
status colours drawn from the same family.

Density is medium. Panels are separated by 1px hairlines, never by shadows; only things that float
above the work (dialogs, menus, toasts) lift off the surface. Dark is the default because the scene is
long reading of code; light is a full peer theme, not an inversion, with its own AA-checked values.

This system was documented from the shipped refinement (October 2026). Assumption: the "Code
Sanctuary" name and its dancheong accents are binding brand commitments (from the incumbent code
and the refinement brief); the exact hex values are this pass's AA-corrected versions of the
incumbent indigo `#4c5fd5`, green `#3fb68b` and crimson `#e84545`.

**Key Characteristics:**
- Terminal-dark surfaces in four steps (void, editor, output, raised) separated by hairlines.
- One primary action per surface: Run (indigo), which becomes Stop (crimson) while a run is live.
- Dancheong band (3px) at the top edge of the header and the app mark; nowhere else as decoration.
- Status is colour + icon + words, never colour alone.
- Korean copy first, written for Korean readers (해요체), English as a peer.

## Colors

Restrained palette: neutrals carry the screen, the four dancheong hues carry meaning.

### Primary
- **Dancheong Indigo** (`dancheong-indigo`): Run button, current tab rule, pressed toggles, focus ring
  (as the lighter `dancheong-indigo-text` on dark), links and diagnostic locations. White text on it
  is 5.4:1 (dark) / 7.2:1 (light `light-indigo`).

### Secondary
- **Dancheong Crimson** (`dancheong-crimson`): Stop button and destructive confirm only. Error *text*
  uses the lighter `status-error` so it stays above 4.5:1 on the panels.
- **Dancheong Ochre** (`dancheong-ochre`): limits exceeded (time, memory, output), warnings, search
  matches.
- **Dancheong Green** (`dancheong-green`): band segment; success text uses `status-success`.

### Neutral
- **Void** (`bg-void`): page ground, inputs and key caps.
- **Editor Zone** (`editor-zone`): header, editor, file tabs.
- **Output Zone** (`output-zone`): the output panel, one step lighter so the two halves read apart.
- **Raised** (`surface-raised`): dialogs, menus, toasts.
- **Hairline** (`border-hair`): panel dividers. **Strong border** (`border-strong`): input and select
  outlines, 3:1 against their ground so controls are identifiable.
- **Text** primary / secondary / whisper: 14.7 / 9.1 / 6.1:1 on the editor zone (dark); 17 / 10 / 5.9:1
  (light). Whisper is the floor for any readable text.

- **Terminal colours** (`--ansi-0` … `--ansi-15` in `globals.css`): program output's ANSI colours, redefined
  per theme so each stays at or above 4.5:1 on the output zone. Never use Tailwind's raw palette for them.

### Named Rules
**The Meaning-Only Rule.** Dancheong hues mark state or action. Outside the top band and the mark,
a hue that carries no meaning is a bug.

**The Two-Shade Rule.** Every accent has a fill shade (for backgrounds under white text) and a text
shade (for text on the panels). Never put the fill shade on a dark panel as text.

## Typography

**UI Font:** the platform sans with Korean coverage (Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR).
**Code Font:** D2Coding when installed, then Fira Code / Menlo / Consolas.

**Character:** one familiar sans for all chrome so the Korean code in the editor stays the focus; mono
only for code, file names, output and key caps.

### Hierarchy
- **Title** (600, 15px, 1.25): app name and dialog titles.
- **Label** (600, 13px): panel headings ("출력"), section headings in dialogs.
- **Body** (400, 14px, 1.5): dialog text, callouts, menu items.
- **Caption** (400, 12px): metrics, hints, counts.
- **Code** (400, 13px, line-height 24px): output and file names; the editor uses the user's setting.

Korean text uses `word-break: keep-all` so words wrap whole.

## Layout

Header 56px; file tabs and panel headers 40px; everything else belongs to the editor and output.
Editor and output split 50/50 side by side from 768px, switchable to stacked; below 768px they always
stack (55/45) and the minimap turns off. The header degrades in tiers: labels from 1280px, icon buttons
from 1024px, below that templates/history/share/theme/settings/sign-in move into the "more" menu while
the language select and Run stay visible down to 360px. Spacing follows a 4px grid.

## Elevation & Depth

Flat at rest. Panels never cast shadows; they are separated by hairlines and by the four surface steps.
Floating layers (dialogs, the "more" menu, toasts) use `--shadow-raised`
(`0 12px 32px -8px` black at 60%, plus a 2px contact shadow) and live in the browser top layer.

### Named Rules
**The Lift-Only-When-Floating Rule.** A shadow means "this is above the work and will go away".

## Shapes

Small, even radii: 6px for buttons and inputs, 8px for dialogs, cards and callouts, full round for
status chips. Hairline borders (1px) everywhere; no thick or coloured side borders.

## Components

### Buttons
- **Shape:** gently rounded (6px), 36px tall (32px in toolbars), icon 16px with an 8px gap.
- **Primary:** indigo fill, white text. Used once per surface (Run, a dialog's confirm).
- **Stop / Danger:** crimson fill, white text.
- **Secondary:** raised surface with a hairline that strengthens on hover.
- **Ghost / Icon:** no fill; hover uses the hover surface; pressed toggles show indigo text on a soft
  indigo wash (`aria-pressed`). Every icon-only button has a visible tooltip and an accessible name.

### Inputs / Fields
- **Style:** void background, 1px strong border, 6px radius, 36px tall.
- **Focus:** the global 2px indigo outline with 2px offset (never removed).

### Status chip
- Round pill in the output header: icon + words + live elapsed time while running; tone from the
  status (indigo running, green success, crimson failure, ochre limits, muted cancelled).

### Diagnostics
- One row per problem on a soft tone wash: severity word, a clickable `file:line:col` (dotted underline,
  jumps the editor cursor), the compiler message and its code. The same diagnostics appear as squiggles
  in the editor.

### Dialogs
- Native `<dialog>` (focus containment, Esc, backdrop click). Title + optional description in a header,
  scrolling body, actions right-aligned in a footer. History opens as a right-side sheet.

### Navigation
- Header: mark, title, language select, tool buttons, "more" menu (popover), Run. The active file tab
  carries a 2px indigo rule on its top edge.

### Files and the entry file
- Tabs and the file list mark the entry file (the file a run starts from) with a small filled play
  triangle in indigo text in place of the file icon, plus the words "진입 파일 / Entry file" for screen
  readers (and visibly in the file list). The mark appears only when there is more than one file.
- A file's context menu (right-click, the ContextMenu key or Shift+F10) is a small raised popover:
  set as entry file, rename, close/delete. The file list also shows a play button per row on hover/focus.
- Local draft saves are confirmed quietly at the right end of the tab bar (check icon + "임시 저장됨 14:02"),
  never with a toast.

### Run sweep (signature motion)
- While a run is live, a short indigo bar sweeps along the bottom edge of the output header (1.4s).
  With reduced motion it becomes a static band; the status chip still says "실행 중".

## Do's and Don'ts

### Do:
- **Do** keep Run the only filled indigo button on the main screen.
- **Do** pair every status colour with an icon and a word.
- **Do** write Korean copy in plain 해요체 for learners, and say what to do next in every error.
- **Do** use the CSS tokens (`bg-surface`, `text-fg-muted`, `border-hair`, ...) instead of raw colours.

### Don't:
- **Don't** use Tailwind's raw gray/blue palette in components; it ignores the light theme.
- **Don't** use emoji or Unicode glyphs as icons; use lucide icons at 16px.
- **Don't** spread dancheong colours as decoration beyond the top band and the mark.
- **Don't** put text in `text-whisper` on anything lighter than the raised surface.
