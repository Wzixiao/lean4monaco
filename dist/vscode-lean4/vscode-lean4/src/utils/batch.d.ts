import { ChildProcessWithoutNullStreams } from 'child_process';
import { OutputChannel } from 'vscode';
export interface ExecutionChannel {
    combined?: OutputChannel | undefined;
    stdout?: OutputChannel | undefined;
    stderr?: OutputChannel | undefined;
}
export declare enum ExecutionExitCode {
    Success = 0,
    CannotLaunch = 1,
    ExecutionError = 2,
    Cancelled = 3
}
export interface ExecutionResult {
    exitCode: ExecutionExitCode;
    stdout: string;
    stderr: string;
    combined: string;
}
export declare function batchExecuteWithProc(executablePath: string, args: string[], workingDirectory?: string | undefined, channel?: ExecutionChannel | undefined): [ChildProcessWithoutNullStreams | 'CannotLaunch', Promise<ExecutionResult>];
export declare function batchExecute(executablePath: string, args: string[], workingDirectory?: string | undefined, channel?: ExecutionChannel | undefined): Promise<ExecutionResult>;
interface ProgressExecutionOptions {
    cwd?: string | undefined;
    channel?: OutputChannel | undefined;
    translator?: ((line: string) => string | undefined) | undefined;
    allowCancellation?: boolean;
}
export declare function batchExecuteWithProgress(executablePath: string, args: string[], title: string, options?: ProgressExecutionOptions): Promise<ExecutionResult>;
type ExecutionHandler = () => Promise<ExecutionResult>;
export interface BatchExecution {
    execute: ExecutionHandler;
    optional?: boolean | undefined;
}
export declare function executeAll(executions: BatchExecution[]): Promise<ExecutionResult[]>;
export declare function displayResultError(result: ExecutionResult, message: string): void;
export {};
