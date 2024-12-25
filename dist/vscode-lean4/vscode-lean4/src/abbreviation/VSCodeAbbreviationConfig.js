import { workspace } from 'vscode';
export class VSCodeAbbreviationConfig {
    abbreviationCharacter;
    customTranslations;
    eagerReplacementEnabled;
    inputModeEnabled;
    languages;
    subscriptions = [];
    constructor() {
        this.reloadConfig();
        this.subscriptions.push(workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('lean4.input')) {
                this.reloadConfig();
            }
        }));
    }
    reloadConfig() {
        this.inputModeEnabled = workspace.getConfiguration('lean4.input').get('enabled', true);
        this.abbreviationCharacter = workspace.getConfiguration('lean4.input').get('leader', '\\');
        this.languages = workspace.getConfiguration('lean4.input').get('languages', ['lean4']);
        this.customTranslations = workspace.getConfiguration('lean4.input').get('customTranslations', {});
        this.eagerReplacementEnabled = workspace.getConfiguration('lean4.input').get('eagerReplacementEnabled', true);
    }
    dispose() {
        for (const s of this.subscriptions) {
            s.dispose();
        }
    }
}
