import { OutputChannel } from 'vscode';
import { ExtUri, FileUri } from '../utils/exturi';
import { LeanInstaller } from '../utils/leanInstaller';
import { PreconditionCheckResult } from './setupNotifs';
export declare function checkAll(...checks: (() => Promise<PreconditionCheckResult>)[]): Promise<PreconditionCheckResult>;
export declare function checkAreDependenciesInstalled(channel: OutputChannel, cwdUri: FileUri | undefined): Promise<PreconditionCheckResult>;
export declare function checkIsLean4Installed(installer: LeanInstaller, cwdUri: FileUri | undefined): Promise<PreconditionCheckResult>;
export declare function checkIsElanUpToDate(installer: LeanInstaller, cwdUri: FileUri | undefined, options: {
    elanMustBeInstalled: boolean;
    modal: boolean;
}): Promise<PreconditionCheckResult>;
export declare function checkIsValidProjectFolder(channel: OutputChannel, folderUri: ExtUri): Promise<PreconditionCheckResult>;
export declare function checkIsLeanVersionUpToDate(channel: OutputChannel, folderUri: ExtUri, options: {
    toolchainOverride?: string | undefined;
    modal: boolean;
}): Promise<PreconditionCheckResult>;
export declare function checkIsLakeInstalledCorrectly(channel: OutputChannel, folderUri: ExtUri, options: {
    toolchainOverride?: string | undefined;
}): Promise<PreconditionCheckResult>;
export declare function checkIsVSCodeUpToDate(): Promise<PreconditionCheckResult>;
export declare function checkLean4ProjectPreconditions(channel: OutputChannel, folderUri: ExtUri): Promise<PreconditionCheckResult>;
