import { AbbreviationProvider, SelectionMoveMode } from '@leanprover/unicode-input';
import { OutputChannel } from 'vscode';
import { VSCodeAbbreviationConfig } from './VSCodeAbbreviationConfig';
/**
 * Sets up everything required for the abbreviation rewriter feature.
 * Creates an `AbbreviationRewriter` for the active editor.
 */
export declare class AbbreviationRewriterFeature {
    private readonly config;
    private readonly abbreviationProvider;
    private readonly outputChannel;
    private readonly selectionMoveMove?;
    private readonly disposables;
    private activeAbbreviationRewriter;
    constructor(config: VSCodeAbbreviationConfig, abbreviationProvider: AbbreviationProvider, outputChannel: OutputChannel, selectionMoveMove?: SelectionMoveMode | undefined);
    private disposeActiveAbbreviationRewriter;
    private changedActiveTextEditor;
    private shouldEnableRewriterForEditor;
    dispose(): void;
}
