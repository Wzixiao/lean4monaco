import { AbbreviationConfig, AbbreviationProvider, AbbreviationTextSource, Change, Range, SelectionMoveMode } from '@leanprover/unicode-input';
import { OutputChannel, TextEditor } from 'vscode';
/**
 * Tracks abbreviations in a given text editor and replaces them when dynamically.
 */
export declare class VSCodeAbbreviationRewriter implements AbbreviationTextSource {
    readonly config: AbbreviationConfig;
    readonly abbreviationProvider: AbbreviationProvider;
    private readonly outputChannel;
    private readonly textEditor;
    private selectionMoveMoveOverride?;
    private readonly disposables;
    private readonly rewriter;
    private readonly decorationType;
    private firstOutput;
    private isVimExtensionInstalled;
    private checkIsVimExtensionInstalled;
    constructor(config: AbbreviationConfig, abbreviationProvider: AbbreviationProvider, outputChannel: OutputChannel, textEditor: TextEditor, selectionMoveMoveOverride?: SelectionMoveMode | undefined);
    private writeError;
    selectionMoveMode(): SelectionMoveMode;
    collectSelections(): Range[];
    setSelections(selections: Range[]): void;
    replaceAbbreviations(changes: Change[]): Promise<boolean>;
    replaceAllTrackedAbbreviations(): Promise<void>;
    private updateState;
    private setInputActive;
    dispose(): void;
}
