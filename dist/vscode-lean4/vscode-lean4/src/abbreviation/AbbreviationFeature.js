import { AbbreviationProvider } from '@leanprover/unicode-input';
import { languages } from 'vscode';
import { AbbreviationHoverProvider } from './AbbreviationHoverProvider';
import { AbbreviationRewriterFeature } from './AbbreviationRewriterFeature';
import { VSCodeAbbreviationConfig } from './VSCodeAbbreviationConfig';
export class AbbreviationFeature {
    disposables = new Array();
    abbreviations;
    constructor(outputChannel, selectionMoveMove) {
        const config = new VSCodeAbbreviationConfig();
        this.disposables.push(config);
        this.abbreviations = new AbbreviationProvider(config);
        this.disposables.push(languages.registerHoverProvider(config.languages, new AbbreviationHoverProvider(config, this.abbreviations)), new AbbreviationRewriterFeature(config, this.abbreviations, outputChannel, selectionMoveMove));
    }
    dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
