import * as fs from 'fs';
import { FileUri, getWorkspaceFolderUri } from './exturi';
import { dirExists, fileExists } from './fsHelper';
import path from 'path';
// Detect lean4 root directory (works for both lean4 repo and nightly distribution)
export async function isCoreLean4Directory(path) {
    const licensePath = path.join('LICENSE').fsPath;
    const licensesPath = path.join('LICENSES').fsPath;
    const srcPath = path.join('src').fsPath;
    const isCoreLean4RootDirectory = (await fileExists(licensePath)) && (await fileExists(licensesPath)) && (await dirExists(srcPath));
    if (isCoreLean4RootDirectory) {
        return true;
    }
    const initPath = path.join('Init.lean').fsPath;
    const leanPath = path.join('Lean.lean').fsPath;
    const kernelPath = path.join('kernel').fsPath;
    const runtimePath = path.join('runtime').fsPath;
    const isCoreLean4SrcDirectory = (await fileExists(initPath)) &&
        (await fileExists(leanPath)) &&
        (await dirExists(kernelPath)) &&
        (await dirExists(runtimePath));
    return isCoreLean4SrcDirectory;
}
// Find the root of a Lean project and the Uri for the 'lean-toolchain' file found there.
export async function findLeanProjectRootInfo(uri) {
    const toolchainFileName = 'lean-toolchain';
    let path = uri;
    const containingWsFolderUri = getWorkspaceFolderUri(uri);
    try {
        if ((await fs.promises.stat(path.fsPath)).isFile()) {
            path = uri.join('..');
        }
    }
    catch (e) {
        return { kind: 'FileNotFound' };
    }
    let bestFolder = path;
    let bestLeanToolchain;
    while (true) {
        const leanToolchain = path.join(toolchainFileName);
        if (await fileExists(leanToolchain.fsPath)) {
            bestFolder = path;
            bestLeanToolchain = leanToolchain;
        }
        else if (await isCoreLean4Directory(path)) {
            bestFolder = path;
            bestLeanToolchain = undefined;
            // Stop searching in case users accidentally created a lean-toolchain file above the core directory
            break;
        }
        if (containingWsFolderUri !== undefined && path.equals(containingWsFolderUri)) {
            if (bestLeanToolchain === undefined) {
                // If we haven't found a toolchain yet, prefer the workspace folder as the project scope for the file,
                // but keep looking in case there is a lean-toolchain above the workspace folder
                // (New users sometimes accidentally open sub-folders of projects)
                bestFolder = path;
            }
            else {
                // Stop looking above the barrier if we have a toolchain. This is necessary for the nested lean-toolchain setup of core.
                break;
            }
        }
        const parent = path.join('..');
        if (parent.equals(path)) {
            // no project file found.
            break;
        }
        path = parent;
    }
    return { kind: 'Success', projectRootUri: bestFolder, toolchainUri: bestLeanToolchain };
}
export async function findLeanProjectRoot(uri) {
    const info = await findLeanProjectRootInfo(uri);
    switch (info.kind) {
        case 'Success':
            return info.projectRootUri;
        case 'FileNotFound':
            return 'FileNotFound';
    }
}
export async function findLeanProjectInfo(uri) {
    const info = await findLeanProjectRootInfo(uri);
    switch (info.kind) {
        case 'Success':
            let toolchainInfo;
            if (info.toolchainUri !== undefined) {
                toolchainInfo = { uri: info.toolchainUri, toolchain: await readLeanToolchainFile(info.toolchainUri) };
            }
            return { kind: 'Success', projectRootUri: info.projectRootUri, toolchainInfo };
        case 'FileNotFound':
            return { kind: 'FileNotFound' };
    }
}
async function readLeanToolchainFile(toolchainFileUri) {
    try {
        return (await fs.promises.readFile(toolchainFileUri.fsPath, { encoding: 'utf-8' })).trim();
    }
    catch {
        return undefined;
    }
}
export async function isValidLeanProject(projectFolder) {
    try {
        const leanToolchainPath = projectFolder.join('lean-toolchain').fsPath;
        const isLeanProject = await fileExists(leanToolchainPath);
        const isLeanItself = await isCoreLean4Directory(projectFolder);
        return isLeanProject || isLeanItself;
    }
    catch {
        return false;
    }
}
export async function checkParentFoldersForLeanProject(folder) {
    let childFolder;
    do {
        childFolder = folder;
        folder = new FileUri(path.dirname(folder.fsPath));
        if (await isValidLeanProject(folder)) {
            return folder;
        }
    } while (!childFolder.equals(folder));
    return undefined;
}
export async function willUseLakeServer(folder) {
    if (folder.scheme !== 'file') {
        return false;
    }
    const lakefileLean = folder.join('lakefile.lean');
    const lakefileToml = folder.join('lakefile.toml');
    return (await fileExists(lakefileLean.fsPath)) || (await fileExists(lakefileToml.fsPath));
}
