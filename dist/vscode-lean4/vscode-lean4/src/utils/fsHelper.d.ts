import { PathLike } from 'fs';
/**
 * Returns true if `pathFile` exists and is a file
 */
export declare function fileExists(pathFile: PathLike): Promise<boolean>;
/**
 * Returns true if `pathFile` exists and is a directory
 */
export declare function dirExists(pathFile: PathLike): Promise<boolean>;
/**
 * This helper function is used to check if an specific file is in certain Folder.
 * @param file string that contains a file name that will be checked if it exists in a certain folder.
 * @param folder string that contains a folder name where it will check if a certain file exists
 * @returns a boolean that says if the file exists in folder
 */
export declare function isFileInFolder(file: string, folder: string): boolean;
/** Computes the relative file path of `file` in `folder`. Returns `undefined` if `file` is not in `folder`. */
export declare function relativeFilePathInFolder(file: string, folder: string): string | undefined;
