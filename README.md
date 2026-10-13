# RenoGuard

*Renovate with proof, not promises.*

RenoGuard is a renovation management app for homeowners who want clearer quotations, better defect tracking, and visibility over changes to their budget and timeline. It brings project information together so homeowners can review proposed work before approving it and follow repairs through to completion.

Built as a frontend prototype for **SMU IS211 — Interaction Design and Prototyping**.

## Features

The prototype includes:

- **Project dashboard** — renovation progress, pending decisions, and recent updates.
- **Quotations and change approvals** — compare proposed work, confirm additional costs, and withdraw eligible approvals.
- **Defect tracking** — record room-specific issues, edit or withdraw new reports, follow repairs, and verify completion.
- **Budget and timeline** — understand the impact of proposed changes and monitor approved costs and milestones.
- **Room and material previews** — explore room records and compare replacement finishes.
- **Project guidance** — plain-language explanations of recorded scope and costs.

The web dashboard is at the project root. The dedicated mobile app is in `mobile/`, with Overview, Rooms, Defects, Changes, and Budget screens plus their supporting journeys.

Both interfaces share project rules and browser storage through `shared/project-store.js`. Saved decisions and reports update between tabs on the same browser and origin. Photo previews last only for the current page session. No real payments or messages are sent.

## Technology

- HTML, CSS, and vanilla JavaScript
- Node.js for the local preview server

No frontend framework, database, or backend setup is required. The shared data layer provides a single place to connect both interfaces to a future backend API.

## Getting started

With Node.js installed, run this command from the project folder:

```sh
node preview-server.cjs
```

Open either interface in your browser:

- [Web dashboard](http://127.0.0.1:8765/)
- [Mobile app](http://127.0.0.1:8765/mobile/)

Both use the same preview server. No package installation is needed. Stop it with `Ctrl+C`.

You can also open `index.html` or `mobile/index.html` directly. The preview server is recommended for shared storage between the two views.

Earlier screen explorations are preserved in `drafts/`. While the server is running, open [the original drafts](http://127.0.0.1:8765/drafts/) to view them.

## Design resources

| Resource | Link |
| --- | --- |
| Figma UI/UX explorations and drafts | To be added |
| Figma interactive prototype | To be added |
| Live app demo | To be added |
| Low-fidelity walkthrough | [Watch the walkthrough](https://www.youtube.com/watch?v=oRJ63LUH_NY) |
| Project pitch | [Watch the pitch](https://www.youtube.com/watch?v=1Q7eNqnpxkM) |
