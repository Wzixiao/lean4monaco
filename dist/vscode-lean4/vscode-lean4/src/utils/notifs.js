import { commands, window } from 'vscode';
function toNotif(severity) {
    switch (severity) {
        case 'Information':
            return window.showInformationMessage;
        case 'Warning':
            return window.showWarningMessage;
        case 'Error':
            return window.showErrorMessage;
    }
}
export function displayNotification(severity, message, finalizer) {
    void (async () => {
        await toNotif(severity)(message, {});
        if (finalizer) {
            finalizer();
        }
    })();
}
export async function displayNotificationWithInput(severity, message, ...items) {
    return await toNotif(severity)(message, { modal: true }, ...items);
}
export function displayNotificationWithOptionalInput(severity, message, input, action, finalizer) {
    void (async () => {
        const choice = await toNotif(severity)(message, {}, input);
        if (choice === input) {
            action();
        }
        if (finalizer) {
            finalizer();
        }
    })();
}
export function displayNotificationWithOutput(severity, message, finalizer) {
    displayNotificationWithOptionalInput(severity, message, 'Show Output', () => commands.executeCommand('lean4.troubleshooting.showOutput'), finalizer);
}
export function displayNotificationWithSetupGuide(severity, message, finalizer) {
    displayNotificationWithOptionalInput(severity, message, 'Open Setup Guide', () => commands.executeCommand('lean4.docs.showSetupGuide'), finalizer);
}
export function displayError(message, finalizer) {
    displayNotification('Error', message, finalizer);
}
export async function displayErrorWithInput(message, ...items) {
    return await displayNotificationWithInput('Error', message, ...items);
}
export function displayErrorWithOptionalInput(message, input, action, finalizer) {
    displayNotificationWithOptionalInput('Error', message, input, action, finalizer);
}
export function displayErrorWithOutput(message, finalizer) {
    displayNotificationWithOutput('Error', message, finalizer);
}
export function displayErrorWithSetupGuide(message, finalizer) {
    displayNotificationWithSetupGuide('Error', message, finalizer);
}
export function displayWarning(message, finalizer) {
    displayNotification('Warning', message, finalizer);
}
export async function displayModalWarning(message) {
    const choice = await window.showWarningMessage(message, { modal: true }, 'Proceed Regardless');
    return choice === 'Proceed Regardless' ? 'Proceed' : 'Abort';
}
export async function displayWarningWithInput(message, ...items) {
    return await displayNotificationWithInput('Warning', message, ...items);
}
export function displayWarningWithOptionalInput(message, input, action, finalizer) {
    displayNotificationWithOptionalInput('Warning', message, input, action, finalizer);
}
export function displayWarningWithOutput(message, finalizer) {
    displayNotificationWithOutput('Warning', message, finalizer);
}
export async function displayModalWarningWithOutput(message) {
    const choice = await window.showWarningMessage(message, 'Show Output', 'Proceed Regardless');
    if (choice === undefined) {
        return 'Abort';
    }
    if (choice === 'Proceed Regardless') {
        return 'Proceed';
    }
    await commands.executeCommand('lean4.troubleshooting.showOutput');
    return 'Abort';
}
export function displayWarningWithSetupGuide(message, finalizer) {
    displayNotificationWithSetupGuide('Warning', message, finalizer);
}
export async function displayModalWarningWithSetupGuide(message) {
    const choice = await window.showWarningMessage(message, 'Open Setup Guide', 'Proceed Regardless');
    if (choice === undefined) {
        return 'Abort';
    }
    if (choice === 'Proceed Regardless') {
        return 'Proceed';
    }
    await commands.executeCommand('lean4.docs.showSetupGuide');
    return 'Abort';
}
export function displayInformation(message, finalizer) {
    displayNotification('Information', message, finalizer);
}
export async function displayInformationWithInput(message, ...items) {
    return await displayNotificationWithInput('Information', message, ...items);
}
export function displayInformationWithOptionalInput(message, input, action, finalizer) {
    displayNotificationWithOptionalInput('Information', message, input, action, finalizer);
}
export function displayInformationWithOutput(message, finalizer) {
    displayNotificationWithOutput('Information', message, finalizer);
}
export function displayInformationWithSetupGuide(message, finalizer) {
    displayNotificationWithSetupGuide('Information', message, finalizer);
}
