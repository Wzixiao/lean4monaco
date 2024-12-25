/** Platform independent interface to work with the PATH variable. */
export declare class PATH {
    paths: string[];
    constructor(paths: string[]);
    static empty(): PATH;
    static ofEnvPath(envPath: string): PATH;
    static ofEnv(env: NodeJS.ProcessEnv): PATH;
    static ofProcessEnv(): PATH;
    toEnvPath(): string;
    setInEnv(env: NodeJS.ProcessEnv): void;
    setInProcessEnv(): void;
    prepend(path: string): PATH;
    join(other: PATH): PATH;
    length(): number;
    isEmpty(): boolean;
    includes(path: string): boolean;
    filter(p: (path: string) => boolean): PATH;
}
export declare function setPATH(env: NodeJS.ProcessEnv, path: PATH): void;
export declare function setProcessEnvPATH(path: PATH): void;
