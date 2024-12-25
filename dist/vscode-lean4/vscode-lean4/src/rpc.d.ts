export declare class Rpc {
    readonly sendMessage: (msg: any) => void;
    private seqNum;
    private methods;
    private pending;
    /** Resolves when both sides of the channel are ready to receive procedure calls. */
    private initPromise;
    private resolveInit;
    private initialized;
    constructor(sendMessage: (msg: any) => void);
    /** Register procedures that the other side of the channel can invoke. Must be called exactly once. */
    register<T>(methods: T): void;
    messageReceived(msg: any): void;
    invoke(name: string, args: any[]): Promise<any>;
    getApi<T>(): T;
}
