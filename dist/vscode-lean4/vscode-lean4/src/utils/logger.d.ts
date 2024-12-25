declare class Logger {
    private static now;
    log(msg: string): void;
    error(msg: string): void;
}
declare const logger: Logger;
export { logger };
