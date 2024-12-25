import { SemVer } from 'semver';
import { OutputChannel } from 'vscode';
import { ExecutionResult } from '../utils/batch';
import { FileUri } from '../utils/exturi';
export type SystemQueryResult = {
    operatingSystem: string;
    cpuArchitecture: string;
    cpuModels: string;
    totalMemory: string;
};
export type VersionQueryResult = {
    kind: 'Success';
    version: SemVer;
} | {
    kind: 'CommandNotFound';
} | {
    kind: 'CommandError';
    message: string;
} | {
    kind: 'InvalidVersion';
    versionResult: string;
};
export type ElanVersionDiagnosis = {
    kind: 'UpToDate';
    version: SemVer;
} | {
    kind: 'Outdated';
    currentVersion: SemVer;
    recommendedVersion: SemVer;
} | {
    kind: 'NotInstalled';
} | {
    kind: 'ExecutionError';
    message: string;
};
export type ProjectSetupDiagnosis = {
    kind: 'SingleFile';
} | {
    kind: 'MissingLeanToolchain';
    folder: FileUri;
    parentProjectFolder: FileUri | undefined;
} | {
    kind: 'ValidProjectSetup';
    projectFolder: FileUri;
};
export type LeanVersionDiagnosis = {
    kind: 'UpToDate';
    version: SemVer;
} | {
    kind: 'IsLean3Version';
    version: SemVer;
} | {
    kind: 'IsAncientLean4Version';
    version: SemVer;
} | {
    kind: 'NotInstalled';
} | {
    kind: 'ExecutionError';
    message: string;
};
export type VSCodeVersionDiagnosis = {
    kind: 'UpToDate';
    version: SemVer;
} | {
    kind: 'Outdated';
    currentVersion: SemVer;
    recommendedVersion: SemVer;
};
export declare function versionQueryResult(executionResult: ExecutionResult, versionRegex: RegExp): VersionQueryResult;
export declare function checkElanVersion(elanVersionResult: VersionQueryResult): ElanVersionDiagnosis;
export declare function checkLeanVersion(leanVersionResult: VersionQueryResult): LeanVersionDiagnosis;
export declare class SetupDiagnoser {
    readonly channel: OutputChannel | undefined;
    readonly cwdUri: FileUri | undefined;
    readonly toolchain: string | undefined;
    constructor(channel: OutputChannel | undefined, cwdUri: FileUri | undefined, toolchain?: string | undefined);
    checkCurlAvailable(): Promise<boolean>;
    checkGitAvailable(): Promise<boolean>;
    queryLakeVersion(): Promise<VersionQueryResult>;
    checkLakeAvailable(): Promise<boolean>;
    querySystemInformation(): SystemQueryResult;
    queryExtensionVersion(): SemVer;
    queryVSCodeVersion(): VSCodeVersionDiagnosis;
    queryLeanVersion(): Promise<VersionQueryResult>;
    queryElanVersion(): Promise<VersionQueryResult>;
    queryElanShow(): Promise<ExecutionResult>;
    elanVersion(): Promise<ElanVersionDiagnosis>;
    projectSetup(): Promise<ProjectSetupDiagnosis>;
    leanVersion(): Promise<LeanVersionDiagnosis>;
    private runSilently;
    private runWithProgress;
    private runLeanCommand;
}
export declare function diagnose(channel: OutputChannel | undefined, cwdUri: FileUri | undefined, toolchain?: string | undefined): SetupDiagnoser;
