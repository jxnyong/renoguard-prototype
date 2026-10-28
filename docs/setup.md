# Setup guide

To develop locally, install Git and Node.js, download RenoGuard, and start the preview. Choose [Windows](#windows) or [macOS](#macos), then continue to [Run the app](#run-the-app).

You need **Git**, **Node.js LTS**, and a browser. No additional packages or build steps are required.

<br>

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

<br>

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

<br>

## Run the app

From the `renoguard-prototype` folder, start the preview server:

```sh
node preview-server.cjs
```

The terminal should show:

```text
RenoGuard preview: http://127.0.0.1:8765
```

Keep the terminal open, then **[open RenoGuard at http://127.0.0.1:8765/](http://127.0.0.1:8765/)**.

The default page starts fresh at Home with no defect reports or hints. Open **Profile → Prototype controls** to choose A/B, launch the approval experiment, or start the full walkthrough. Refreshing clears session progress.

The mobile app automatically uses a phone-sized frame on computers. No browser device-mode configuration is needed.

**Stop the server**

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> in the terminal. On macOS, use **Control**, not Command.

*Use the preview address rather than opening HTML files directly. The server runs on this computer only.*

<br>

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

<br>

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

<br>

## Local A/B preview

The same app serves both conditions. Open [Version A](http://127.0.0.1:8765/?variant=a&study=quotation) or [Version B](http://127.0.0.1:8765/?variant=b&study=quotation). Both start at Home with the bathroom defect already reported and its proposal pending. Participants navigate to the approval themselves. Reloading returns to this starting state. The only intended difference is the comparison layout: a horizontally scrollable table in A and stacked full-width cards in B. Each includes the same three replacement tiles, typography, cost, dates and approval controls. A uses radio circles below its option columns; B centres the circle inside the right side of each card. Neither shows Select/Selected text. Use the same participant task in both conditions.

For the complete easy scenario, use `/?variant=a&walkthrough=1` or `/?variant=b&walkthrough=1`. These start at Home before the defect report. Public study links can use the same query strings when hosting is arranged later; no duplicate code folders are needed.

The focused task is: review the change, choose Sabbia Matte, confirm the S$250 additional cost and 14 Jul 2026 completion, and approve. The [experiment notes](iteration-2.md#focused-ab-experiment) propose two primary measures and describe the pilot checks. Keep the app session continuous: refreshing an experiment link starts it again.
<br>

## Design-system reference

With the preview server running, [open the visual component sheet](http://127.0.0.1:8765/docs/design-system.html). It shows the palette, typography, components and both comparison layouts using the app's actual styles. Read [the design-system guide](design-system.md) for usage rules.

<br>

## Optional: Visual Studio Code

1. Install [Visual Studio Code](https://code.visualstudio.com/Download).
2. Choose **File → Open Folder** and select `renoguard-prototype`.
3. Choose **Terminal → New Terminal**. On Windows, select **PowerShell** for the commands in this guide.
4. Run `node preview-server.cjs`.

No extensions are required. Restart VS Code if it was open while you installed Git or Node.js.

<br>

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
