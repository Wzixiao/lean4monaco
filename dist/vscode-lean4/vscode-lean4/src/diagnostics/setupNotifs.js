import { shouldShowSetupWarnings } from '../config';
import { displayError, displayErrorWithInput, displayErrorWithOptionalInput, displayErrorWithOutput, displayErrorWithSetupGuide, displayModalWarning, displayModalWarningWithOutput, displayModalWarningWithSetupGuide, displayWarning, displayWarningWithInput, displayWarningWithOptionalInput, displayWarningWithOutput, displayWarningWithSetupGuide, } from '../utils/notifs';
export function preconditionCheckResultToSeverity(result) {
    switch (result) {
        case 'Fulfilled':
            return 0;
        case 'Warning':
            return 1;
        case 'Fatal':
            return 2;
    }
}
export function severityToPreconditionCheckResult(severity) {
    switch (severity) {
        case 0:
            return 'Fulfilled';
        case 1:
            return 'Warning';
        case 2:
            return 'Fatal';
    }
}
export function worstPreconditionViolation(...results) {
    let worstViolation = 'Fulfilled';
    for (const r of results) {
        if (preconditionCheckResultToSeverity(r) > preconditionCheckResultToSeverity(worstViolation)) {
            worstViolation = r;
        }
    }
    return worstViolation;
}
export function displaySetupError(message, finalizer) {
    displayError(message, finalizer);
    return 'Fatal';
}
export async function displaySetupErrorWithInput(message, ...items) {
    return await displayErrorWithInput(message, ...items);
}
export function displaySetupErrorWithOptionalInput(message, input, action, finalizer) {
    displayErrorWithOptionalInput(message, input, action, finalizer);
    return 'Fatal';
}
export function displaySetupErrorWithOutput(message, finalizer) {
    displayErrorWithOutput(message, finalizer);
    return 'Fatal';
}
export function displaySetupErrorWithSetupGuide(message, finalizer) {
    displayErrorWithSetupGuide(message, finalizer);
    return 'Fatal';
}
export function displayDependencySetupError(missingDeps) {
    if (missingDeps.length === 0) {
        throw new Error();
    }
    let missingDepMessage;
    if (missingDeps.length === 1) {
        missingDepMessage = `One of Lean's dependencies ('${missingDeps.at(0)}') is missing`;
    }
    else {
        missingDepMessage = `Multiple of Lean's dependencies (${missingDeps.map(dep => `'${dep}'`).join(', ')}) are missing`;
    }
    const errorMessage = `${missingDepMessage}. Please read the Setup Guide on how to install missing dependencies and set up Lean 4.`;
    displaySetupErrorWithSetupGuide(errorMessage);
    return 'Fatal';
}
export async function displayElanSetupError(installer, reason) {
    const isElanInstalled = await installer.displayInstallElanPrompt('Error', reason);
    return isElanInstalled ? 'Fulfilled' : 'Fatal';
}
export async function displayElanOutdatedSetupError(installer, currentVersion, recommendedVersion) {
    const isElanUpToDate = await installer.displayUpdateElanPrompt('Error', currentVersion, recommendedVersion);
    return isElanUpToDate ? 'Fulfilled' : 'Fatal';
}
export async function displaySetupWarning(message, options = { modal: false }) {
    if (!shouldShowSetupWarnings()) {
        return 'Warning';
    }
    if (options.modal) {
        const choice = await displayModalWarning(message);
        return choice === 'Proceed' ? 'Warning' : 'Fatal';
    }
    displayWarning(message, options.finalizer);
    return 'Warning';
}
export async function displaySetupWarningWithInput(message, ...items) {
    if (!shouldShowSetupWarnings()) {
        return undefined;
    }
    return await displayWarningWithInput(message, ...items);
}
export function displaySetupWarningWithOptionalInput(message, input, action, finalizer) {
    if (!shouldShowSetupWarnings()) {
        return 'Warning';
    }
    displayWarningWithOptionalInput(message, input, action, finalizer);
    return 'Warning';
}
export async function displaySetupWarningWithOutput(message, options = { modal: false }) {
    if (!shouldShowSetupWarnings()) {
        return 'Warning';
    }
    if (options.modal) {
        const choice = await displayModalWarningWithOutput(message);
        return choice === 'Proceed' ? 'Warning' : 'Fatal';
    }
    displayWarningWithOutput(message, options.finalizer);
    return 'Warning';
}
export async function displaySetupWarningWithSetupGuide(message, options = { modal: false }) {
    if (!shouldShowSetupWarnings()) {
        return 'Warning';
    }
    if (options.modal) {
        const choice = await displayModalWarningWithSetupGuide(message);
        return choice === 'Proceed' ? 'Warning' : 'Fatal';
    }
    displayWarningWithSetupGuide(message, options.finalizer);
    return 'Warning';
}
export async function displayElanSetupWarning(installer, reason) {
    if (!shouldShowSetupWarnings()) {
        return 'Warning';
    }
    const isElanInstalled = await installer.displayInstallElanPrompt('Warning', reason);
    return isElanInstalled ? 'Fulfilled' : 'Warning';
}
export async function displayElanOutdatedSetupWarning(installer, currentVersion, recommendedVersion) {
    if (!shouldShowSetupWarnings()) {
        return 'Warning';
    }
    const isElanUpToDate = await installer.displayUpdateElanPrompt('Warning', currentVersion, recommendedVersion);
    return isElanUpToDate ? 'Fulfilled' : 'Warning';
}
