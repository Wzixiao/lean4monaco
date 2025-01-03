import { Disposable, DocumentHighlightKind, EventEmitter, ProgressLocation, Range, window, workspace, } from 'vscode';
import { DiagnosticSeverity, RevealOutputChannelOn, State, } from 'vscode-languageclient/node';
import { getElaborationDelay, getFallBackToStringOccurrenceHighlighting, shouldAutofocusOutput } from './config';
import { logger } from './utils/logger';
// @ts-ignore
import { SemVer } from 'semver';
import { c2pConverter, p2cConverter, patchConverters, setDependencyBuildMode } from './utils/converters';
import { parseExtUri, toExtUri } from './utils/exturi';
import { displayError, displayErrorWithOptionalInput, displayErrorWithOutput, displayInformationWithOptionalInput, } from './utils/notifs';
import path from 'path';
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export class LeanClient {
    setupClient;
    running;
    client;
    outputChannel;
    folderUri;
    subscriptions = [];
    noPrompt = false;
    showingRestartMessage = false;
    elanDefaultToolchain;
    isRestarting = false;
    staleDepNotifier;
    openServerDocuments = new Set();
    didChangeEmitter = new EventEmitter();
    didChange = this.didChangeEmitter.event;
    diagnosticsEmitter = new EventEmitter();
    diagnostics = this.diagnosticsEmitter.event;
    didSetLanguageEmitter = new EventEmitter();
    didSetLanguage = this.didSetLanguageEmitter.event;
    didCloseEmitter = new EventEmitter();
    didClose = this.didCloseEmitter.event;
    customNotificationEmitter = new EventEmitter();
    /** Fires whenever a custom notification (i.e. one not defined in LSP) is received. */
    customNotification = this.customNotificationEmitter.event;
    /** saved progress info in case infoview is opened, it needs to get all of it. */
    progress = new Map();
    progressChangedEmitter = new EventEmitter();
    progressChanged = this.progressChangedEmitter.event;
    stoppedEmitter = new EventEmitter();
    stopped = this.stoppedEmitter.event;
    restartedEmitter = new EventEmitter();
    restarted = this.restartedEmitter.event;
    restartingEmitter = new EventEmitter();
    restarting = this.restartingEmitter.event;
    restartedWorkerEmitter = new EventEmitter();
    restartedWorker = this.restartedWorkerEmitter.event;
    serverFailedEmitter = new EventEmitter();
    serverFailed = this.serverFailedEmitter.event;
    constructor(folderUri, outputChannel, elanDefaultToolchain, setupClient) {
        this.setupClient = setupClient;
        this.outputChannel = outputChannel; // can be null when opening adhoc files.
        this.folderUri = folderUri;
        this.elanDefaultToolchain = elanDefaultToolchain;
        this.subscriptions.push(new Disposable(() => {
            if (this.staleDepNotifier) {
                this.staleDepNotifier.dispose();
            }
        }));
    }
    dispose() {
        this.subscriptions.forEach(s => s.dispose());
        if (this.isStarted())
            void this.stop();
    }
    showRestartMessage(restartFile = false, uri) {
        if (this.showingRestartMessage) {
            return;
        }
        this.showingRestartMessage = true;
        const finalizer = () => {
            this.showingRestartMessage = false;
        };
        let restartItem;
        let messageTitle;
        if (!restartFile) {
            restartItem = 'Restart Lean Server';
            messageTitle = 'Lean Server has stopped unexpectedly.';
        }
        else {
            restartItem = 'Restart Lean Server on this file';
            messageTitle = 'The Lean Server has stopped processing this file.';
        }
        displayErrorWithOptionalInput(messageTitle, restartItem, () => {
            if (restartFile && uri !== undefined) {
                const document = workspace.textDocuments.find(doc => uri.equalsUri(doc.uri));
                if (document) {
                    void this.restartFile(document);
                }
            }
            else {
                void this.start();
            }
        }, finalizer);
    }
    async restart() {
        if (this.isRestarting) {
            displayError('Client is already being started.');
            return;
        }
        this.isRestarting = true;
        try {
            logger.log('[LeanClient] Restarting Lean Server');
            if (this.isStarted()) {
                await this.stop();
            }
            this.restartingEmitter.fire(undefined);
            const progressOptions = {
                location: ProgressLocation.Notification,
                title: 'Starting Lean language client',
                cancellable: false,
            };
            await window.withProgress(progressOptions, async (progress) => await this.startClient(progress));
        }
        finally {
            this.isRestarting = false;
        }
    }
    async startClient(progress) {
        // Should only be called from `restart`
        const startTime = Date.now();
        progress.report({ increment: 0 });
        this.client = await this.setupClient(this.obtainClientOptions(), this.folderUri, this.elanDefaultToolchain);
        patchConverters(this.client.protocol2CodeConverter, this.client.code2ProtocolConverter);
        let insideRestart = true;
        try {
            this.client.onDidChangeState(async (s) => {
                // see https://github.com/microsoft/vscode-languageserver-node/issues/825
                if (s.newState === State.Starting) {
                    logger.log('[LeanClient] starting');
                }
                else if (s.newState === State.Running) {
                    const end = Date.now();
                    logger.log(`[LeanClient] running, started in ${end - startTime} ms`);
                    this.running = true; // may have been auto restarted after it failed.
                    if (!insideRestart) {
                        this.restartedEmitter.fire(undefined);
                    }
                }
                else if (s.newState === State.Stopped) {
                    this.running = false;
                    logger.log('[LeanClient] has stopped or it failed to start');
                    if (!this.noPrompt) {
                        // only raise this event and show the message if we are not the ones
                        // who called the stop() method.
                        this.stoppedEmitter.fire({ message: 'Lean server has stopped.', reason: '' });
                        this.showRestartMessage();
                    }
                }
            });
            progress.report({ increment: 80 });
            await this.client.start();
            const version = this.client.initializeResult?.serverInfo?.version;
            if (version && new SemVer(version).compare('0.2.0') < 0) {
                if (this.staleDepNotifier) {
                    this.staleDepNotifier.dispose();
                }
                this.staleDepNotifier = this.diagnostics(params => this.checkForImportsOutdatedError(params));
            }
            // if we got this far then the client is happy so we are running!
            this.running = true;
        }
        catch (error) {
            const msg = '' + error;
            logger.log(`[LeanClient] restart error ${msg}`);
            this.outputChannel.appendLine(msg);
            this.serverFailedEmitter.fire(msg);
            insideRestart = false;
            return;
        }
        // HACK(WN): Register a default notification handler to fire on custom notifications.
        // A mechanism to do this is provided in vscode-jsonrpc. One can register a `StarNotificationHandler`
        // here: https://github.com/microsoft/vscode-languageserver-node/blob/b2fc85d28a1a44c22896559ee5f4d3ba37a02ef5/jsonrpc/src/common/connection.ts#L497
        // which fires on any LSP notifications not in the standard, for example the `$/lean/..` ones.
        // However this mechanism is not exposed in vscode-languageclient, so we hack around its implementation.
        const starHandler = (method, params_) => {
            if (method === '$/lean/fileProgress' && this.client) {
                const params = params_;
                const uri = toExtUri(p2cConverter.asUri(params.textDocument.uri));
                if (uri !== undefined) {
                    this.progressChangedEmitter.fire([uri.toString(), params.processing]);
                    // save the latest progress on this Uri in case infoview needs it later.
                    this.progress.set(uri, params.processing);
                }
            }
            this.customNotificationEmitter.fire({ method, params: params_ });
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.client.onNotification(starHandler, () => { });
        // Reveal the standard error output channel when the server prints something to stderr.
        // The vscode-languageclient library already takes care of writing it to the output channel.
        let stderrMsgBoxVisible = false;
        this.client._serverProcess.stderr.on('data', async (chunk) => {
            if (shouldAutofocusOutput()) {
                this.client?.outputChannel.show(true);
            }
            else if (!stderrMsgBoxVisible) {
                stderrMsgBoxVisible = true;
                const finalizer = () => {
                    stderrMsgBoxVisible = false;
                };
                displayErrorWithOutput(`Lean server printed an error:\n${chunk.toString()}`, finalizer);
            }
        });
        this.restartedEmitter.fire(undefined);
        insideRestart = false;
    }
    checkForImportsOutdatedError(params) {
        const fileUri = parseExtUri(params.uri);
        if (fileUri === undefined) {
            return;
        }
        const fileName = fileUri.scheme === 'file' ? path.basename(fileUri.fsPath) : 'untitled';
        const isImportsOutdatedError = params.diagnostics.some(d => d.severity === DiagnosticSeverity.Error &&
            d.message.includes('Imports are out of date and must be rebuilt') &&
            d.range.start.line === 0 &&
            d.range.start.character === 0 &&
            d.range.end.line === 0 &&
            d.range.end.character === 0);
        if (!isImportsOutdatedError) {
            return;
        }
        const message = `Imports of '${fileName}' are out of date and must be rebuilt. Restarting the file will rebuild them.`;
        const input = 'Restart File';
        displayInformationWithOptionalInput(message, input, () => {
            const document = workspace.textDocuments.find(doc => fileUri.equalsUri(doc.uri));
            if (!document || document.isClosed) {
                displayError(`'${fileName}' was closed in the meantime. Imports will not be rebuilt.`);
                return;
            }
            void this.restartFile(document);
        });
    }
    async withStoppedClient(action) {
        if (this.isRestarting) {
            return 'IsRestarting';
        }
        this.isRestarting = true; // Ensure that client cannot be restarted in the mean-time
        if (this.isStarted()) {
            await this.stop();
        }
        await action();
        this.isRestarting = false;
        await this.restart();
        return 'Success';
    }
    isInFolderManagedByThisClient(uri) {
        if (this.folderUri.scheme === 'untitled' && uri.scheme === 'untitled') {
            return true;
        }
        if (this.folderUri.scheme === 'file' && uri.scheme === 'file') {
            return uri.isInFolder(this.folderUri);
        }
        return false;
    }
    getClientFolder() {
        return this.folderUri;
    }
    start() {
        return this.restart();
    }
    isStarted() {
        return this.client !== undefined;
    }
    isRunning() {
        if (this.client) {
            return this.running;
        }
        return false;
    }
    async stop() {
        if (this.client && this.running) {
            this.noPrompt = true;
            try {
                // some timing conditions can happen while running unit tests that cause
                // this to throw an exception which then causes those tests to fail.
                await this.client.stop();
            }
            catch (e) {
                logger.log(`[LeanClient] Error stopping language client: ${e}`);
            }
        }
        this.noPrompt = false;
        this.progress = new Map();
        this.client = undefined;
        this.openServerDocuments = new Set();
        this.running = false;
    }
    async restartFile(doc) {
        if (this.client === undefined || !this.running)
            return; // there was a problem starting lean server.
        const docUri = toExtUri(doc.uri);
        if (docUri === undefined) {
            return;
        }
        if (!this.isInFolderManagedByThisClient(docUri)) {
            return;
        }
        const uri = docUri.toString();
        if (!this.openServerDocuments.delete(uri)) {
            return;
        }
        logger.log(`[LeanClient] Restarting File: ${uri}`);
        await this.client.sendNotification('textDocument/didClose', this.client.code2ProtocolConverter.asCloseTextDocumentParams(doc));
        if (this.openServerDocuments.has(uri)) {
            return;
        }
        this.openServerDocuments.add(uri);
        await this.client.sendNotification('textDocument/didOpen', setDependencyBuildMode(this.client.code2ProtocolConverter.asOpenTextDocumentParams(doc), 'once'));
        this.restartedWorkerEmitter.fire(uri);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    sendRequest(method, params) {
        return this.running && this.client
            ? this.client.sendRequest(method, params)
            : new Promise((_, reject) => {
                reject('Client is not running');
            });
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    sendNotification(method, params) {
        return this.running && this.client ? this.client.sendNotification(method, params) : undefined;
    }
    getDiagnostics() {
        return this.running ? this.client?.diagnostics : undefined;
    }
    get initializeResult() {
        return this.running ? this.client?.initializeResult : undefined;
    }
    obtainClientOptions() {
        const documentSelector = {
            language: 'lean4',
        };
        let workspaceFolder;
        documentSelector.scheme = this.folderUri.scheme;
        if (this.folderUri.scheme === 'file') {
            documentSelector.pattern = `${this.folderUri.fsPath}/**/*`;
            workspaceFolder = {
                uri: this.folderUri.asUri(),
                name: path.basename(this.folderUri.fsPath),
                index: 0, // the language client library does not actually need this index
            };
        }
        return {
            outputChannel: this.outputChannel,
            revealOutputChannelOn: RevealOutputChannelOn.Never, // contrary to the name, this disables the message boxes
            documentSelector: [documentSelector],
            workspaceFolder,
            initializationOptions: {
                editDelay: getElaborationDelay(),
                hasWidgets: true,
            },
            connectionOptions: {
                maxRestartCount: 0,
                cancellationStrategy: undefined,
            },
            middleware: {
                handleDiagnostics: (uri, diagnostics, next) => {
                    next(uri, diagnostics);
                    const uri_ = c2pConverter.asUri(uri);
                    const diagnostics_ = [];
                    for (const d of diagnostics) {
                        const d_ = {
                            ...c2pConverter.asDiagnostic(d),
                        };
                        diagnostics_.push(d_);
                    }
                    this.diagnosticsEmitter.fire({ uri: uri_, diagnostics: diagnostics_ });
                },
                didOpen: async (doc, next) => {
                    const docUri = toExtUri(doc.uri);
                    if (!docUri) {
                        return; // This should never happen since the glob we launch the client for ensures that all uris are ext uris
                    }
                    // This will sometimes open invisible documents in the language server
                    // (e.g. holding `Ctrl` while hovering over an identifier will quickly emit a `didOpen` and then a `didClose` notification for the document the identifier is in).
                    // There is no good way to prevent this (c.f. https://github.com/microsoft/vscode-languageserver-node/issues/848#issuecomment-2185043021),
                    // but specifically in the case of `Ctrl`+Hover, the language server typically seems to not start expensive elaboration for the invisible document.
                    // We may however launch a new server instance if the document is in a different project (e.g. core).
                    if (this.openServerDocuments.has(docUri.toString())) {
                        return;
                    }
                    this.openServerDocuments.add(docUri.toString());
                    await next(doc);
                    // Opening the document may have set the language ID.
                    this.didSetLanguageEmitter.fire(doc.languageId);
                },
                didChange: async (data, next) => {
                    await next(data);
                    const params = c2pConverter.asChangeTextDocumentParams(data, data.document.uri, data.document.version);
                    this.didChangeEmitter.fire(params);
                },
                didClose: async (doc, next) => {
                    const docUri = toExtUri(doc.uri);
                    if (!docUri) {
                        return; // This should never happen since the glob we launch the client for ensures that all uris are ext uris
                    }
                    if (!this.openServerDocuments.delete(docUri.toString())) {
                        // Do not send `didClose` if we filtered the corresponding `didOpen` (see comment in the `didOpen` middleware).
                        // The language server is only resilient against requests for closed files, not the `didClose` notification itself.
                        return;
                    }
                    await next(doc);
                    const params = c2pConverter.asCloseTextDocumentParams(doc);
                    this.didCloseEmitter.fire(params);
                },
                provideDocumentHighlights: async (doc, pos, ctok, next) => {
                    const leanHighlights = await next(doc, pos, ctok);
                    if (leanHighlights?.length)
                        return leanHighlights;
                    // vscode doesn't fall back to textual highlights, so we
                    // need to do that manually if the user asked for it
                    if (!getFallBackToStringOccurrenceHighlighting()) {
                        return [];
                    }
                    await new Promise(res => setTimeout(res, 250));
                    if (ctok.isCancellationRequested)
                        return;
                    const wordRange = doc.getWordRangeAtPosition(pos);
                    if (!wordRange)
                        return;
                    const word = doc.getText(wordRange);
                    const highlights = [];
                    const text = doc.getText();
                    const nonWordPattern = '[`~@$%^&*()-=+\\[{\\]}⟨⟩⦃⦄⟦⟧⟮⟯‹›\\\\|;:",./\\s]|^|$';
                    const regexp = new RegExp(`(?<=${nonWordPattern})${escapeRegExp(word)}(?=${nonWordPattern})`, 'g');
                    for (const match of text.matchAll(regexp)) {
                        const start = doc.positionAt(match.index ?? 0);
                        highlights.push({
                            range: new Range(start, start.translate(0, match[0].length)),
                            kind: DocumentHighlightKind.Text,
                        });
                    }
                    return highlights;
                },
            },
        };
    }
}
