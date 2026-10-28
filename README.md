# RenoGuard

A mobile renovation prototype that helps homeowners report defects, compare proposed changes, preview finishes, and understand the cost before approving work.

Created for **SMU IS211 — Interaction Design and Prototyping**.

<br>

## ✨ Features

- **Project overview** — renovation progress, pending decisions and recent updates.
- **Defect tracking** — photo reports, repair records and verification.
- **Tile comparison** — three replacement options with matching A/B content.
- **Room preview** — switch finishes in a realistic bathroom view.
- **Quotes, budget and payments** — review the S$250 variation and its effect before approval.
- **Demo controls** — scenario walkthrough, Explore mode and reset tools.

<br>

## 🚀 Getting started

**First time setting up the project?**

[Open the step-by-step Windows and macOS installation guide →](docs/setup.md)

The guide covers installing Git and Node.js, downloading this repository, and starting the app.

**Already have Node.js installed?** Run this command from the project folder:

```sh
node preview-server.cjs
```

Then open **[RenoGuard at http://127.0.0.1:8765/](http://127.0.0.1:8765/)**.

Computers show a phone-sized preview; phones use the available screen width. No package installation or build step is required.

*To stop the server, press <kbd>Ctrl</kbd> + <kbd>C</kbd> in the terminal.*

*If images or styles are missing, use the preview address above instead of opening the HTML file directly.*

<br>

## 📱 App preview

Screenshots will be added after the final design review.

<!-- Add final screenshots here. -->

<br>

## 🎬 Walkthrough

The easy scenario follows Thomas from reporting cracked bathroom tiles to reviewing the replacement quotation, previewing the finishes, checking his budget, approving a tile and reviewing the new payment milestone.

The recommended recording path uses **12 distinct screens**, with Home and Budget revisited. [See the screen-by-screen walkthrough and scenario notes](docs/iteration-2.md#walkthrough-screen-count).

**Walkthrough steps** and **Reset demo** are available from Project tools, Profile and the approval receipt.

| Video | Link |
| --- | --- |
| High-fidelity walkthrough | Coming soon |
| Low-fidelity walkthrough | [Watch on YouTube](https://www.youtube.com/watch?v=oRJ63LUH_NY) |

<!-- Add the final flow diagram and high-fidelity video link here. -->

<br>

## 🧪 A/B study previews

Start the preview server, then choose a focused experiment or the complete scenario:

| Version | Comparison layout | Focused approval task | Full scenario |
| --- | --- | --- | --- |
| **A** | Swipeable table with arrows and position indicators | [Open A](http://127.0.0.1:8765/?variant=a&study=quotation) | [Walkthrough A](http://127.0.0.1:8765/?variant=a&study=scenario) |
| **B** | Full-width cards with a centred radio inside each card | [Open B](http://127.0.0.1:8765/?variant=b&study=quotation) | [Walkthrough B](http://127.0.0.1:8765/?variant=b&study=scenario) |

The focused links start at the pending quotation and reset on refresh. Use these for the Maze comparison; use the full scenario for walkthrough filming.

Both versions share the same three materials, typography, specifications, prices and approval flow. Every replacement adds **S$250**, leaves **S$29,750**, and proposes completion on **14 Jul 2026**. [Read the experiment notes](docs/iteration-2.md#focused-ab-experiment).

Both versions run from one codebase. Saved demo versions and walkthrough settings are available under **Profile → Prototype setup**.

<br>

## 🎨 Design system

**[Read the colours, typography and component guidelines →](docs/design-system.md)**

For visual examples, **[open the live component sheet](http://127.0.0.1:8765/docs/design-system.html)** while the preview server is running. It uses the app's actual styles and comparison components.

- [Team Figma design and prototype](https://www.figma.com/design/ffrTmJHTCUY2NdfNZG7SkK/RenoGuard---High-Fidelity?node-id=1-2)
- [Iteration 2 scenario and consultation review](docs/iteration-2.md)
- [Project pitch](https://www.youtube.com/watch?v=1Q7eNqnpxkM)

<br>

## 🛠️ Technology

- **Interface:** HTML, CSS and vanilla JavaScript
- **Local preview:** Node.js
- **Saved demos:** browser local storage
- **Experiment sessions:** temporary in-memory state, reset on refresh

This is a frontend prototype. Designer updates, AR previews and payment records are simulated.

<br>

## 📁 Project structure

```text
renoguard-prototype/
├── mobile/                 Screens, shared comparison component and room renderer
├── shared/                 Project state, approvals and demo rules
├── assets/                 Room photos, tile samples and the RenoGuard mark
├── docs/
│   ├── setup.md            Windows and macOS installation guide
│   ├── design-system.md    Colour, type, component and motion guidelines
│   ├── design-system.html  Live visual component sheet
│   └── iteration-2.md      Scenario flow and consultation review
├── drafts/                 Earlier screen explorations
├── index.html              Mobile app entry point
├── preview-server.cjs      Local preview server
└── README.md               Project overview and quick start
```
