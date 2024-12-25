import { Uri, workspace } from 'vscode';
import { isFileInFolder, relativeFilePathInFolder } from './fsHelper';
function unsupportedSchemeError(uri) {
    return new Error(`Got URI with unsupported scheme '${uri.scheme}': '${uri}'`);
}
export class FileUri {
    scheme;
    fsPath;
    constructor(fsPath) {
        // TODO: Is this robust on Windows???
        fsPath = fsPath.replaceAll('\\', '/');
        this.scheme = 'file';
        this.fsPath = fsPath;
    }
    static fromUri(uri) {
        if (uri.scheme !== 'file') {
            return undefined;
        }
        return new FileUri(uri.fsPath);
    }
    static fromUriOrError(uri) {
        const fileUri = FileUri.fromUri(uri);
        if (fileUri === undefined) {
            throw unsupportedSchemeError(uri);
        }
        return fileUri;
    }
    asUri() {
        return Uri.file(this.fsPath);
    }
    equals(other) {
        return this.fsPath === other.fsPath;
    }
    equalsUri(other) {
        const otherFileUri = FileUri.fromUri(other);
        if (otherFileUri === undefined) {
            return false;
        }
        return this.equals(otherFileUri);
    }
    toString() {
        return this.asUri().toString();
    }
    join(...pathSegments) {
        return FileUri.fromUriOrError(Uri.joinPath(this.asUri(), ...pathSegments));
    }
    isInFolder(folderUri) {
        return isFileInFolder(this.fsPath, folderUri.fsPath);
    }
    relativeTo(folderUri) {
        const relativePath = relativeFilePathInFolder(this.fsPath, folderUri.fsPath);
        if (relativePath === undefined) {
            return undefined;
        }
        return new FileUri(relativePath);
    }
}
export function getWorkspaceFolderUri(uri) {
    const folder = workspace.getWorkspaceFolder(uri.asUri());
    if (folder === undefined) {
        return undefined;
    }
    const folderUri = FileUri.fromUri(folder.uri);
    if (folderUri === undefined) {
        return undefined;
    }
    return folderUri;
}
export class UntitledUri {
    scheme;
    path;
    constructor(path) {
        this.scheme = 'untitled';
        this.path = path ?? '';
    }
    static fromUri(uri) {
        if (uri.scheme !== 'untitled') {
            return undefined;
        }
        return new UntitledUri(uri.path);
    }
    static fromUriOrError(uri) {
        const untitledUri = UntitledUri.fromUri(uri);
        if (untitledUri === undefined) {
            throw unsupportedSchemeError(uri);
        }
        return untitledUri;
    }
    asUri() {
        return Uri.from({ scheme: 'untitled', path: this.path });
    }
    equals(other) {
        return this.path === other.path;
    }
    equalsUri(other) {
        const otherFileUri = UntitledUri.fromUri(other);
        if (otherFileUri === undefined) {
            return false;
        }
        return this.equals(otherFileUri);
    }
    toString() {
        return this.asUri().toString();
    }
}
export function isExtUri(uri) {
    return uri.scheme === 'untitled' || uri.scheme === 'file';
}
export function toExtUri(uri) {
    if (uri.scheme === 'untitled') {
        return new UntitledUri(uri.path);
    }
    if (uri.scheme === 'file') {
        return new FileUri(uri.fsPath);
    }
    return undefined;
}
export function toExtUriOrError(uri) {
    const result = toExtUri(uri);
    if (result === undefined) {
        throw unsupportedSchemeError(uri);
    }
    return result;
}
export function parseExtUri(uriString) {
    return toExtUri(Uri.parse(uriString));
}
export function parseExtUriOrError(uriString) {
    return toExtUriOrError(Uri.parse(uriString));
}
export function extUriEquals(a, b) {
    if (a.scheme === 'untitled' && b.scheme === 'untitled') {
        return a.equals(b);
    }
    if (a.scheme === 'file' && b.scheme === 'file') {
        return a.equals(b);
    }
    return false;
}
export function extUriToCwdUri(uri) {
    if (uri.scheme === 'untitled') {
        return undefined;
    }
    return uri;
}
