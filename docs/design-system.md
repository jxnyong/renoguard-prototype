# RenoGuard design system · Iteration 2

## Direction

The previous Figma draft used green, brass, Alice type, and a shield. The revised prototype takes a playful construction direction inspired by Bob the Builder without using the character, name as a product mark, or copyrighted artwork. A simple hard-hat mark expresses building and safety while retaining the RenoGuard name. The palette makes the experience warmer and easier to recognise in the filmed walkthrough.

## Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| Navy / primary | `#183C5A` | Actions, active navigation, main text accents |
| Deep navy | `#102B43` | Pressed actions, loading background |
| Worksite yellow | `#FFCC3D` | Hard-hat logo, progress and structural accents |
| Safety orange | `#E87D24` | Progress ring and carousel position |
| Pale blue | `#DFEBF3` | Active and selected surfaces |
| Ink | `#17324A` | Primary text |
| Muted | `#536879` | Supporting text |
| Line | `#CCD8DF` | Dividers and input outlines |
| Canvas | `#F5F8F8` | App background |
| Warm alert | `#FFF0C9` | Pending cost and decision surfaces |

Use text labels as well as colour for status. Keep navy text on pale surfaces and white text on navy. The palette is defined in `mobile/styles.css`; use tokens rather than adding page-specific colours.

## Type, spacing and logo

The interface uses Inter where installed, then Segoe UI or Arial. This replaces the Figma draft's decorative Alice type for easier reading at phone size. Screen titles are 28 px, section titles 19–20 px, card titles 16 px, body 14–15 px, and notes 11–12 px. A/B option names use the same 14 px rule and specification rows use the same 13 px rule. Use the existing 4/8/12/16/20/24 px spacing rhythm, at least 44 px touch targets, and 16–20 px card radii.

The logo is the inline hard-hat symbol in `index.html`, shown on yellow in the header and loading screen. It is an original geometric mark. Do not import Bob the Builder character imagery into the app.

## Shared components

| Component | Source | Rule |
| --- | --- | --- |
| Header and bottom navigation | `index.html`, `mobile/styles.css` | Same chrome on all primary screens; detail screens show Back and Home. |
| Primary, secondary, danger buttons | `.button` in `mobile/styles.css` | Shared height, radius, focus and press feedback. |
| Cards and status pills | `.card`, `.status` | Same padding, border and state language across screens. |
| Progress ring and stage tracker | `renovationProgress()` | Animates from empty each time Home is entered. |
| Comparison data and radio choices | `mobile/comparison.js` | A and B share tile facts and accessible choice labels. |
| Cost/timing impact and approval summary | `mobile/comparison.js` | Identical in both experiment conditions. |
| Defect, quotation, budget and payment records | `shared/project-store.js` | State changes only after the relevant action. |

## Motion and accessibility

The loading bar fills once while assets are prepared. Screen entry uses a short upward fade; cards stagger gently. Buttons give press feedback. Version A's table scrolls smoothly with visible arrows and position marks. Motion is disabled by `prefers-reduced-motion`. Focus remains visible, table controls have labels, and the UI keeps semantic radio buttons and descriptive status text.

## Team maintenance

Update the shared token or component before adding a local override. Keep A/B content, tile order, image size, typography, cost, and approval action identical; change only the presentation under study. Record new design decisions here and update the scenario notes when the walkthrough changes.
