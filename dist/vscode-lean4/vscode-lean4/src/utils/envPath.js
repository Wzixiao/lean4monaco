import * as path from 'path';
/** Platform independent interface to work with the PATH variable. */
export class PATH {
    paths;
    constructor(paths) {
        this.paths = paths;
    }
    static empty() {
        return new PATH([]);
    }
    static ofEnvPath(envPath) {
        return new PATH(envPath.split(path.delimiter));
    }
    static ofEnv(env) {
        return PATH.ofEnvPath(env.PATH ?? '');
    }
    static ofProcessEnv() {
        return PATH.ofEnv(process.env);
    }
    toEnvPath() {
        return this.paths.join(path.delimiter);
    }
    setInEnv(env) {
        env.PATH = this.toEnvPath();
    }
    setInProcessEnv() {
        this.setInEnv(process.env);
    }
    prepend(path) {
        return new PATH([path].concat(this.paths));
    }
    join(other) {
        return new PATH(this.paths.concat(other.paths));
    }
    length() {
        return this.paths.length;
    }
    isEmpty() {
        return this.length() === 0;
    }
    includes(path) {
        return this.paths.includes(path);
    }
    filter(p) {
        return new PATH(this.paths.filter(p));
    }
}
export function setPATH(env, path) {
    path.setInEnv(env);
}
export function setProcessEnvPATH(path) {
    setPATH(process.env, path);
}
