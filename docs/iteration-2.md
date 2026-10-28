# Iteration 2 draft analysis and scenario map

## What the attached draft says

Thomas Eng is a first-time Punggol BTO renovator who wants written evidence for changes, plain-language terms, visibility into costs and time, and reliable defect follow-up. His budget and handover pressure make the S$250 tile variation consequential. The easy scenario names seven features: Report Defect, Organisation Dashboard, Approval Dashboard, AR Room Preview, Variations & Quotes, Live Project Budget, and Payment Timeline.

The draft scenario begins with a bathroom tile defect. The designer then proposes a variation because the original tile is out of stock. Thomas compares alternatives, previews them, checks the formal quotation and budget, approves one, and verifies the revised budget and new payment milestone. The document calls for **two** proposed tiles. The consultation request calls for **three** A/B comparison options; the prototype now shows three replacements in both versions, so the draft scenario text and quotation artefact should be updated before submission. The draft also writes the original target as both **1 Jul** and **1/07/2026**, and one payment date as **14/07/06**. The prototype consistently uses **1 Jul 2026** and **14 Jul 2026**.

The team Figma design system provided useful spacing, tap-target, and component conventions. Its green/brass palette, shield, and Alice typography were revised to the new construction direction. The Figma Screens page includes an additional linked change-request sequence that differs from the attached easy-scenario prose. The app follows the prose and can be aligned with the final team storyboard later.

## Walkthrough screen count

The core filmed path uses **12 distinct app screens** (counting the Home dashboard once even when revisited):

1. Report defect form
2. Defect saved confirmation
3. Home / Organisation Dashboard
4. Approvals list
5. Tile change review and A/B comparison
6. Bathroom preview
7. Quotes & variations list
8. Variation quotation detail
9. Budget, checked before and after approval
10. Approval confirmation
11. Approval receipt
12. Payment timeline

This count follows the direct path and excludes optional tile-detail, defect-detail, profile, and help screens. The recorded tap count can be higher because Home, review, and Budget are revisited.

## Focused A/B experiment

Use `?variant=a&study=quotation` and `?variant=b&study=quotation` for the Maze task. Both start at the pending tile quotation, without requiring the whole defect-to-payment journey. A uses a horizontally scrollable comparison table with sticky specification labels, arrows, and position marks. B uses vertically stacked cards with the choice control inside each full-width card. Both require scrolling, show the same original and three replacement tiles, use the same name and detail sizes, and reach the same approval summary and receipt.

Suggested identical task: “Your designer has proposed replacement bathroom tiles. Review the extra cost and revised completion date, choose Sabbia Matte, and approve the change. Stop when the approval receipt appears.” Record completion and time, ask the S$250 cost and 14 Jul date, then ask satisfaction on a 1–7 scale. Rotate condition order or assign participants evenly. Pilot the task and screen recording on both a phone and desktop before collecting data. The two Maze links supplied by the team are examples of task scope, not the implementation source of truth.

The app is one shared codebase. URL parameters select a condition and a fresh in-memory test state. Later hosting can publish the same files once and use two distinct starting URLs, without duplicating source folders.
