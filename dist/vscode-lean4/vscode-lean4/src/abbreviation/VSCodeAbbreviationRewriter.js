import { AbbreviationRewriter, Range, } from '@leanprover/unicode-input';
import { Range as LineColRange, Selection, commands, extensions, window, workspace, } from 'vscode';
/**
 * Tracks abbreviations in a given text editor and replaces them when dynamically.
 */
export class VSCodeAbbreviationRewriter {
    config;
    abbreviationProvider;
    outputChannel;
    textEditor;
    selectionMoveMoveOverride;
    disposables = new Array();
    rewriter;
    decorationType = window.createTextEditorDecorationType({
        textDecoration: 'underline',
    });
    firstOutput = true;
    isVimExtensionInstalled = false;
    checkIsVimExtensionInstalled() {
        this.isVimExtensionInstalled = extensions.getExtension('vscodevim.vim') !== undefined;
    }
    constructor(config, abbreviationProvider, outputChannel, textEditor, selectionMoveMoveOverride) {
        this.config = config;
        this.abbreviationProvider = abbreviationProvider;
        this.outputChannel = outputChannel;
        this.textEditor = textEditor;
        this.selectionMoveMoveOverride = selectionMoveMoveOverride;
        this.rewriter = new AbbreviationRewriter(config, abbreviationProvider, this);
        this.disposables.push(this.decorationType);
        this.disposables.push(workspace.onDidChangeTextDocument(async (e) => {
            if (e.document !== this.textEditor.document) {
                return;
            }
            const changes = e.contentChanges.map(changeEvent => ({
                range: new Range(changeEvent.rangeOffset, changeEvent.rangeLength),
                newText: changeEvent.text,
            }));
            this.rewriter.changeInput(changes);
            // Wait for changes to take effect
            await new Promise(resolve => setTimeout(resolve, 0));
            await this.rewriter.triggerAbbreviationReplacement();
            this.updateState();
        }));
        this.disposables.push(window.onDidChangeTextEditorSelection(async (e) => {
            if (e.textEditor.document !== this.textEditor.document) {
                return;
            }
            const selections = e.selections.map(s => fromVsCodeRange(s, e.textEditor.document));
            await this.rewriter.changeSelections(selections);
            this.updateState();
        }));
        this.checkIsVimExtensionInstalled();
        this.disposables.push(extensions.onDidChange(_ => this.checkIsVimExtensionInstalled()));
    }
    writeError(e) {
        this.outputChannel.appendLine(e);
        if (this.firstOutput) {
            this.outputChannel.show(true);
            this.firstOutput = false;
        }
    }
    selectionMoveMode() {
        return (this.selectionMoveMoveOverride ?? {
            kind: 'OnlyMoveCursorSelections',
            updateUnchangedSelections: this.isVimExtensionInstalled,
        });
    }
    collectSelections() {
        return this.textEditor.selections.map(s => fromVsCodeRange(s, this.textEditor.document));
    }
    setSelections(selections) {
        this.textEditor.selections = selections.map(s => {
            const vr = toVsCodeRange(s, this.textEditor.document);
            return new Selection(vr.start, vr.end);
        });
    }
    async replaceAbbreviations(changes) {
        let ok = false;
        let retries = 0;
        try {
            // The user may have changed the text document in-between `this.textEditor` being updated
            // (when the call to the extension was started) and `this.textEditor.edit()` being executed.
            // In this case, since the state of the editor that the extension sees and the state that
            // the user sees are different, VS Code will reject the edit.
            // This occurs especially often in setups with increased latency until the extension is triggered,
            // e.g. an SSH setup. Since VS Code does not appear to support an atomic read -> write operation,
            // unfortunately the only thing we can do here is to retry.
            while (!ok && retries < 10) {
                ok = await this.textEditor.edit(builder => {
                    for (const c of changes) {
                        builder.replace(toVsCodeRange(c.range, this.textEditor.document), c.newText);
                    }
                });
                retries++;
            }
        }
        catch (e) {
            // The 'not possible on closed editors' error naturally occurs when we attempt to replace abbreviations as the user
            // is switching away from the active tab.
            if (!(e instanceof Error) || e.message !== 'TextEditor#edit not possible on closed editors') {
                this.writeError('Error while replacing abbreviation: ' + e);
            }
        }
        return ok;
    }
    async replaceAllTrackedAbbreviations() {
        await this.rewriter.replaceAllTrackedAbbreviations();
        this.updateState();
    }
    updateState() {
        const trackedAbbreviations = this.rewriter.getTrackedAbbreviations();
        this.textEditor.setDecorations(this.decorationType, [...trackedAbbreviations].map(a => toVsCodeRange(a.range, this.textEditor.document)));
        void this.setInputActive(trackedAbbreviations.size > 0);
    }
    async setInputActive(isActive) {
        await commands.executeCommand('setContext', 'lean4.input.isActive', isActive);
    }
    dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
function fromVsCodeRange(range, doc) {
    const start = doc.offsetAt(range.start);
    const end = doc.offsetAt(range.end);
    return new Range(start, end - start);
}
function toVsCodeRange(range, doc) {
    const start = doc.positionAt(range.offset);
    const end = doc.positionAt(range.offsetEnd + 1);
    return new LineColRange(start, end);
}
