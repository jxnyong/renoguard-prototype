# Setup guide

To develop locally, install Git and Node.js, download RenoGuard, and start the preview. Follow the section for your operating system, then continue to **Run the app**.

To share the app online, see [Publish online with GitHub Pages](#publish-online-with-github-pages). Participants opening the published link only need a browser.

You need **Git**, **Node.js LTS**, and a browser. No additional packages or build steps are required.

## Windows

### 1. Install Git

Download and run the installer from [Git for Windows](https://git-scm.com/install/windows). Choose the version matching your computer: usually **x64**, or **ARM64** for Windows on ARM. Keep command-line/PATH integration enabled.

### 2. Install Node.js

Download the **LTS Windows Installer (`.msi`)** from [Node.js](https://nodejs.org/en/download) and follow its installation steps.

### 3. Check the installations

Open **PowerShell** from the Start menu. If it was already open, close and reopen it after installation.

```powershell
git --version
node --version
```

Both commands should display version numbers. If they already work, you can skip reinstalling the tools. WSL is not required.

### 4. Download the project

Run these commands in PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Projects\GitHub"
Set-Location "$env:USERPROFILE\Projects\GitHub"
git clone https://github.com/jxnyong/renoguard-prototype.git
Set-Location renoguard-prototype
```

Continue to [Run the app](#run-the-app).

## macOS

### 1. Install Git

Press **Command + Space**, search for **Terminal**, and open it. Install Apple's Command Line Tools:

```sh
xcode-select --install
```

Follow the installation prompts. Full Xcode is not needed. If the tools are already installed, continue to the version check below. See [Git's macOS installation instructions](https://git-scm.com/install/mac).

### 2. Install Node.js

Download the **LTS macOS Installer (`.pkg`)** from [Node.js](https://nodejs.org/en/download) and follow its installation steps. Close and reopen Terminal afterwards.

### 3. Check the installations

```sh
git --version
node --version
```

Both commands should display version numbers.

### 4. Download the project

```sh
mkdir -p ~/Projects/GitHub
cd ~/Projects/GitHub
git clone https://github.com/jxnyong/renoguard-prototype.git
cd renoguard-prototype
```

Continue to [Run the app](#run-the-app).

## Run the app

From the `renoguard-prototype` folder, start the preview server:

```sh
node preview-server.cjs
```

The terminal should show:

```text
RenoGuard preview: http://127.0.0.1:8765
```

Keep the terminal open and visit an address below in your browser:

| View | Address |
| --- | --- |
| Mobile app | [http://127.0.0.1:8765/](http://127.0.0.1:8765/) |
| Desktop interface | [http://127.0.0.1:8765/web/](http://127.0.0.1:8765/web/) |

The mobile app automatically uses a phone-sized frame on computers. No browser device-mode configuration is needed.

**Stop the server**

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> in the terminal. On macOS, use **Control**, not Command.

*Use the preview address rather than opening HTML files directly. The server runs on this computer only.*

## Reopen the app later

**Windows — PowerShell**

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\renoguard-prototype"
node preview-server.cjs
```

**macOS — Terminal**

```sh
cd ~/Projects/GitHub/renoguard-prototype
node preview-server.cjs
```

Open [the mobile app](http://127.0.0.1:8765/) again. Installation and cloning are only needed once.

## Get updates

Stop the server, then check for local edits from the project folder:

```sh
git status
```

If the working tree is clean, download the latest published changes and restart:

```sh
git pull --ff-only
node preview-server.cjs
```

Refresh the browser. If Git reports local edits or diverging commits, review your changes before updating.

## Publish online with GitHub Pages

RenoGuard is a static HTML, CSS and JavaScript app. GitHub Pages can host it from this repository; your computer and local preview server can be off while people visit it.

1. Commit and push the latest project files to `main`, including the root `index.html` and `.nojekyll` file.
2. Open the [GitHub repository](https://github.com/jxnyong/renoguard-prototype).
3. Choose **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose **main** and **/(root)**, then **Save**.
6. Wait for publishing to finish. The **Actions** tab shows deployment progress; **Pages → Visit site** opens the result.

These steps follow [GitHub's publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). The `.nojekyll` file disables the default Jekyll processing for this static site; see [GitHub's entry-file and static-site guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

Once enabled, the expected public address is:

```text
https://jxnyong.github.io/renoguard-prototype/
```

Future pushes to `main` update the published site automatically. Cloning the repository and running Node.js are only needed for local development.

### A/B links

Use the saved full-app previews for development, reviewing the scenario or recording a walkthrough:

```text
https://jxnyong.github.io/renoguard-prototype/?variant=a
https://jxnyong.github.io/renoguard-prototype/?variant=b
```

Both support the complete easy scenario: report the defect, review the proposal, preview tiles, check the quotation and budget, approve, then view the updated budget and payment timeline. **Walkthrough steps** and **Reset demo** remain available from Project tools, Profile and the approval receipt even when hints are off.

For a fresh participant session covering the **complete easy scenario**, use:

```text
https://jxnyong.github.io/renoguard-prototype/?variant=a&study=scenario
https://jxnyong.github.io/renoguard-prototype/?variant=b&study=scenario
```

These start at Home before the first defect report, with hints off. Progress is kept in memory; **Reset demo** and page reload both start the scenario again, including the report. Saved full-app progress is unaffected.

For the **focused approval review experiment**, use:

```text
https://jxnyong.github.io/renoguard-prototype/?variant=a&study=quotation
https://jxnyong.github.io/renoguard-prototype/?variant=b&study=quotation
```

These start after the defect has been reported, with the same pending quotation, hints off and fresh progress. Progress is kept in memory, resets on reload and does not change the full app's saved demos.

In this focused mode, **Reset approval demo** resets the quotation task. **Start full walkthrough** leaves focused mode and opens a **Restart scenario** confirmation before restarting the reporting-to-approval scenario. Restarting affects only the walkthrough; Explore progress, the current A/B version and your guidance preference are kept.

Choose the full-scenario links when participants should report the defect and complete the entire easy journey. Choose the quotation links when testing the tile comparison layout in isolation with the task and measures below. Use the same scope for both versions.

**Profile → Prototype setup** provides **Full scenario experiment** and **Focused approval experiment** links for both versions. Walkthrough guidance and mode controls lead to the saved full app, where those settings apply.

Both versions are served by the same static site. The query parameters select the version and experiment scope; in-app screens use URL fragments. GitHub Pages needs no build command or separate deployment for A and B. Publishing remains a manual repository setup step.

The independent variable is the **tile comparison layout**:

| Version | Comparison layout |
| --- | --- |
| A | Table: compare the original tile and both replacements side by side, then select a replacement in its column. |
| B | Cards: review the original tile and each replacement in a separate card, then select a replacement using the control outside the card on its right, beside the header. |

Both show the same tile specifications, original scope, quotation facts, source links and AR preview. They use the same selection labels, confirmation page, checkbox, approval action and receipt. Neither starts with a tile selected. Grigio Matte and Sabbia Matte each add **S$250**, leaving **S$29,750**, with proposed completion on **14 Jul 2026**. Only the comparison presentation changes; cost and timing details and the approval steps stay the same.

Corresponding text uses shared typography in both layouts: tile names **14 px**, specifications **13 px**, and option labels, notes and selection labels **12 px**, with matching font weights and line heights. Tile samples are **48 × 48 px** in both. Selection placement is part of the layout comparison: a column selector in A and an external selector beside each replacement card in B.

In every mode, tapping a tile in the AR preview saves it as the pending choice. **Back** or **Review selected tile** returns with that choice retained. It remains unapproved: the budget and payments change only after final confirmation.

The table supports comparing a specification across options at a glance, with compact columns on mobile. Cards keep each option’s details together, with more vertical scrolling. Neither design is assumed to perform better.

In both versions, **Review approval** opens the same confirmation page. The same checkbox must be selected before **Approve · S$250** becomes available. Full specifications are visible in both layouts; no replacement is preselected.

## Use the hosted app with Loop11

Loop11 supports live websites as well as design prototypes. Start from the [course UX tools page](https://sites.google.com/view/is211smu/resources/ux-tools), which provides the academic signup link using an SMU email address. Check that your account covers the required participants and result exports before recruitment.

1. Publish the app and check that both A/B starting URLs for your chosen scope open from another browser or device. Test reset and reload so each participant gets the same initial state.
2. Create the study's tasks and questions in Loop11. Set the task's starting URL to the appropriate A or B address above, using `study=scenario` for the whole journey or `study=quotation` for approval review only. See [Loop11's task setup](https://www.loop11.com/setting-up-tasks/).
3. Keep the task, target tile, post-task questions and source access the same for both conditions. Use the two primary measures below. Agree on one task time limit after piloting and apply it to everyone.
4. Assign participants one condition using your agreed experiment procedure. Keep the profile's version selector as a team preview tool rather than asking participants to choose their condition. If using two separate Loop11 projects, keep their settings identical except for the starting URL.
5. Choose an integration method. With **JavaScript**, add the exact snippet supplied by your Loop11 project to the root `index.html`, then commit and push. With **No-Code**, participants use Loop11's desktop extension or mobile app. The current Loop11 recruiting guide specifies No-Code for video/audio recording. See [integration and recruitment](https://www.loop11.com/recruiting-participants/) and [supported devices](https://www.loop11.com/devices/).
6. Run pilot sessions through the generated **Loop11 study links**. Check the recorded tile, approval outcome, detail-question answers, satisfaction answers and exports before recruiting real participants. The app changes screens using URL fragments, including the shared approval confirmation. Verify that navigation and success matching work in the actual study rather than assuming every screen is counted as a separate page. Reaching a generic receipt URL alone does not prove that the correct tile was approved.
7. Distribute the Loop11 participant links. Loop11 collects the study results; the app's local demo storage does not collect participants' survey answers.

The team's narrated walkthrough video can be recorded separately from the quantitative A/B sessions.

For the full scenario, run the report-to-payment journey as one continuous task. Opening its starting URL again or refreshing creates a fresh session. If you split the journey into several Loop11 tasks, pilot whether navigation preserves the same app session before recruiting participants.

### Task and measures

The task below is for the focused quotation study. For a full-scenario study, also ask participants to report the cracked bathroom tiles with photos before reviewing the proposal, then check the updated budget and payment timeline after approval. Keep those additions identical in A and B.

Use this focused task in both versions:

> Your designer has proposed two replacement bathroom tiles. Review how the change affects your costs and completion date, choose Sabbia Matte, and approve the change. Finish when you see confirmation that the change has been approved.

Keep **Sabbia Matte** as the target for every participant. Do not give instructions about which control to use.

Use these two primary dependent variables:

1. **Critical-detail accuracy (0–3):** after the attempt, ask the three questions below. Award one point per correct answer. Allow the same access to the app and its source documents in both conditions, and do not reveal the answers before recording responses.

   | Question | Correct answer |
   | --- | --- |
   | How much additional cost does the proposed change add? | S$250 |
   | How much budget would remain after approval? | S$29,750 |
   | What revised completion date is proposed? | 14 Jul 2026 |

   Accept equivalent number and date formats. Ask after unsuccessful attempts as well as successful ones. This measures the ability to find and report critical details; it does not establish overall understanding of the quotation.

2. **Post-task satisfaction:** ask, “Overall, how satisfied are you with the process of reviewing and approving the change?” Use a 1–7 scale, anchored **1 — Very dissatisfied** and **7 — Very satisfied**. Ask after unsuccessful and timed-out attempts as well as successful ones.

Also record task completion as context: a correct completion reaches an approved receipt showing Sabbia Matte, without additional help and within the common pilot-established time limit. Record a wrong tile, unapproved selection, abandoned attempt or exceeded limit separately. Do not score a completed approval as proof that the participant understood its consequences.

If Loop11 uses a success URL, pilot whether it distinguishes the approved target tile as well as the receipt screen. Check the actual approved tile before scoring success; do not infer it from a generic confirmation page. Loop11 or the selected research tool must collect these measures; the app does not collect study responses itself.

## Optional: Visual Studio Code

1. Install [Visual Studio Code](https://code.visualstudio.com/Download).
2. Choose **File → Open Folder** and select `renoguard-prototype`.
3. Choose **Terminal → New Terminal**. On Windows, select **PowerShell** for the commands in this guide.
4. Run `node preview-server.cjs`.

No extensions are required. Restart VS Code if it was open while you installed Git or Node.js.

## Troubleshooting

<details>
<summary>Show common setup issues</summary>

### `node` or `git` is not recognised

Restart the terminal, or VS Code if using its terminal. If the command still fails, check that installation completed and command-line/PATH integration is enabled.

### `Cannot find module … preview-server.cjs`

Make sure you are inside the project folder containing `preview-server.cjs`.

Check your location and files:

**Windows — PowerShell**

```powershell
Get-Location
Get-ChildItem
```

**macOS — Terminal**

```sh
pwd
ls
```

### Port 8765 is already in use

The server may already be running. Try the app address first. To restart it, stop the existing server in its terminal with <kbd>Ctrl</kbd> + <kbd>C</kbd>.

### The browser cannot open the page

Check that the server is still running and open **http://127.0.0.1:8765/** on the same computer. Use `http://`, not `https://`.

### The destination folder already exists

If it is your existing RenoGuard clone, enter that folder and follow **Get updates** instead of cloning again.

</details>

[Back to the project README](../README.md)
