import { spawn } from 'child_process';
import { ProgressLocation, window } from 'vscode';
import { logger } from './logger';
import { displayErrorWithOutput } from './notifs';
export var ExecutionExitCode;
(function (ExecutionExitCode) {
    ExecutionExitCode[ExecutionExitCode["Success"] = 0] = "Success";
    ExecutionExitCode[ExecutionExitCode["CannotLaunch"] = 1] = "CannotLaunch";
    ExecutionExitCode[ExecutionExitCode["ExecutionError"] = 2] = "ExecutionError";
    ExecutionExitCode[ExecutionExitCode["Cancelled"] = 3] = "Cancelled";
})(ExecutionExitCode || (ExecutionExitCode = {}));
function createCannotLaunchExecutionResult(message) {
    return {
        exitCode: ExecutionExitCode.CannotLaunch,
        stdout: message,
        stderr: '',
        combined: message,
    };
}
export function batchExecuteWithProc(executablePath, args, workingDirectory, channel) {
    let stdout = '';
    let stderr = '';
    let combined = '';
    let options = {};
    if (workingDirectory !== undefined) {
        options = { cwd: workingDirectory };
    }
    if (channel?.combined) {
        const formattedCwd = workingDirectory ? `${workingDirectory}` : '';
        const formattedArgs = args.map(arg => (arg.includes(' ') ? `"${arg}"` : arg)).join(' ');
        channel.combined.appendLine(`${formattedCwd}> ${executablePath} ${formattedArgs}`);
    }
    let proc;
    try {
        proc = spawn(executablePath, args, options);
    }
    catch (e) {
        return ['CannotLaunch', new Promise(resolve => resolve(createCannotLaunchExecutionResult('')))];
    }
    const execPromise = new Promise(resolve => {
        const conclude = (r) => resolve({
            exitCode: r.exitCode,
            stdout: r.stdout.trim(),
            stderr: r.stderr.trim(),
            combined: r.combined.trim(),
        });
        proc.on('error', err => {
            conclude(createCannotLaunchExecutionResult(err.message));
        });
        proc.stdout.on('data', line => {
            const s = line.toString();
            if (channel?.combined)
                channel.combined.appendLine(s);
            if (channel?.stdout)
                channel.stdout.appendLine(s);
            stdout += s + '\n';
            combined += s + '\n';
        });
        proc.stderr.on('data', line => {
            const s = line.toString();
            if (channel?.combined)
                channel.combined.appendLine(s);
            if (channel?.stderr)
                channel.stderr.appendLine(s);
            stderr += s + '\n';
            combined += s + '\n';
        });
        proc.on('close', (code, signal) => {
            logger.log(`child process exited with code ${code}`);
            if (signal === 'SIGTERM') {
                if (channel?.combined) {
                    channel.combined.appendLine('=> Operation cancelled by user.');
                }
                conclude({
                    exitCode: ExecutionExitCode.Cancelled,
                    stdout,
                    stderr,
                    combined,
                });
                return;
            }
            if (code !== 0) {
                if (channel?.combined) {
                    const formattedCode = code ? `Exit code: ${code}.` : '';
                    const formattedSignal = signal ? `Signal: ${signal}.` : '';
                    channel.combined.appendLine(`=> Operation failed. ${formattedCode} ${formattedSignal}`.trim());
                }
                conclude({
                    exitCode: ExecutionExitCode.ExecutionError,
                    stdout,
                    stderr,
                    combined,
                });
                return;
            }
            conclude({
                exitCode: ExecutionExitCode.Success,
                stdout,
                stderr,
                combined,
            });
        });
    });
    return [proc, execPromise];
}
export async function batchExecute(executablePath, args, workingDirectory, channel) {
    const [_, execPromise] = batchExecuteWithProc(executablePath, args, workingDirectory, channel);
    return execPromise;
}
export async function batchExecuteWithProgress(executablePath, args, title, options = {}) {
    const titleSuffix = options.channel ? ' [(Details)](command:lean4.troubleshooting.showOutput)' : '';
    const progressOptions = {
        location: ProgressLocation.Notification,
        title: title + titleSuffix,
        cancellable: options.allowCancellation === true,
    };
    let inc = 0;
    let lastReportedMessage;
    let progress;
    const progressChannel = {
        name: 'ProgressChannel',
        append(value) {
            if (options.translator) {
                const translatedValue = options.translator(value);
                if (translatedValue === undefined) {
                    return;
                }
                value = translatedValue;
            }
            if (options.channel) {
                options.channel.appendLine(value.trimEnd());
            }
            if (inc < 90) {
                inc += 2;
            }
            if (progress !== undefined) {
                progress.report({ increment: inc, message: value });
            }
            lastReportedMessage = value;
        },
        appendLine(value) {
            this.append(value + '\n');
        },
        replace(_) {
            /* empty */
        },
        clear() {
            /* empty */
        },
        show() {
            /* empty */
        },
        hide() {
            /* empty */
        },
        dispose() {
            /* empty */
        },
    };
    const expensiveExecutionTimeoutPromise = new Promise((resolve, _) => setTimeout(() => resolve(undefined), 250));
    const [proc, executionPromise] = batchExecuteWithProc(executablePath, args, options.cwd, {
        combined: progressChannel,
    });
    if (proc === 'CannotLaunch') {
        return executionPromise; // resolves to a 'CannotLaunch' ExecutionResult
    }
    const preliminaryResult = await Promise.race([expensiveExecutionTimeoutPromise, executionPromise]);
    if (preliminaryResult !== undefined) {
        return preliminaryResult;
    }
    // Execution already took longer than 250ms, let's start displaying a progress bar now
    const result = await window.withProgress(progressOptions, (p, token) => {
        progress = p;
        token.onCancellationRequested(() => proc.kill());
        progress.report({ message: lastReportedMessage, increment: inc });
        return executionPromise;
    });
    return result;
}
export async function executeAll(executions) {
    const results = [];
    for (const execution of executions) {
        const result = await execution.execute();
        results.push(result);
        if (execution.optional !== true && result.exitCode !== ExecutionExitCode.Success) {
            break;
        }
    }
    return results;
}
export function displayResultError(result, message) {
    if (result.exitCode === ExecutionExitCode.Success) {
        throw Error();
    }
    const errorMessage = formatErrorMessage(result, message);
    displayErrorWithOutput(errorMessage);
}
function formatErrorMessage(error, message) {
    if (error.combined === '') {
        return `${message}`;
    }
    return `${message} Command output: ${error.combined}`;
}
