# RenoGuard setup guide — Windows and macOS

This walkthrough takes you from a fresh computer to running RenoGuard locally. Follow the installation section for your operating system, then continue to **Run the app**.

- [Windows setup](#windows-setup)
- [macOS setup](#macos-setup)
- [Run the app](#run-the-app)
- [Preview the mobile layout](#preview-the-mobile-layout)
- [Stop and reopen the app](#stop-and-reopen-the-app)
- [Download future updates](#download-future-updates)
- [Optional: Visual Studio Code](#optional-visual-studio-code)
- [Troubleshooting](#troubleshooting)

You need **Git**, **Node.js LTS**, and a browser. VS Code and GitHub Desktop are optional. There are no npm packages to install, no build step, and no backend or database to configure.

Cloning downloads only changes already pushed to GitHub. The project owner must publish the latest changes before another computer can download them.

## Windows setup

### 1. Open PowerShell

Open the Start menu, search for **PowerShell**, and open it. If Windows Terminal opens instead, select its **PowerShell** profile.

The Windows examples below use PowerShell. WSL is not required for this project; Git Bash also works, but its folder commands differ from these examples.

Type or paste each command, then press **Enter**. Do not copy the terminal prompt, such as `PS C:\Users\YourName>`.

### 2. Install Git

1. Visit the [official Git for Windows download page](https://git-scm.com/install/windows).
2. Download the installer for your computer: usually **x64** for Intel or AMD computers, or **ARM64** for Windows on ARM.
3. Run the installer and follow its prompts. Keep command-line/PATH integration enabled so PowerShell can find Git.
4. Close PowerShell and open it again. If you use VS Code, restart it too.

Check the installation:

```powershell
git --version
```

A Git version number confirms that the command is available.

If Git already works on this computer, skip reinstalling it.

### 3. Install Node.js

1. Visit the [official Node.js download page](https://nodejs.org/en/download).
2. Choose the latest **LTS** release for **Windows**.
3. Download the **Windows Installer (`.msi`)** for your computer's architecture.
4. Run it and follow the installation steps, keeping Node.js on PATH.
5. Close and reopen PowerShell, or restart VS Code if using its terminal.

Check the installation:

```powershell
node --version
npm.cmd --version
```

Both commands should print version numbers. npm comes with Node.js, but RenoGuard does not need npm packages. Using `npm.cmd` avoids PowerShell's script-policy issue with `npm.ps1`.

### 4. Download the project

Create a folder for your GitHub projects and enter it:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Projects\GitHub"
Set-Location "$env:USERPROFILE\Projects\GitHub"
```

Clone the repository and enter the downloaded folder:

```powershell
git clone https://github.com/jxnyong/renoguard-prototype.git
Set-Location renoguard-prototype
```

Check the files:

```powershell
Get-ChildItem
```

You should see `preview-server.cjs`, `README.md`, and folders including `mobile`, `web`, `shared`, `assets`, and `docs`.

Continue to [Run the app](#run-the-app).

## macOS setup

### 1. Open Terminal

Press **Command + Space**, type **Terminal**, and press **Return**.

Type or paste each command, then press **Return**. Do not copy the terminal prompt, such as a trailing `%` or `$`.

### 2. Install Git

Run:

```sh
xcode-select --install
```

Follow Apple's installation window and wait for the Command Line Tools installation to finish. You only need the Command Line Tools, not the full Xcode application. This is one of the methods listed in the [official Git macOS installation guide](https://git-scm.com/install/mac).

Check Git:

```sh
git --version
```

You should see a Git version number. If macOS says the tools are already installed, proceed with this version check.

### 3. Install Node.js

1. Visit the [official Node.js download page](https://nodejs.org/en/download).
2. Choose the latest **LTS** release for **macOS**.
3. Download the **macOS Installer (`.pkg`)**.
4. Open the package and follow its installation steps.
5. Close Terminal and open it again.

Check the installation:

```sh
node --version
npm --version
```

Both commands should print version numbers. npm comes with Node.js, although RenoGuard does not currently need npm packages.

### 4. Download the project

Create a folder for your GitHub projects and enter it:

```sh
mkdir -p ~/Projects/GitHub
cd ~/Projects/GitHub
```

Clone the repository and enter the downloaded folder:

```sh
git clone https://github.com/jxnyong/renoguard-prototype.git
cd renoguard-prototype
```

Check the files:

```sh
ls
```

You should see `preview-server.cjs`, `README.md`, and folders including `mobile`, `web`, `shared`, `assets`, and `docs`.

Continue to [Run the app](#run-the-app).

## Run the app

These steps are the same on Windows and macOS.

From inside the `renoguard-prototype` folder, run:

```sh
node preview-server.cjs
```

You should see:

```text
RenoGuard preview: http://127.0.0.1:8765
```

Keep this terminal open while using the app. The server continues running until you stop it. Open the address in your browser, not as a terminal command.

| Interface | Address |
| --- | --- |
| Mobile app — main entry point | [http://127.0.0.1:8765/](http://127.0.0.1:8765/) |
| Earlier desktop interface | [http://127.0.0.1:8765/web/](http://127.0.0.1:8765/web/) |
| Earlier HTML screen drafts | [http://127.0.0.1:8765/drafts/](http://127.0.0.1:8765/drafts/) |

The mobile app is a browser-based frontend; no App Store or Microsoft Store installation is needed. Use the preview server instead of double-clicking HTML files, because asset paths start at the server root.

Do **not** run `npm install` or `npm run dev` for the current project. It has no `package.json`; the preview server uses modules included with Node.js.

### GitHub accounts and demo data

While the repository is public, downloading it over HTTPS and viewing the app do not require a GitHub account or a personal access token. Committing and pushing changes are separate from running the frontend. See [GitHub's cloning guide](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) for other download methods.

Open mobile and desktop in the **same browser profile**, using the exact addresses above, to share demo records. Different browsers, profiles, and devices have separate storage. GitHub transfers project files, not your saved demo decisions or reports.

Photo previews last for the current page session. No real messages, signatures, payments, camera scanning, or backend services are connected. Restore the sample data through **Project settings → Reset demo** in the app.

## Preview the mobile layout

The design reference is **390 × 844 CSS pixels**. On laptops and desktops, the app automatically appears in a centred phone frame with scrolling inside it. The entire frame scales down to fit shorter windows. On actual phones, the interface adapts to the device screen.

For an additional responsive device preview in **Chrome or Edge**:

1. Open the mobile app address.
2. Open Developer Tools: **Ctrl + Shift + I** on Windows or **Command + Option + I** on macOS.
3. Turn on the device toolbar using its phone/tablet icon, or press **Ctrl + Shift + M** on Windows or **Command + Shift + M** on macOS.
4. Choose **Responsive** and set width to **390** and height to **844**.
5. Refresh the page if necessary.

For more on these controls, see [Chrome's device mode walkthrough](https://developer.chrome.com/docs/devtools/device-mode).

This previews the mobile layout on your computer. The server currently listens on `127.0.0.1`, so it accepts connections only from that computer. Opening the same address on a physical phone will not connect to your computer's server.

## Stop and reopen the app

To stop the server, return to its terminal and press **Ctrl + C**. On a Mac, use **Control + C**, not Command + C.

To reopen it another day, enter the project folder and start the server again.

**Windows — PowerShell:**

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\renoguard-prototype"
node preview-server.cjs
```

**macOS — Terminal:**

```sh
cd ~/Projects/GitHub/renoguard-prototype
node preview-server.cjs
```

Then open [the mobile app](http://127.0.0.1:8765/) in your browser. Installation and cloning are only needed once.

## Download future updates

Stop the preview server with **Ctrl + C** first. From the project folder, check your local changes:

```sh
git status
```

If you have only viewed the app, the working tree should be clean. Download the latest published changes:

```sh
git pull --ff-only
```

Restart the server and refresh the browser:

```sh
node preview-server.cjs
```

If Git reports local edits or diverging commits, review your work before updating. Do not discard your files just to make the update succeed. You do not need to clone the repository again.

## Optional: Visual Studio Code

VS Code is useful for reading and editing the app, but is not required to view it.

1. Download and install [Visual Studio Code](https://code.visualstudio.com/Download) for your operating system.
2. Open VS Code and choose **File → Open Folder**.
3. Select the `renoguard-prototype` folder you cloned.
4. Choose **Terminal → New Terminal**.
5. On Windows, use a **PowerShell** terminal for the commands in this guide. On macOS, use the normal macOS terminal profile.
6. Run `node preview-server.cjs` from the project folder.

If Windows opens WSL by default, run **Terminal: Select Default Profile** from the Command Palette, choose **PowerShell**, then create a new terminal. This changes the default terminal without uninstalling WSL. See [VS Code terminal profiles](https://code.visualstudio.com/docs/terminal/profiles).

No VS Code extensions are required for this project. If you installed Git or Node.js while VS Code was open, restart VS Code so its terminal picks up the new PATH.

## Troubleshooting

### `node` or `git` is not recognised / `command not found`

Close and reopen your terminal. If using VS Code, restart the application too.

Check `node --version` and `git --version`. If either still fails, check that the corresponding installation finished and that its command-line/PATH option is enabled. On Windows, make sure you are using the PowerShell environment where you installed the tools, rather than a WSL terminal with separate Linux installations.

### PowerShell says `npm.ps1` cannot be loaded

Use `npm.cmd --version` instead of `npm --version`. RenoGuard runs with `node preview-server.cjs`, so changing PowerShell's execution policy is unnecessary for this project.

### `Cannot find module … preview-server.cjs`

You may be in the wrong folder. Check your location and files:

**Windows — PowerShell:**

```powershell
Get-Location
Get-ChildItem
```

**macOS — Terminal:**

```sh
pwd
ls
```

Enter the `renoguard-prototype` folder containing `preview-server.cjs`, then start the server again. If the file is missing from your clone, make sure the latest code was pushed to GitHub, then update your clone.

### `Port 8765 is already in use`

Another server may already be running. Try the app address first. If you need to restart that server, stop it in its original terminal with **Ctrl + C**, then run the command again.

### The browser cannot open the page

Check that the terminal still shows a running server without an error. Use the exact address **http://127.0.0.1:8765/**, including `http://` rather than `https://`. Open it on the same computer running the server.

### `Destination path … already exists`

The folder already exists. If it is your RenoGuard clone, enter it, check `git status`, and update with `git pull --ff-only` when your local work is ready. Do not delete the folder or clone over it.

### GitHub asks for credentials when cloning

Check that you used the exact HTTPS URL shown above and that the repository is still public. A private repository requires access and authentication. Viewing this public frontend does not require setting a Git author name or email.

If you later contribute changes, authenticate with your own GitHub account. GitHub does not accept an account password for HTTPS Git operations; use a supported sign-in method such as Git Credential Manager's browser login. See [GitHub authentication guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github) and [credential caching](https://docs.github.com/en/get-started/git-basics/caching-your-github-credentials-in-git).

[Back to the project README](../README.md)
