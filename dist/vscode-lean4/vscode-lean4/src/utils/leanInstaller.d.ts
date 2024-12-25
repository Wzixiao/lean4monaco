import { SemVer } from 'semver';
import { OutputChannel } from 'vscode';
import { ExtUri, FileUri } from './exturi';
import { NotificationSeverity } from './notifs';
export declare class LeanVersion {
    version: string;
    error: string | undefined;
}
export declare class LeanInstaller {
    private leanInstallerLinux;
    private leanInstallerWindows;
    private outputChannel;
    private prompting;
    private installing;
    private freshInstallDefaultToolchain;
    private elanDefaultToolchain;
    private workspaceSuffix;
    private defaultSuffix;
    private promptUser;
    private installChangedEmitter;
    installChanged: import("vscode").Event<FileUri>;
    constructor(outputChannel: OutputChannel, freshInstallDefaultToolchain: string);
    getPromptUser(): boolean;
    getOutputChannel(): OutputChannel;
    handleVersionChanged(packageUri: FileUri): void;
    isPromptVisible(): boolean;
    private showRestartPromptAndRestart;
    handleLakeFileChanged(packageUri: FileUri): void;
    private removeSuffix;
    getElanDefaultToolchain(packageUri: ExtUri): Promise<string>;
    elanListToolChains(packageUri: ExtUri): Promise<string[]>;
    hasElan(): Promise<boolean>;
    displayInstallElanPrompt(severity: NotificationSeverity, reason: string | undefined): Promise<boolean>;
    displayUpdateElanPrompt(severity: NotificationSeverity, currentVersion: SemVer, recommendedVersion: SemVer): Promise<boolean>;
    private autoInstall;
    private installElan;
}
