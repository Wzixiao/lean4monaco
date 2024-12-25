import { Disposable, ExtensionContext } from 'vscode';
import { LeanClientProvider } from './utils/clientProvider';
export declare class LeanTaskGutter implements Disposable {
    private decorations;
    private status;
    private gutters;
    private subscriptions;
    constructor(client: LeanClientProvider, context: ExtensionContext);
    private updateDecos;
    dispose(): void;
}
