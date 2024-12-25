import { EditorApi, InfoviewApi, ServerStoppedReason } from '@leanprover/infoview-api';
import { Disposable, DocumentSelector, Event, ExtensionContext, ViewColumn } from 'vscode';
import { LeanClient } from './leanclient';
import { Rpc } from './rpc';
import { LeanClientProvider } from './utils/clientProvider';
export interface InfoWebview {
    readonly api: InfoviewApi;
    readonly rpc: Rpc;
    readonly visible: boolean;
    dispose(): any;
    reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
    onDidDispose: Event<void>;
}
export interface InfoWebviewFactory {
    make(editorApi: EditorApi, stylesheet: string, column: number): InfoWebview;
}
export declare class InfoProvider implements Disposable {
    private provider;
    private readonly leanDocs;
    private context;
    private infoWebviewFactory;
    /** Instance of the panel, if it is open. Otherwise `undefined`. */
    private webviewPanel?;
    private subscriptions;
    private clientSubscriptions;
    private stylesheet;
    private autoOpened;
    private clientProvider;
    private serverNotifSubscriptions;
    private clientNotifSubscriptions;
    private rpcSessions;
    private clientsFailed;
    private workersFailed;
    private subscribeDidChangeNotification;
    private subscribeDidCloseNotification;
    private subscribeDiagnosticsNotification;
    private subscribeCustomNotification;
    private editorApi;
    constructor(provider: LeanClientProvider, leanDocs: DocumentSelector, context: ExtensionContext, infoWebviewFactory: InfoWebviewFactory);
    private onClientRestarted;
    private onClientAdded;
    onWorkerRestarted(uri: string): Promise<void>;
    onWorkerStopped(uri: string, client: LeanClient, reason: ServerStoppedReason): Promise<void>;
    onClientRemoved(client: LeanClient): void;
    onActiveClientStopped(client: LeanClient, activeClient: boolean, reason: ServerStoppedReason): Promise<void>;
    dispose(): void;
    isOpen(): boolean;
    runTestScript(javaScript: string): Promise<void>;
    getHtmlContents(): Promise<string>;
    sleep(ms: number): Promise<unknown>;
    toggleAllMessages(): Promise<void>;
    private updateStylesheet;
    private autoOpen;
    private clearNotificationHandlers;
    private clearRpcSessions;
    private toggleInfoview;
    private openPreview;
    private initInfoView;
    private sendConfig;
    private static getDiagnosticParams;
    private sendDiagnostics;
    private sendProgress;
    private onLanguageChanged;
    private getLocation;
    private sendPosition;
    private updateStatus;
    private revealEditorSelection;
    private handleInsertText;
}
