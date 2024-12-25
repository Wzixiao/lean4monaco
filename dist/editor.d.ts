import { ITextFileEditorModel } from "vscode/monaco";
import * as monaco from "monaco-editor";
import { IReference } from "@codingame/monaco-vscode-editor-service-override";
import * as vscode from "vscode";
export declare class LeanMonacoEditor {
    editor: monaco.editor.IStandaloneCodeEditor;
    modelRef: IReference<ITextFileEditorModel>;
    disposed: boolean;
    vscodeEnvironment: typeof vscode;
    start(editorEl: HTMLElement, fileName: string, code: string): Promise<void>;
    dispose(): void;
}
