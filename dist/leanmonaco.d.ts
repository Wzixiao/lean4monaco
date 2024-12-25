import "vscode/localExtensionHost";
import { RegisterExtensionResult, WebSocketConfigOptionsUrl } from "monaco-editor-wrapper";
import { LeanClientProvider } from "./vscode-lean4/vscode-lean4/src/utils/clientProvider";
import { InfoProvider } from "./vscode-lean4/vscode-lean4/src/infoview";
import { AbbreviationFeature } from "./vscode-lean4/vscode-lean4/src/abbreviation/AbbreviationFeature";
import { LeanTaskGutter } from "./vscode-lean4/vscode-lean4/src/taskgutter";
import { IFrameInfoWebviewFactory } from "./infowebview";
import { IExtensionManifest } from "vscode/extensions";
import { DisposableStore } from "vscode/monaco";
/** Options for LeanMonaco.
 *
 * The URL is where the server listens. You might want to use something like
 * `"ws://" + window.location.host`
 *
 * To add settings in `vscode`, you can open your settings in VSCode (Ctrl+,), search
 * for the desired setting, select "Copy Setting as JSON" from the "More Actions"
 * menu next to the selected setting, and paste the copied string here.
 */
export type LeanMonacoOptions = {
    websocket: {
        url: string;
    };
    htmlElement?: HTMLElement;
    vscode?: {
        [id: string]: any;
    };
};
export declare class LeanMonaco {
    private ready;
    whenReady: Promise<void>;
    static activeInstance: LeanMonaco | null;
    registerFileUrlResults: DisposableStore;
    extensionRegisterResult: RegisterExtensionResult | undefined;
    clientProvider: LeanClientProvider | undefined;
    infoProvider: InfoProvider | undefined;
    iframeWebviewFactory: IFrameInfoWebviewFactory | undefined;
    abbreviationFeature: AbbreviationFeature | undefined;
    taskGutter: LeanTaskGutter | undefined;
    infoviewEl: HTMLElement | undefined;
    disposed: boolean;
    start(options: LeanMonacoOptions): Promise<void>;
    /** Update options of the editor */
    updateVSCodeOptions(vsCodeOptions: {
        [id: string]: any;
    }): void;
    setInfoviewElement(infoviewEl: HTMLElement): void;
    protected getExtensionFiles(): Map<string, URL>;
    /** This basically returns the `package.json` of `vscode-lean4` with some ts-fixes and the custom themes. */
    protected getExtensionManifest(): IExtensionManifest;
    getWebSocketOptions(options: LeanMonacoOptions): WebSocketConfigOptionsUrl;
    /** Restarting all clients.
     * Note: I think with the current implementation, there is always just one client
     * (is that true?), but the vscode-extension is designed for more.
     */
    restart(): void;
    dispose(): void;
}
