import { Uri } from 'vscode';
export declare class FileUri {
    scheme: 'file';
    fsPath: string;
    constructor(fsPath: string);
    static fromUri(uri: Uri): FileUri | undefined;
    static fromUriOrError(uri: Uri): FileUri;
    asUri(): Uri;
    equals(other: FileUri): boolean;
    equalsUri(other: Uri): boolean;
    toString(): string;
    join(...pathSegments: string[]): FileUri;
    isInFolder(folderUri: FileUri): boolean;
    relativeTo(folderUri: FileUri): FileUri | undefined;
}
export declare function getWorkspaceFolderUri(uri: FileUri): FileUri | undefined;
export declare class UntitledUri {
    scheme: 'untitled';
    path: string;
    constructor(path?: string | undefined);
    static fromUri(uri: Uri): UntitledUri | undefined;
    static fromUriOrError(uri: Uri): UntitledUri;
    asUri(): Uri;
    equals(other: UntitledUri): boolean;
    equalsUri(other: Uri): boolean;
    toString(): string;
}
/** Uris supported by this extension. */
export type ExtUri = FileUri | UntitledUri;
export declare function isExtUri(uri: Uri): boolean;
export declare function toExtUri(uri: Uri): ExtUri | undefined;
export declare function toExtUriOrError(uri: Uri): ExtUri;
export declare function parseExtUri(uriString: string): ExtUri | undefined;
export declare function parseExtUriOrError(uriString: string): ExtUri;
export declare function extUriEquals(a: ExtUri, b: ExtUri): boolean;
export declare function extUriToCwdUri(uri: ExtUri): FileUri | undefined;
