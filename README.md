# RenoGuard

*Build your renovation with confidence.*

RenoGuard is a mobile renovation prototype for reporting defects, reviewing tile changes, previewing finishes, and checking the effect of an approval on budget and payments. It was created for **SMU IS211 — Interaction Design and Prototyping**.

The visual direction draws on the cheerful construction theme associated with Bob the Builder: hard-hat geometry, worksite yellow, navy, and lively movement. RenoGuard uses its own name and original mark.

## Features

- Project dashboard with animated progress and pending decisions
- Defect reporting with photos and linked project records
- Bathroom finish preview and variation quotation review
- Budget and payment timeline updated after approval
- Two focused A/B comparison layouts sharing the same data and approval flow

## Getting started

Follow the [local setup guide](docs/setup.md), then run `node preview-server.cjs` from this folder and open [the mobile app](http://127.0.0.1:8765/). It adapts to phone screens and shows a phone frame on larger displays. The prototype uses HTML, CSS, JavaScript, and local browser storage; no package installation or build step is required.

## Project structure

```text
renoguard-prototype/
├── index.html             Mobile app entry point and icon sprite
├── mobile/                Screens, styles, comparison variants, room model
├── shared/                Project state and scenario rules
├── assets/                Room photography and tile samples
├── docs/design-system.md  Colours, typography, components, motion rules
├── docs/iteration-2.md    Draft analysis, scenario flow, A/B plan
├── docs/setup.md          Local setup and study preview
├── drafts/                Earlier screen explorations
└── preview-server.cjs     Local preview server
```

## Walkthrough

The easy scenario starts with Thomas reporting cracked bathroom floor tiles. He opens the resulting proposal from Home, compares the original tile with three replacements, previews finishes, checks the quotation and budget, chooses a tile, approves the S$250 change, then checks the updated budget and payment milestone. [Iteration 2 notes](docs/iteration-2.md) list the distinct screens and the draft differences. The final flow diagram will be added after the prototype is settled.

| Video | Link |
| --- | --- |
| High-fidelity walkthrough | Coming soon |
| Low-fidelity walkthrough | [Watch on YouTube](https://www.youtube.com/watch?v=oRJ63LUH_NY) |

## A/B study previews

Both conditions use one codebase. Query parameters choose the layout and a fresh study session; no copied app folders are needed.

| Condition | Focused approval task | Full easy scenario |
| --- | --- | --- |
| A · scrollable table | [Open A](http://127.0.0.1:8765/?variant=a&study=quotation) | [Open full A](http://127.0.0.1:8765/?variant=a&study=scenario) |
| B · full-width cards | [Open B](http://127.0.0.1:8765/?variant=b&study=quotation) | [Open full B](http://127.0.0.1:8765/?variant=b&study=scenario) |

The focused links start at the pending quotation and reset on reload. Use these for the Maze experiment; the full-scenario links are for walkthrough filming and broader review. Both versions keep option names, specifications, font sizes, costs, dates, and approval steps the same. See the [study and design decisions](docs/iteration-2.md).

## Design resources

- [Design system and shared components](docs/design-system.md)
- [Iteration 2 draft analysis and scenario map](docs/iteration-2.md)
- [Team Figma draft](https://www.figma.com/design/ffrTmJHTCUY2NdfNZG7SkK/RenoGuard---High-Fidelity?node-id=1-2)
- [Project pitch](https://www.youtube.com/watch?v=1Q7eNqnpxkM)
