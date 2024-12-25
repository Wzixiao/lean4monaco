import { WorkerConfigDirect, WebSocketConfigOptions, WebSocketConfigOptionsUrl, WorkerConfigOptions } from "monaco-editor-wrapper";
import { ExtUri } from "./vscode-lean4/vscode-lean4/src/utils/exturi";
import { LanguageClientOptions } from "vscode-languageclient/node";
export declare const setupMonacoClient: (options: WebSocketConfigOptions | WebSocketConfigOptionsUrl | WorkerConfigOptions | WorkerConfigDirect) => (clientOptions: LanguageClientOptions, folderUri: ExtUri, elanDefaultToolchain: string) => Promise<import("monaco-languageclient").MonacoLanguageClient>;
