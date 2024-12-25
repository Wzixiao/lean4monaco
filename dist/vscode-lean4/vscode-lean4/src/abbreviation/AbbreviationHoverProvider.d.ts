import { AbbreviationConfig, AbbreviationProvider } from '@leanprover/unicode-input';
import { Hover, HoverProvider, Position, TextDocument } from 'vscode';
/**
 * Adds hover behaviour for getting translations of unicode characters.
 * Eg: "Type ⊓ using \glb or \sqcap"
 */
export declare class AbbreviationHoverProvider implements HoverProvider {
    private readonly config;
    private readonly abbreviations;
    constructor(config: AbbreviationConfig, abbreviations: AbbreviationProvider);
    provideHover(document: TextDocument, pos: Position): Hover | undefined;
}
