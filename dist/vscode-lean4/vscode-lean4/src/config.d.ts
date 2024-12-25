import { PATH } from './utils/envPath';
export declare function getPowerShellPath(): string;
export declare function automaticallyBuildDependencies(): boolean;
export declare function envPathExtensions(): PATH;
export declare function serverArgs(): string[];
export declare function serverLoggingEnabled(): boolean;
export declare function serverLoggingPath(): string;
export declare function shouldAutofocusOutput(): boolean;
export declare function getInfoViewStyle(): string;
export declare function getInfoViewAutoOpen(): boolean;
export declare function getInfoViewAutoOpenShowsGoal(): boolean;
export declare function getInfoViewAllErrorsOnLine(): boolean;
export declare function getInfoViewDebounceTime(): number;
export declare function getInfoViewShowExpectedType(): boolean;
export declare function getInfoViewShowGoalNames(): boolean;
export declare function getInfoViewEmphasizeFirstGoal(): boolean;
export declare function getInfoViewReverseTacticState(): boolean;
export declare function getInfoViewShowTooltipOnHover(): boolean;
export declare function getElaborationDelay(): number;
export declare function shouldShowSetupWarnings(): boolean;
export declare function getFallBackToStringOccurrenceHighlighting(): boolean;
export declare function isRunningTest(): boolean;
export declare function getTestFolder(): string;
export declare function getDefaultLeanVersion(): string;
/** The editor line height, in pixels. */
export declare function getEditorLineHeight(): number;
/**
 * The literal 'production' or 'development', depending on the build.
 * Should be turned into a string literal by build tools.
 */
export declare const prodOrDev: string;
/** The literal '.min' or empty, depending on the build. See {@link prodOrDev}. */
export declare const minIfProd: string;
