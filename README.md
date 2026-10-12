# RenoGuard

*Renovate with proof, not promises.*

RenoGuard helps homeowners keep a clear record of renovation work, defects, and proposed changes. It connects the original quotation with each decision, so homeowners can understand the cost and schedule impact before approving work and verify repairs afterward.

**SMU IS211 · Interaction Design and Prototyping · G14T4 · RenoGuardians**

**Current phase:** Iteration 2, high-fidelity frontend design and prototyping. The research review is complete; the repository currently contains two exploratory HTML screens. The complete scenario prototype is still to be built.

[Design direction](#design-direction) · [Planned journey](#planned-iteration-2-journey) · [Preview the drafts](#preview-the-existing-drafts) · [Design resources](#design-resources-and-links)

## The problem and intended user

After a renovation contract is signed, quotations, photographs, agreements, and progress updates often become scattered across PDFs, WhatsApp conversations, and site discussions. Extra work can begin before its price is clear, and reported defects can disappear among unrelated messages.

The primary user is a first-time BTO or resale-flat homeowner with limited renovation knowledge and limited time for site visits. The Iter1 persona, **Thomas Eng**, wants understandable explanations, written confirmation before changes, and evidence that reported defects have been resolved.

RenoGuard focuses on one renovation project and its assigned interior designer (ID). The homeowner experience is the priority; ID responses and contractor updates can be simulated in the frontend.

## What Iteration 1 established

The completed Iter1 materials include 11 participant interviews, a primary persona, easy and hard scenarios, embedded prototype screens, six evaluators' compiled HE feedback, and a development journal. The interview group includes experienced homeowners and different housing and contractor arrangements, so its findings should not be presented as representative statistics for all first-time homeowners.

| Research finding | Implication for the app |
| --- | --- |
| Decisions and defect photographs become difficult to retrieve. | Link records by room, defect, selected material, and proposal rather than requiring users to search conversations. |
| Minor verbal changes can lead to unexpected charges. | Show the original and proposed work, itemised additional cost, and schedule impact before explicit approval. |
| Homeowners struggle with scope, jargon, measurements, and sequencing. | Use plain language, accessible specifications, room context, and clear milestone dependencies. |
| Defect reporting alone does not ensure repair or verification. | Show the responsible person, next action, repair evidence, and homeowner verification separately. |
| Some renovations ran smoothly with clear contracts, regular updates, and inspection checks. | Support those successful practices with an organised record and visible follow-up. |

Useful principles from the Iter1 inspirations are spatial navigation from **Google Maps Street View**, product comparison and room context from **IKEA**, and visible task states from **Trello**. These guide the experience without determining the final visual style.

## Design direction

Build a mobile-first responsive web app with a calm, readable interface. Use a consistent typography scale, spacing, icon style, and set of reusable controls across every view. The existing teal palette is a starting point for exploration.

The course material informs these decisions:

- **Recognition rather than recall:** put original and proposed information together; carry known room, product, photograph, and defect details into the next step.
- **Clear mental models:** distinguish requesting a quotation, approving a change, tracking committed costs, and recording payments. Use “Dashboard” for the project overview and room names for physical spaces.
- **Visible status and feedback:** make blockers and pending decisions prominent, name the responsible person, and show what happens after an action.
- **Mobile input and reach:** use room/category selectors, appropriately sized and spaced controls, and visible navigation for frequent tasks.
- **Hierarchy and information scent:** lead with decision information and descriptive actions; place supporting specifications and history behind clear detail controls.
- **Accessibility:** use readable contrast, text alongside status colours and icons, labelled controls, keyboard access, visible focus, and adaptable layouts.
- **Iteration and evaluation:** compare meaningful design alternatives and test realistic tasks before treating a design preference as evidence.

### Three priorities from the heuristic evaluation

The references below use the **Iter1 submission's compiled issue numbering**. The separate resource summary is a draft with different consolidation and severity ratings; it should not be treated as the final numbered report.

| Priority | Proposed change | Iter1 HE references |
| --- | --- | --- |
| Safer approval | Separate a request from financial approval. Show a review summary, explicit confirmation, cancellation, an approval receipt, and a route to ask the ID for an amendment. | #1 Approval lacks confirmation and recovery; #4 Request versus approval is unclear. |
| Connected and accurate decisions | Preserve the linked defect, room, material, and documents. Compare the same attributes and calculate every budget display from shared values. | #3 Missing defect link; #6 Unclear product comparison; #12 Incorrect remaining balance. |
| Visible navigation and next actions | Provide consistent access to the Dashboard and clear back destinations. Group secondary tools and surface stock blockers and pending decisions directly in the Dashboard and defect list. | #2 Missing route to the main page; #5 Overloaded menu; #8 Hidden stock/pending decision status. |

Other fixes include readable attachment viewers, clearly interactive floor-plan rooms, editable reports where appropriate, and distinct actions for accepting a repair or reporting that it remains unresolved.

Some issues were downgraded in the submitted HE report. Implementation priorities will consider their actual consequences: incorrect arithmetic affects trust at approval, ambiguous acceptance controls can cause errors, and a known project contact still benefits from a visible recipient label. A simulated room preview must explain its limitations, and assistant explanations must point to recorded proposals rather than appear to overrule confirmed ID information.

## Planned Iteration 2 journey

Iteration 2 asks for **one revised easy scenario** and allows selected hard-scenario features if needed. It suggests roughly **6–14 views** and permits simulated complex technology. The agreed direction is to connect defect handling with change approval in one focused journey.

**Proposed scenario:** Thomas sees that the original material for a reported bedroom-tile defect is unavailable. He compares the linked alternatives, previews his preferred option, and requests a quotation. He then reviews the ID's itemised variation order (VO), checks the budget and dates, confirms approval, and can later inspect repair evidence and verify the result.

| Planned view | What the homeowner can accomplish |
| --- | --- |
| Dashboard | Find the action requiring attention and understand the current project stage. |
| Defects | Scan room, status, responsible person, and next action without opening every record. |
| Defect details | Inspect photographs, acknowledgement, the stock blocker, linked proposals, and activity history. |
| Floor plan and room | Locate the issue spatially, open room details, or start a defect report. |
| Report or edit defect | Choose room/category, add evidence, review the recipient, and save a simulated report. |
| Compare alternatives | Compare original and replacement dimensions, finish, availability, and quoted or estimated cost. |
| Room preview | See the selected finish in context, with an explicit illustrative-preview label. |
| Change request | Review pre-filled context and request a quotation without approving additional spending. |
| Variation order | Review scope differences, itemised cost, dates, attachments, and the ID's recorded proposal. |
| Confirm and receipt | Confirm the stated consequence and receive a traceable approval record. |
| Budget and timeline | Check projected impact before approval and consistent committed values afterward. |
| Repair verification | Review completion evidence and either verify the repair or request further rectification. |

This is a proposed view set, not a claim that these screens already exist. The final walkthrough and view count should stay aligned with the group's revised easy scenario. Supporting document viewers and an optional scripted assistant can be contextual panels instead of extra navigation destinations. No login, registration, or profile flow is needed for this scenario.

### Interaction and data rules

- Selecting a material or submitting a request does not approve spending. Show “Awaiting quotation” before an ID proposal is available.
- A VO must be available to review **before** approval. The confirmed record follows approval; work is not shown as authorised until the required acknowledgements are recorded.
- Pending changes affect a clearly labelled projection. Approved changes affect committed totals exactly once, including after repeated taps or refreshes.
- Preserve links between the original scope, defect, alternative, request, proposal, and repair evidence throughout the journey.
- Contractor completion and homeowner verification are separate states. An unresolved repair can return to follow-up rather than silently closing.
- Budget is a tracker. Approved costs, payments made, and remaining allowance have different meanings; there is no deposit, escrow, or real payment transfer in this prototype.
- Keep proposal dates, repair milestones, and handover dates consistent. A room preview illustrates appearance and does not certify dimensions, material accuracy, or construction feasibility.

### Reference budget example

The Iter1 replacement example provides a useful consistency check:

| Value | Before approval | If the S$180 change is approved |
| --- | ---: | ---: |
| Total budget | S$45,000 | S$45,000 |
| Approved costs | S$42,250 | S$42,430 |
| Remaining allowance | S$2,750 | **S$2,570** |

The additional repair labour is S$0 in this example. **S$2,750 − S$180 = S$2,570**, not S$2,390. These are scenario values, not actual transactions. The current HTML drafts use kitchen tiles; the Iter1 hard scenario uses bedroom tiles. The final demo will use one consistent location and set of dates.

## Frontend implementation scope

The app will demonstrate complete interactions using realistic seeded data and local browser state. Semantic HTML, CSS, and JavaScript are sufficient for the current scope; choose additional tooling only when it makes the prototype easier to maintain or test.

| Area | Prototype approach |
| --- | --- |
| Records and approvals | Local state with linked IDs, validation, coherent status changes, and a demo reset. |
| Photos and documents | Local previews or bundled sample records; quotation extraction may use a prepared room-by-room baseline. |
| ID and contractor responses | Seeded or scripted events with clear demo behaviour. |
| AI explanations | Scripted, document-linked answers that explain recorded scope and costs. |
| AR or 3D visualisation | A clearly labelled interactive simulation; genuine camera tracking or a construction model is optional. |
| Payments and notifications | Simulated tracking and in-app feedback. |

Keep app code and assets in this repository. Add only files required for the prototype, preserve useful drafts, and commit and push completed iterations to GitHub. Course documents remain in the course folder; this repository does not need copies of interview photographs or submission documents.

## Preview the existing drafts

These are exploratory screens, not the finished Iter2 prototype:

- [Dashboard draft](screen/home.html): attention card, linked defect, shortcuts, and contextual panels.
- [Budget draft](screen/budget.html): committed costs and the projected impact of a pending change.

Open `screen/home.html` in a browser, or run the existing preview server from the repository root:

```sh
node screen/preview-server.cjs
```

Then open [the local preview](http://127.0.0.1:8765). It requires Node.js and no package installation. The drafts do not complete approval, persist defect reports, or provide a full repair workflow. Their visual patterns are references for the fresh design.

## Evaluation and submission considerations

The Iter2 rubric assigns **40/100 points to the prototype**, rewarding clear scenario coverage and a detailed, polished experience. Evidence of justified changes and the required experiment also matter.

The assignment requires one experiment goal, one independent variable comparing versions A and B, two dependent variables, and **at least 20 real participants** in an automated web experiment. Test a focused part of the problem; the entire old design versus an entirely redesigned app introduces too many differences.

**Proposed experiment:** compare two plausible layouts for the original/proposed work on the VO review screen. Keep content, numbers, action labels, approval safeguards, and visual styling consistent; vary the comparison layout. Measure **decision accuracy** using predefined answers about cost and schedule, and **time to complete the task** with a defined start and end. Pilot the task, control learning/order effects where relevant, and choose analysis appropriate to the collected data. This proposal has not been run or validated.

The web-study tool and shared results-collection route remain to be selected. Browser-local storage alone will not collect results from remote participants. Template example rows are not RenoGuard findings, and a minimum sample size does not guarantee a statistically significant result.

As the app evolves, retain evidence the group can use for submission:

- A navigation diagram and at least one screenshot of every view in the final scenario, using consistent view names.
- Before/after evidence for the three main HE changes, with references to the compiled findings and reasons for any severe issues left unfixed.
- Alternative UI drafts and the reasoning behind the chosen design. Figma is useful for this, but is not mandated by the instructions.
- An explanation of simulated features and the contribution of AI assistance, alongside the group's own decisions and revisions.
- An accessible app/experiment link and the required pitch video when ready.

The documents specify submission 72 hours before Week 13 class. Confirm the actual class date and academic-term text before submission; the instructions retain a “2025–26 Term 1” video label while the existing project examples use 2026 dates.

## Design resources and links

| Resource | Link or status |
| --- | --- |
| Source repository | [jxnyong/renoguard-prototype](https://github.com/jxnyong/renoguard-prototype) |
| Original RenoGuard pitch | [Proposal video link](https://www.youtube.com/watch?v=1Q7eNqnpxkM) |
| Iter1 hard-scenario walkthrough | [Low-fidelity walkthrough link](https://www.youtube.com/watch?v=oRJ63LUH_NY) |
| Figma UI explorations and alternative drafts | To be added |
| Figma shared styles and components | To be added |
| Figma clickable scenario prototype | To be added |
| High-fidelity frontend demo | Not deployed |
| Iter2 experiment A and B | Not created |
| Iter2 walkthrough and pitch | To be added |

Replace the status entries with real links as artifacts become available. Video links above were recorded in the supplied project documents; they were not re-evaluated as part of the source review.

### Source material reviewed

Project context comes from the course folder's `Assignments/As1 - Project Proposal`, `Assignments/Iter1 - Low Fidelity`, and `Assignments/Iter2 - High Fidelity` materials, particularly:

- The As1 project proposal and pitch text.
- Iter1 submitted overview, empathy, requirements, prototype, HE, and journal; the HE resource summary and original iteration instructions.
- Iter2 instructions and all supplied templates, including the experiment design and example results workbook.
- Available notes and relevant lecture content from Weeks 1–6 and Week 9: empathy, requirements, ideation, prototyping, memory/input/mobile interaction, information/visual design, inspection, evaluation, and web experiments.

Assignment 2, which evaluates another team's app, was excluded. Lecture videos and external linked examples were not reviewed. The Week 9 notes file is empty; the Week 9 lecture slides provide the available context.

Course instructions are assessment context. The frontend scope and repository workflow follow the project owner's request; this review does not create or complete the separate assignment documents.
