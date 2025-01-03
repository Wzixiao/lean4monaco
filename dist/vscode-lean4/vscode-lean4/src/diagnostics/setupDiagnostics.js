import { commands } from 'vscode';
import { extUriToCwdUri } from '../utils/exturi';
import { willUseLakeServer } from '../utils/projectInfo';
import { diagnose } from './setupDiagnoser';
import { displayDependencySetupError, displayElanOutdatedSetupWarning, displayElanSetupError, displayElanSetupWarning, displaySetupError, displaySetupErrorWithOutput, displaySetupWarning, displaySetupWarningWithOptionalInput, displaySetupWarningWithOutput, worstPreconditionViolation, } from './setupNotifs';
export async function checkAll(...checks) {
    let worstViolation = 'Fulfilled';
    for (const check of checks) {
        const result = await check();
        worstViolation = worstPreconditionViolation(worstViolation, result);
        if (worstViolation === 'Fatal') {
            return 'Fatal';
        }
    }
    return worstViolation;
}
const singleFileWarningMessage = `Lean 4 server is operating in restricted single file mode.
Please open a valid Lean 4 project containing a \'lean-toolchain\' file for full functionality.
Click the following link to learn how to set up or open Lean projects: [(Show Setup Guide)](command:lean4.docs.showSetupGuide)`;
const missingLeanToolchainWarningMessage = `Opened folder does not contain a valid Lean 4 project.
Please open a valid Lean 4 project containing a \'lean-toolchain\' file for full functionality.
Click the following link to learn how to set up or open Lean projects: [(Show Setup Guide)](command:lean4.docs.showSetupGuide)`;
const missingLeanToolchainWithParentProjectWarningMessage = (parentProjectFolder) => `Opened folder does not contain a valid Lean 4 project folder because it does not contain a 'lean-toolchain' file.
However, a valid Lean 4 project folder was found in one of the parent directories at '${parentProjectFolder.fsPath}'.
Open this project instead?`;
const lean3ProjectErrorMessage = (origin, projectVersion) => `${origin} is using Lean 3 (version: ${projectVersion.toString()}).
If you want to use Lean 3, disable this extension ('Extensions' in the left sidebar > Cog icon on 'lean4' > 'Disable') and install the 'lean' extension for Lean 3 support.`;
const ancientLean4ProjectWarningMessage = (origin, projectVersion) => `${origin} is using a Lean 4 version (${projectVersion.toString()}) from before the first Lean 4 stable release (4.0.0).
Pre-stable Lean 4 versions are increasingly less supported, so please consider updating to a newer Lean 4 version.`;
export async function checkAreDependenciesInstalled(channel, cwdUri) {
    const missingDeps = [];
    if (!(await diagnose(channel, cwdUri).checkCurlAvailable())) {
        missingDeps.push('curl');
    }
    if (!(await diagnose(channel, cwdUri).checkGitAvailable())) {
        missingDeps.push('git');
    }
    if (missingDeps.length === 0) {
        return 'Fulfilled';
    }
    displayDependencySetupError(missingDeps);
    return 'Fatal';
}
export async function checkIsLean4Installed(installer, cwdUri) {
    const leanVersionResult = await diagnose(installer.getOutputChannel(), cwdUri).queryLeanVersion();
    switch (leanVersionResult.kind) {
        case 'Success':
            return 'Fulfilled';
        case 'CommandError':
            return displaySetupErrorWithOutput(`Error while checking Lean version: ${leanVersionResult.message}`);
        case 'InvalidVersion':
            return displaySetupErrorWithOutput(`Error while checking Lean version: 'lean --version' returned a version that could not be parsed: '${leanVersionResult.versionResult}'`);
        case 'CommandNotFound':
            return await displayElanSetupError(installer, 'Lean is not installed.');
    }
}
export async function checkIsElanUpToDate(installer, cwdUri, options) {
    const elanDiagnosis = await diagnose(installer.getOutputChannel(), cwdUri).elanVersion();
    switch (elanDiagnosis.kind) {
        case 'NotInstalled':
            if (options.elanMustBeInstalled) {
                return await displayElanSetupError(installer, "Lean's version manager Elan is not installed.");
            }
            return await displayElanSetupWarning(installer, "Lean's version manager Elan is not installed. This means that the correct Lean 4 toolchain version of Lean 4 projects will not be selected or installed automatically.");
        case 'ExecutionError':
            return await displaySetupWarningWithOutput('Cannot determine Elan version: ' + elanDiagnosis.message, {
                modal: options.modal,
            });
        case 'Outdated':
            return await displayElanOutdatedSetupWarning(installer, elanDiagnosis.currentVersion, elanDiagnosis.recommendedVersion);
        case 'UpToDate':
            return 'Fulfilled';
    }
}
export async function checkIsValidProjectFolder(channel, folderUri) {
    const projectSetupDiagnosis = await diagnose(channel, extUriToCwdUri(folderUri)).projectSetup();
    switch (projectSetupDiagnosis.kind) {
        case 'SingleFile':
            return await displaySetupWarning(singleFileWarningMessage);
        case 'MissingLeanToolchain':
            const parentProjectFolder = projectSetupDiagnosis.parentProjectFolder;
            if (parentProjectFolder === undefined) {
                return await displaySetupWarning(missingLeanToolchainWarningMessage);
            }
            else {
                return displaySetupWarningWithOptionalInput(missingLeanToolchainWithParentProjectWarningMessage(parentProjectFolder), 'Open Parent Directory Project', 
                // this kills the extension host
                () => commands.executeCommand('vscode.openFolder', parentProjectFolder));
            }
        case 'ValidProjectSetup':
            return 'Fulfilled';
    }
}
export async function checkIsLeanVersionUpToDate(channel, folderUri, options) {
    let origin;
    if (options.toolchainOverride !== undefined) {
        origin = `Project toolchain '${options.toolchainOverride}'`;
    }
    else if (folderUri.scheme === 'untitled') {
        origin = 'Opened file';
    }
    else {
        origin = 'Opened project';
    }
    const projectLeanVersionDiagnosis = await diagnose(channel, extUriToCwdUri(folderUri), options.toolchainOverride).leanVersion();
    switch (projectLeanVersionDiagnosis.kind) {
        case 'NotInstalled':
            return displaySetupErrorWithOutput("Error while checking Lean version: 'lean' command was not found.");
        case 'ExecutionError':
            return displaySetupErrorWithOutput(`Error while checking Lean version: ${projectLeanVersionDiagnosis.message}`);
        case 'IsLean3Version':
            return displaySetupError(lean3ProjectErrorMessage(origin, projectLeanVersionDiagnosis.version));
        case 'IsAncientLean4Version':
            return await displaySetupWarning(ancientLean4ProjectWarningMessage(origin, projectLeanVersionDiagnosis.version), {
                modal: options.modal,
            });
        case 'UpToDate':
            return 'Fulfilled';
    }
}
export async function checkIsLakeInstalledCorrectly(channel, folderUri, options) {
    const lakeVersionResult = await diagnose(channel, extUriToCwdUri(folderUri), options.toolchainOverride).queryLakeVersion();
    switch (lakeVersionResult.kind) {
        case 'CommandNotFound':
            return displaySetupErrorWithOutput("Error while checking Lake version: 'lake' command was not found.");
        case 'CommandError':
            return displaySetupErrorWithOutput(`Error while checking Lake version: ${lakeVersionResult.message}`);
        case 'InvalidVersion':
            return displaySetupErrorWithOutput(`Error while checking Lake version: Invalid Lake version format: '${lakeVersionResult.versionResult}'`);
        case 'Success':
            return 'Fulfilled';
    }
}
export async function checkIsVSCodeUpToDate() {
    const vscodeVersionResult = diagnose(undefined, undefined).queryVSCodeVersion();
    switch (vscodeVersionResult.kind) {
        case 'Outdated':
            return displaySetupWarning(`VS Code version is too out-of-date for new versions of the Lean 4 VS Code extension. The current VS Code version is ${vscodeVersionResult.currentVersion}, but at least a version of ${vscodeVersionResult.recommendedVersion} is recommended so that new versions of the Lean 4 VS Code extension can be installed.`);
        case 'UpToDate':
            return 'Fulfilled';
    }
}
export async function checkLean4ProjectPreconditions(channel, folderUri) {
    return await checkAll(() => checkIsValidProjectFolder(channel, folderUri), () => checkIsLeanVersionUpToDate(channel, folderUri, { modal: false }), async () => {
        if (!(await willUseLakeServer(folderUri))) {
            return 'Fulfilled';
        }
        return await checkIsLakeInstalledCorrectly(channel, folderUri, {});
    });
}
