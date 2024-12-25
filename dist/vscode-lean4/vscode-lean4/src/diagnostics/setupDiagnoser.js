import * as os from 'os';
import { SemVer } from 'semver';
import { extensions, version } from 'vscode';
import { ExecutionExitCode, batchExecute, batchExecuteWithProgress } from '../utils/batch';
import { checkParentFoldersForLeanProject, isValidLeanProject } from '../utils/projectInfo';
const recommendedElanVersion = new SemVer('3.1.1');
// Should be bumped in a release *before* we bump the version requirement of the VS Code extension so that
// users know that they need to update and do not get stuck on an old VS Code version.
const recommendedVSCodeVersion = new SemVer('1.75.0');
export function versionQueryResult(executionResult, versionRegex) {
    if (executionResult.exitCode === ExecutionExitCode.CannotLaunch) {
        return { kind: 'CommandNotFound' };
    }
    if (executionResult.exitCode === ExecutionExitCode.ExecutionError) {
        return { kind: 'CommandError', message: executionResult.combined };
    }
    const match = versionRegex.exec(executionResult.stdout);
    if (!match) {
        return { kind: 'InvalidVersion', versionResult: executionResult.stdout };
    }
    return { kind: 'Success', version: new SemVer(match[1]) };
}
export function checkElanVersion(elanVersionResult) {
    switch (elanVersionResult.kind) {
        case 'CommandNotFound':
            return { kind: 'NotInstalled' };
        case 'CommandError':
            return { kind: 'ExecutionError', message: elanVersionResult.message };
        case 'InvalidVersion':
            return {
                kind: 'ExecutionError',
                message: `Invalid Elan version format: '${elanVersionResult.versionResult}'`,
            };
        case 'Success':
            if (elanVersionResult.version.compare(recommendedElanVersion) < 0) {
                return {
                    kind: 'Outdated',
                    currentVersion: elanVersionResult.version,
                    recommendedVersion: recommendedElanVersion,
                };
            }
            return { kind: 'UpToDate', version: elanVersionResult.version };
    }
}
export function checkLeanVersion(leanVersionResult) {
    if (leanVersionResult.kind === 'CommandNotFound') {
        return { kind: 'NotInstalled' };
    }
    if (leanVersionResult.kind === 'CommandError') {
        return {
            kind: 'ExecutionError',
            message: leanVersionResult.message,
        };
    }
    if (leanVersionResult.kind === 'InvalidVersion') {
        return {
            kind: 'ExecutionError',
            message: `Invalid Lean version format: '${leanVersionResult.versionResult}'`,
        };
    }
    const leanVersion = leanVersionResult.version;
    if (leanVersion.major === 3) {
        return { kind: 'IsLean3Version', version: leanVersion };
    }
    if (leanVersion.major === 4 && leanVersion.minor === 0 && leanVersion.prerelease.length > 0) {
        return { kind: 'IsAncientLean4Version', version: leanVersion };
    }
    return { kind: 'UpToDate', version: leanVersion };
}
export class SetupDiagnoser {
    channel;
    cwdUri;
    toolchain;
    constructor(channel, cwdUri, toolchain) {
        this.channel = channel;
        this.cwdUri = cwdUri;
        this.toolchain = toolchain;
    }
    async checkCurlAvailable() {
        const curlVersionResult = await this.runSilently('curl', ['--version']);
        return curlVersionResult.exitCode === ExecutionExitCode.Success;
    }
    async checkGitAvailable() {
        const gitVersionResult = await this.runSilently('git', ['--version']);
        return gitVersionResult.exitCode === ExecutionExitCode.Success;
    }
    async queryLakeVersion() {
        const lakeVersionResult = await this.runLeanCommand('lake', ['--version'], 'Checking Lake version');
        return versionQueryResult(lakeVersionResult, /version (\d+\.\d+\.\d+(\w|-)*)/);
    }
    async checkLakeAvailable() {
        const lakeVersionResult = await this.queryLakeVersion();
        return lakeVersionResult.kind === 'Success';
    }
    querySystemInformation() {
        const cpuModels = os.cpus().map(cpu => cpu.model);
        const groupedCpuModels = new Map();
        for (const cpuModel of cpuModels) {
            const counter = groupedCpuModels.get(cpuModel);
            if (counter === undefined) {
                groupedCpuModels.set(cpuModel, 1);
            }
            else {
                groupedCpuModels.set(cpuModel, counter + 1);
            }
        }
        const formattedCpuModels = Array.from(groupedCpuModels.entries())
            .map(([cpuModel, amount]) => `${amount} x ${cpuModel}`)
            .join(', ');
        const totalMemory = (os.totalmem() / 1_000_000_000).toFixed(2);
        return {
            operatingSystem: `${os.type()} (release: ${os.release()})`,
            cpuArchitecture: os.arch(),
            cpuModels: formattedCpuModels,
            totalMemory: `${totalMemory} GB`,
        };
    }
    queryExtensionVersion() {
        return new SemVer(extensions.getExtension('leanprover.lean4').packageJSON.version);
    }
    queryVSCodeVersion() {
        const currentVSCodeVersion = new SemVer(version);
        if (currentVSCodeVersion.compare(recommendedVSCodeVersion) < 0) {
            return {
                kind: 'Outdated',
                currentVersion: currentVSCodeVersion,
                recommendedVersion: recommendedVSCodeVersion,
            };
        }
        return { kind: 'UpToDate', version: currentVSCodeVersion };
    }
    async queryLeanVersion() {
        const leanVersionResult = await this.runLeanCommand('lean', ['--version'], 'Checking Lean version');
        return versionQueryResult(leanVersionResult, /version (\d+\.\d+\.\d+(\w|-)*)/);
    }
    async queryElanVersion() {
        const elanVersionResult = await this.runSilently('elan', ['--version']);
        return versionQueryResult(elanVersionResult, /elan (\d+\.\d+\.\d+)/);
    }
    async queryElanShow() {
        return await this.runSilently('elan', ['show']);
    }
    async elanVersion() {
        const elanVersionResult = await this.queryElanVersion();
        return checkElanVersion(elanVersionResult);
    }
    async projectSetup() {
        if (this.cwdUri === undefined) {
            return { kind: 'SingleFile' };
        }
        if (!(await isValidLeanProject(this.cwdUri))) {
            const parentProjectFolder = await checkParentFoldersForLeanProject(this.cwdUri);
            return { kind: 'MissingLeanToolchain', folder: this.cwdUri, parentProjectFolder };
        }
        return { kind: 'ValidProjectSetup', projectFolder: this.cwdUri };
    }
    async leanVersion() {
        const leanVersionResult = await this.queryLeanVersion();
        return checkLeanVersion(leanVersionResult);
    }
    async runSilently(executablePath, args) {
        return batchExecute(executablePath, args, this.cwdUri?.fsPath, { combined: this.channel });
    }
    async runWithProgress(executablePath, args, title) {
        return batchExecuteWithProgress(executablePath, args, title, {
            cwd: this.cwdUri?.fsPath,
            channel: this.channel,
        });
    }
    async runLeanCommand(executablePath, args, title) {
        const leanArgs = [...args];
        if (this.toolchain !== undefined) {
            leanArgs.unshift(`+${this.toolchain}`);
        }
        return await this.runWithProgress(executablePath, leanArgs, title);
    }
}
export function diagnose(channel, cwdUri, toolchain) {
    return new SetupDiagnoser(channel, cwdUri, toolchain);
}
