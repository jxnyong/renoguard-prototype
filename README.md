# RenoGuard

*Renovate with proof, not promises.*

A renovation management frontend for homeowners to track defects, visualise proposed finishes, and understand changes to their budget and timeline before approving work.

Built for **SMU IS211 — Interaction Design and Prototyping**.

## Features

- Project dashboard with progress, pending approvals and recent updates.
- Interactive 3D room overview with highlighted rooms, issue indicators and room details.
- Realistic bathroom preview with switchable floor tile finishes.
- Defect reports with photo previews, linked change requests and repair verification.
- Variation orders with material comparisons, quotation breakdowns and explicit approval.
- Budget tracking and payment milestones that update after approval.

The mobile interface follows the Figma's **390 × 844** reference frames. On computers, it appears in a centred phone frame with internal scrolling and scales down to fit shorter screens. On phones, it adapts to the device screen. AR previews and room models are illustrative simulations.

## Preview

Final screenshots of the mobile app and its main journeys will be added here once the design and implementation are finalised.

<!-- Add screenshots to docs/images/ when ready, then replace this comment with
working Markdown images. Suggested views: project dashboard, interactive room
overview, bathroom tile comparison, and approval/budget updates. Do not add
image links until their files exist. -->

## Technology

- HTML, CSS and vanilla JavaScript
- Browser local storage for demo records
- Node.js built-in modules for the preview server

No package installation, database or backend is required. Mobile and desktop share the same project data adapter in `shared/`.

## Run locally

With [Node.js](https://nodejs.org/) installed, run this command from the project folder:

```sh
node preview-server.cjs
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/) for the mobile app. The earlier desktop interface is available at [/web/](http://127.0.0.1:8765/web/).

Use your browser's responsive device mode to preview at **390 × 844**. Stop the server with `Ctrl+C`.

Use the preview server rather than opening HTML files directly; asset paths start at the server root.

### First-time setup

For installation, cloning, mobile preview instructions and troubleshooting, follow the [detailed Windows and macOS setup guide](docs/setup.md).

## Project structure

```text
mobile/    Mobile interface and room renderer
web/       Desktop interface
shared/    Project rules and local storage adapter
assets/    Room images and material samples
drafts/    Earlier HTML screen explorations
docs/      Detailed setup walkthrough
```

Decisions and reports stay in this browser on this device. Interfaces opened on the same origin share records. Photo previews last for the current page session. No real messages, signatures or payments are sent. Use **Project settings → Reset demo** to restore the sample project.

## Design resources

- [Figma screens and interaction design](https://www.figma.com/design/ffrTmJHTCUY2NdfNZG7SkK/RenoGuard---High-Fidelity?node-id=1-2)
- [Earlier screen drafts](http://127.0.0.1:8765/drafts/) — requires the local preview server
- [Low-fidelity walkthrough](https://www.youtube.com/watch?v=oRJ63LUH_NY)
- [Project pitch](https://www.youtube.com/watch?v=1Q7eNqnpxkM)

Bathroom imagery and tile samples are adapted from the project's Figma design and stored locally in `assets/`.
