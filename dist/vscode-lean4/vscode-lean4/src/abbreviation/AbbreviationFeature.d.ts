import { AbbreviationProvider, SelectionMoveMode } from '@leanprover/unicode-input';
import { OutputChannel } from 'vscode';
export declare class AbbreviationFeature {
    private readonly disposables;
    readonly abbreviations: AbbreviationProvider;
    constructor(outputChannel: OutputChannel, selectionMoveMove?: SelectionMoveMode);
    dispose(): void;
}
