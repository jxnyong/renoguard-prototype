# RenoGuard

*Renovate with proof, not promises.*

RenoGuard is a renovation management app for homeowners who want clearer quotations, better defect tracking, and visibility over changes to their budget and timeline. It brings project information together so homeowners can review proposed work before approving it and follow repairs through to completion.

Built as a frontend prototype for **SMU IS211 — Interaction Design and Prototyping**.

## Features

The prototype is being developed to support:

- **Project dashboard** — renovation progress, pending decisions, and recent updates.
- **Quotations and change approvals** — compare original and proposed work, review additional costs, and confirm variation orders.
- **Defect tracking** — record issues with photographs and room locations, track repairs, and verify completion.
- **Budget and timeline** — understand the impact of proposed changes and monitor approved costs and milestones.
- **Room and material previews** — explore the floor plan and compare replacement finishes in context.
- **Project guidance** — plain-language explanations of recorded scope and costs.

The current preview contains dashboard and budget drafts with sample data. The app uses simulated project information and does not process real payments or send reports to contractors.

## Technology

- HTML, CSS, and vanilla JavaScript
- Node.js for the local preview server

No frontend framework, database, or backend setup is required.

## Getting started

With Node.js installed, run this command from the project folder:

```sh
node screen/preview-server.cjs
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765) in your browser. No package installation is needed. Stop the server with `Ctrl+C`.

You can also open `screen/home.html` directly in a browser to view the drafts.

## Design resources

| Resource | Link |
| --- | --- |
| Figma UI/UX explorations and drafts | To be added |
| Figma interactive prototype | To be added |
| Live app demo | To be added |
| Low-fidelity walkthrough | [Watch the walkthrough](https://www.youtube.com/watch?v=oRJ63LUH_NY) |
| Project pitch | [Watch the pitch](https://www.youtube.com/watch?v=1Q7eNqnpxkM) |
