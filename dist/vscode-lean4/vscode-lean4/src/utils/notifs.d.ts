export type NotificationSeverity = 'Information' | 'Warning' | 'Error';
export declare function displayNotification(severity: NotificationSeverity, message: string, finalizer?: (() => void) | undefined): void;
export declare function displayNotificationWithInput<T extends string>(severity: NotificationSeverity, message: string, ...items: T[]): Promise<T | undefined>;
export declare function displayNotificationWithOptionalInput<T extends string>(severity: NotificationSeverity, message: string, input: T, action: () => void, finalizer?: (() => void) | undefined): void;
export declare function displayNotificationWithOutput(severity: NotificationSeverity, message: string, finalizer?: (() => void) | undefined): void;
export declare function displayNotificationWithSetupGuide(severity: NotificationSeverity, message: string, finalizer?: (() => void) | undefined): void;
export declare function displayError(message: string, finalizer?: (() => void) | undefined): void;
export declare function displayErrorWithInput<T extends string>(message: string, ...items: T[]): Promise<T | undefined>;
export declare function displayErrorWithOptionalInput<T extends string>(message: string, input: T, action: () => void, finalizer?: (() => void) | undefined): void;
export declare function displayErrorWithOutput(message: string, finalizer?: (() => void) | undefined): void;
export declare function displayErrorWithSetupGuide(message: string, finalizer?: (() => void) | undefined): void;
export declare function displayWarning(message: string, finalizer?: (() => void) | undefined): void;
export declare function displayModalWarning(message: string): Promise<'Proceed' | 'Abort'>;
export declare function displayWarningWithInput<T extends string>(message: string, ...items: T[]): Promise<T | undefined>;
export declare function displayWarningWithOptionalInput<T extends string>(message: string, input: T, action: () => void, finalizer?: (() => void) | undefined): void;
export declare function displayWarningWithOutput(message: string, finalizer?: (() => void) | undefined): void;
export declare function displayModalWarningWithOutput(message: string): Promise<'Proceed' | 'Abort'>;
export declare function displayWarningWithSetupGuide(message: string, finalizer?: (() => void) | undefined): void;
export declare function displayModalWarningWithSetupGuide(message: string): Promise<'Proceed' | 'Abort'>;
export declare function displayInformation(message: string, finalizer?: (() => void) | undefined): void;
export declare function displayInformationWithInput<T extends string>(message: string, ...items: T[]): Promise<T | undefined>;
export declare function displayInformationWithOptionalInput<T extends string>(message: string, input: T, action: () => void, finalizer?: (() => void) | undefined): void;
export declare function displayInformationWithOutput(message: string, finalizer?: (() => void) | undefined): void;
export declare function displayInformationWithSetupGuide(message: string, finalizer?: (() => void) | undefined): void;