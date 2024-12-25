import { SemVer } from 'semver';
import { LeanInstaller } from '../utils/leanInstaller';
export type PreconditionCheckResult = 'Fulfilled' | 'Warning' | 'Fatal';
export declare function preconditionCheckResultToSeverity(result: PreconditionCheckResult): 0 | 1 | 2;
export declare function severityToPreconditionCheckResult(severity: 0 | 1 | 2): PreconditionCheckResult;
export declare function worstPreconditionViolation(...results: PreconditionCheckResult[]): PreconditionCheckResult;
export type SetupWarningOptions = {
    modal: true;
} | {
    modal: false;
    finalizer?: (() => void) | undefined;
};
export declare function displaySetupError(message: string, finalizer?: (() => void) | undefined): PreconditionCheckResult;
export declare function displaySetupErrorWithInput<T extends string>(message: string, ...items: T[]): Promise<T | undefined>;
export declare function displaySetupErrorWithOptionalInput<T extends string>(message: string, input: T, action: () => void, finalizer?: (() => void) | undefined): PreconditionCheckResult;
export declare function displaySetupErrorWithOutput(message: string, finalizer?: (() => void) | undefined): PreconditionCheckResult;
export declare function displaySetupErrorWithSetupGuide(message: string, finalizer?: (() => void) | undefined): PreconditionCheckResult;
export declare function displayDependencySetupError(missingDeps: string[]): PreconditionCheckResult;
export declare function displayElanSetupError(installer: LeanInstaller, reason: string): Promise<PreconditionCheckResult>;
export declare function displayElanOutdatedSetupError(installer: LeanInstaller, currentVersion: SemVer, recommendedVersion: SemVer): Promise<PreconditionCheckResult>;
export declare function displaySetupWarning(message: string, options?: SetupWarningOptions): Promise<PreconditionCheckResult>;
export declare function displaySetupWarningWithInput<T extends string>(message: string, ...items: T[]): Promise<T | undefined>;
export declare function displaySetupWarningWithOptionalInput<T extends string>(message: string, input: T, action: () => void, finalizer?: (() => void) | undefined): PreconditionCheckResult;
export declare function displaySetupWarningWithOutput(message: string, options?: SetupWarningOptions): Promise<PreconditionCheckResult>;
export declare function displaySetupWarningWithSetupGuide(message: string, options?: SetupWarningOptions): Promise<PreconditionCheckResult>;
export declare function displayElanSetupWarning(installer: LeanInstaller, reason: string): Promise<PreconditionCheckResult>;
export declare function displayElanOutdatedSetupWarning(installer: LeanInstaller, currentVersion: SemVer, recommendedVersion: SemVer): Promise<PreconditionCheckResult>;
