import { AbbreviationConfig, SymbolsByAbbreviation } from '@leanprover/unicode-input';
import { Disposable } from 'vscode';
export declare class VSCodeAbbreviationConfig implements AbbreviationConfig, Disposable {
    abbreviationCharacter: string;
    customTranslations: SymbolsByAbbreviation;
    eagerReplacementEnabled: boolean;
    inputModeEnabled: boolean;
    languages: string[];
    private subscriptions;
    constructor();
    private reloadConfig;
    dispose(): void;
}
