import { LeanFileProgressKind } from '@leanprover/infoview-api';
import { OverviewRulerLane, Range, window } from 'vscode';
class LeanFileTaskGutter {
    uri;
    decorations;
    processed;
    timeout;
    constructor(uri, decorations, processed) {
        this.uri = uri;
        this.decorations = decorations;
        this.processed = processed;
        this.schedule(100);
    }
    setProcessed(processed) {
        if (processed === this.processed)
            return;
        const oldProcessed = this.processed;
        this.processed = processed;
        if (processed === undefined) {
            this.processed = [];
            this.clearTimeout();
            this.updateDecos();
        }
        else if (this.timeout === undefined) {
            this.schedule(oldProcessed === undefined ? 500 : 20);
        }
    }
    schedule(ms) {
        this.timeout = setTimeout(() => {
            this.timeout = undefined;
            this.updateDecos();
        }, ms);
    }
    clearTimeout() {
        if (this.timeout !== undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }
    updateDecos() {
        for (const editor of window.visibleTextEditors) {
            if (editor.document.uri.toString() === this.uri) {
                for (const [kind, [decoration, message]] of this.decorations) {
                    editor.setDecorations(decoration, this.processed
                        .filter(info => (info.kind === undefined ? LeanFileProgressKind.Processing : info.kind) === kind)
                        .map(info => ({
                        range: new Range(info.range.start.line, 0, info.range.end.line, 0),
                        hoverMessage: message,
                    })));
                }
            }
        }
    }
    dispose() {
        this.clearTimeout();
    }
}
export class LeanTaskGutter {
    decorations = new Map();
    status = {};
    gutters = {};
    subscriptions = [];
    constructor(client, context) {
        this.decorations.set(LeanFileProgressKind.Processing, [
            window.createTextEditorDecorationType({
                overviewRulerLane: OverviewRulerLane.Left,
                overviewRulerColor: 'rgba(255, 165, 0, 0.5)',
                dark: {
                    gutterIconPath: context.asAbsolutePath('media/progress-dark.svg'),
                },
                light: {
                    gutterIconPath: context.asAbsolutePath('media/progress-light.svg'),
                },
                gutterIconSize: 'contain',
            }),
            'busily processing...',
        ]);
        this.decorations.set(LeanFileProgressKind.FatalError, [
            window.createTextEditorDecorationType({
                overviewRulerLane: OverviewRulerLane.Left,
                overviewRulerColor: 'rgba(255, 0, 0, 0.5)',
                dark: {
                    gutterIconPath: context.asAbsolutePath('media/progress-error-dark.svg'),
                },
                light: {
                    gutterIconPath: context.asAbsolutePath('media/progress-error-light.svg'),
                },
                gutterIconSize: 'contain',
            }),
            'processing stopped',
        ]);
        this.subscriptions.push(window.onDidChangeVisibleTextEditors(() => this.updateDecos()), client.progressChanged(([uri, processing]) => {
            this.status[uri] = processing;
            this.updateDecos();
        }));
    }
    updateDecos() {
        const uris = {};
        for (const editor of window.visibleTextEditors) {
            if (editor.document.languageId !== 'lean4')
                continue;
            const uri = editor.document.uri.toString();
            uris[uri] = true;
            const processed = uri in this.status ? this.status[uri] : [];
            if (this.gutters[uri]) {
                const gutter = this.gutters[uri];
                if (gutter)
                    gutter.setProcessed(processed);
            }
            else {
                this.gutters[uri] = new LeanFileTaskGutter(uri, this.decorations, processed);
            }
        }
        for (const uri of Object.getOwnPropertyNames(this.gutters)) {
            if (!uris[uri]) {
                this.gutters[uri]?.dispose();
                this.gutters[uri] = undefined;
                // TODO: also clear this.status for this uri ?
            }
        }
    }
    dispose() {
        for (const [decoration, _message] of this.decorations.values()) {
            decoration.dispose();
        }
        for (const s of this.subscriptions) {
            s.dispose();
        }
    }
}
