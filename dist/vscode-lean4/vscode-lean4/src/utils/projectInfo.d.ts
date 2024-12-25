import { ExtUri, FileUri } from './exturi';
export declare function isCoreLean4Directory(path: FileUri): Promise<boolean>;
type ProjectRootInfo = {
    kind: 'Success';
    projectRootUri: FileUri;
    toolchainUri: FileUri | undefined;
} | {
    kind: 'FileNotFound';
};
type ToolchainInfo = {
    uri: FileUri;
    toolchain: string | undefined;
};
type ProjectInfo = {
    kind: 'Success';
    projectRootUri: FileUri;
    toolchainInfo: ToolchainInfo | undefined;
} | {
    kind: 'FileNotFound';
};
export declare function findLeanProjectRootInfo(uri: FileUri): Promise<ProjectRootInfo>;
export declare function findLeanProjectRoot(uri: FileUri): Promise<FileUri | 'FileNotFound'>;
export declare function findLeanProjectInfo(uri: FileUri): Promise<ProjectInfo>;
export declare function isValidLeanProject(projectFolder: FileUri): Promise<boolean>;
export declare function checkParentFoldersForLeanProject(folder: FileUri): Promise<FileUri | undefined>;
export declare function willUseLakeServer(folder: ExtUri): Promise<boolean>;
export {};
