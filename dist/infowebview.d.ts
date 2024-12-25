import { EditorApi, InfoviewApi } from "@leanprover/infoview-api";
import { InfoWebviewFactory, InfoWebview } from "./vscode-lean4/vscode-lean4/src/infoview";
import { Rpc } from "./vscode-lean4/vscode-lean4/src/rpc";
import { ViewColumn } from "vscode";
import { IConfigurationService, IThemeService } from "vscode/services";
export declare class IFrameInfoWebview implements InfoWebview {
    private iframe;
    rpc: Rpc;
    visible: boolean;
    private onDidDisposeEmitter;
    onDidDispose: import("vscode").Event<void>;
    api: InfoviewApi;
    constructor(iframe: HTMLIFrameElement, rpc: Rpc);
    dispose(): void;
    reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
}
export declare class IFrameInfoWebviewFactory implements InfoWebviewFactory {
    private themeService;
    private configurationService;
    private fontFiles;
    private infoviewElement;
    private iframe;
    constructor(themeService: IThemeService, configurationService: IConfigurationService, fontFiles: FontFace[]);
    setInfoviewElement(infoviewElement: HTMLElement): void;
    make(editorApi: EditorApi, stylesheet: string, column: number): IFrameInfoWebview;
    private updateCssVars;
    private apiThemeClassName;
    private initialHtml;
}
