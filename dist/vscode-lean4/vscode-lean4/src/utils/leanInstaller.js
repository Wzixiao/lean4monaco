import { EventEmitter, window } from 'vscode';
import { getPowerShellPath, isRunningTest } from '../config';
import { ExecutionExitCode, batchExecute, displayResultError } from './batch';
import { elanSelfUpdate } from './elan';
import { logger } from './logger';
import { displayError, displayErrorWithOptionalInput, displayNotificationWithInput, } from './notifs';
export class LeanVersion {
    version;
    error;
}
export class LeanInstaller {
    leanInstallerLinux = 'https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh';
    leanInstallerWindows = 'https://raw.githubusercontent.com/leanprover/elan/master/elan-init.ps1';
    outputChannel;
    prompting = false;
    installing = false;
    freshInstallDefaultToolchain;
    elanDefaultToolchain = ''; // the default toolchain according to elan (toolchain marked with '(default)')
    workspaceSuffix = '(workspace override)';
    defaultSuffix = '(default)';
    promptUser = true;
    // This event is raised whenever a version change happens.
    // The event provides the workspace Uri where the change happened.
    installChangedEmitter = new EventEmitter();
    installChanged = this.installChangedEmitter.event;
    constructor(outputChannel, freshInstallDefaultToolchain) {
        this.outputChannel = outputChannel;
        this.freshInstallDefaultToolchain = freshInstallDefaultToolchain;
        if (isRunningTest()) {
            this.promptUser = false;
            if (process.env.LEAN4_PROMPT_USER === 'true') {
                this.promptUser = true;
            }
        }
    }
    getPromptUser() {
        return this.promptUser;
    }
    getOutputChannel() {
        return this.outputChannel;
    }
    handleVersionChanged(packageUri) {
        void this.showRestartPromptAndRestart('Lean version changed', packageUri);
    }
    isPromptVisible() {
        return this.prompting;
    }
    async showRestartPromptAndRestart(message, packageUri) {
        if (!this.promptUser) {
            this.installChangedEmitter.fire(packageUri);
            return;
        }
        if (this.prompting) {
            return;
        }
        this.prompting = true;
        const finalizer = () => {
            this.prompting = false;
        };
        displayErrorWithOptionalInput(message, 'Restart Lean', () => this.installChangedEmitter.fire(packageUri), finalizer);
    }
    handleLakeFileChanged(packageUri) {
        void this.showRestartPromptAndRestart('Lake file configuration changed', packageUri);
    }
    removeSuffix(version) {
        let s = version;
        const suffixes = [this.defaultSuffix, this.workspaceSuffix];
        suffixes.forEach(suffix => {
            if (s.endsWith(suffix)) {
                s = s.substr(0, s.length - suffix.length);
            }
        });
        return s.trim();
    }
    async getElanDefaultToolchain(packageUri) {
        if (this.elanDefaultToolchain) {
            return this.elanDefaultToolchain;
        }
        const toolChains = await this.elanListToolChains(packageUri);
        let result = '';
        toolChains.forEach(s => {
            if (s.endsWith(this.defaultSuffix)) {
                result = this.removeSuffix(s);
            }
        });
        this.elanDefaultToolchain = result;
        return result;
    }
    async elanListToolChains(packageUri) {
        try {
            const cmd = 'elan';
            const options = ['toolchain', 'list'];
            const cwd = packageUri.scheme === 'file' ? packageUri.fsPath : undefined;
            const stdout = (await batchExecute(cmd, options, cwd)).stdout;
            if (!stdout) {
                throw new Error('elan toolchain list returned no output.');
            }
            const result = [];
            stdout.split(/\r?\n/).forEach(s => {
                s = s.trim();
                if (s !== '') {
                    result.push(s);
                }
            });
            return result;
        }
        catch (err) {
            return [`${err}`];
        }
    }
    async hasElan() {
        try {
            const options = ['--version'];
            const result = await batchExecute('elan', options);
            const filterVersion = /elan (\d+)\.\d+\..+/;
            const match = filterVersion.exec(result.stdout);
            return match !== null;
        }
        catch (err) {
            return false;
        }
    }
    async displayInstallElanPrompt(severity, reason) {
        if (!this.getPromptUser()) {
            // Used in tests
            await this.autoInstall();
            return true;
        }
        const reasonPrefix = reason ? reason + ' ' : '';
        const installElanItem = 'Install Elan and Lean 4';
        const installElanChoice = await displayNotificationWithInput(severity, reasonPrefix + "Do you want to install Lean's version manager Elan and a recent stable version of Lean 4?", installElanItem);
        if (installElanChoice === undefined) {
            return false;
        }
        await this.installElan();
        return true;
    }
    async displayUpdateElanPrompt(severity, currentVersion, recommendedVersion) {
        const updateElanItem = 'Update Elan';
        const updateElanChoice = await displayNotificationWithInput(severity, `Lean's version manager Elan is outdated: the installed version is ${currentVersion.toString()}, but a version of ${recommendedVersion.toString()} is recommended. Do you want to update Elan?`, updateElanItem);
        if (updateElanChoice === undefined) {
            return false;
        }
        if (currentVersion.compare('3.1.0') === 0) {
            // `elan self update` was broken in elan 3.1.0, so we need to take a different approach to updating elan here.
            const installElanResult = await this.installElan();
            return installElanResult === 'Success';
        }
        const elanSelfUpdateResult = await elanSelfUpdate(this.outputChannel);
        if (elanSelfUpdateResult.exitCode !== ExecutionExitCode.Success) {
            displayResultError(elanSelfUpdateResult, "Cannot update Elan. If you suspect that this is due to the way that you have set up Elan (e.g. from a package repository that ships an outdated version of Elan), you can disable these warnings using the 'Lean4: Show Setup Warnings' setting under 'File' > 'Preferences' > 'Settings'.");
            return false;
        }
        return true;
    }
    async autoInstall() {
        logger.log('[LeanInstaller] Installing Elan ...');
        await this.installElan();
        logger.log('[LeanInstaller] Elan installed');
    }
    async installElan() {
        if (this.installing) {
            displayError('Elan is already being installed. Please wait until the installation has finished.');
            return 'PendingInstallation';
        }
        this.installing = true;
        const terminalName = 'Lean installation via elan';
        let terminalOptions = { name: terminalName };
        if (process.platform === 'win32') {
            terminalOptions = { name: terminalName, shellPath: getPowerShellPath() };
        }
        const terminal = window.createTerminal(terminalOptions);
        terminal.show();
        // We register a listener, to restart the Lean extension once elan has finished.
        const resultPromise = new Promise(function (resolve, reject) {
            window.onDidCloseTerminal(async (t) => {
                if (t === terminal) {
                    resolve(true);
                }
                else {
                    logger.log('[LeanInstaller] ignoring terminal closed: ' + t.name + ', waiting for: ' + terminalName);
                }
            });
        });
        if (process.platform === 'win32') {
            terminal.sendText(`Start-BitsTransfer -Source "${this.leanInstallerWindows}" -Destination "elan-init.ps1"\r\n` +
                'Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope Process\r\n' +
                `$rc = .\\elan-init.ps1 -NoPrompt 1 -DefaultToolchain ${this.freshInstallDefaultToolchain}\r\n` +
                'Write-Host "elan-init returned [$rc]"\r\n' +
                'del .\\elan-init.ps1\r\n' +
                'if ($rc -ne 0) {\r\n' +
                '    Read-Host -Prompt "Press ENTER to continue"\r\n' +
                '}\r\n' +
                'exit\r\n');
        }
        else {
            const elanArgs = `-y --default-toolchain ${this.freshInstallDefaultToolchain}`;
            const prompt = '(echo && read -n 1 -s -r -p "Install failed, press ENTER to continue...")';
            terminal.sendText(`bash -c 'curl ${this.leanInstallerLinux} -sSf | sh -s -- ${elanArgs} || ${prompt}' && exit `);
        }
        const result = await resultPromise;
        this.elanDefaultToolchain = this.freshInstallDefaultToolchain;
        this.installing = false;
        if (!result) {
            displayError('Elan installation failed. Check the terminal output for details.');
            return 'InstallationFailed';
        }
        return 'Success';
    }
}
