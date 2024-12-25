import { EventEmitter, commands, window, workspace } from 'vscode';
import { LeanClient } from '../leanclient';
import { UntitledUri, getWorkspaceFolderUri, toExtUri } from './exturi';
import { logger } from './logger';
import { displayError } from './notifs';
import { findLeanProjectRoot } from './projectInfo';
// This class ensures we have one LeanClient per folder.
export class LeanClientProvider {
    checkLean4ProjectPreconditions;
    setupClient;
    subscriptions = [];
    outputChannel;
    installer;
    clients = new Map();
    pending = new Map();
    pendingInstallChanged = [];
    processingInstallChanged = false;
    activeClient = undefined;
    progressChangedEmitter = new EventEmitter();
    progressChanged = this.progressChangedEmitter.event;
    clientAddedEmitter = new EventEmitter();
    clientAdded = this.clientAddedEmitter.event;
    clientRemovedEmitter = new EventEmitter();
    clientRemoved = this.clientRemovedEmitter.event;
    clientStoppedEmitter = new EventEmitter();
    clientStopped = this.clientStoppedEmitter.event;
    constructor(installer, outputChannel, checkLean4ProjectPreconditions, setupClient) {
        this.checkLean4ProjectPreconditions = checkLean4ProjectPreconditions;
        this.setupClient = setupClient;
        this.outputChannel = outputChannel;
        this.installer = installer;
        // we must setup the installChanged event handler first before any didOpenEditor calls.
        this.subscriptions.push(installer.installChanged(async (uri) => await this.onInstallChanged(uri)));
        window.visibleTextEditors.forEach(e => this.didOpenEditor(e.document));
        this.subscriptions.push(window.onDidChangeActiveTextEditor(async (e) => {
            if (!e) {
                return;
            }
            await this.didOpenEditor(e.document);
        }));
        this.subscriptions.push(commands.registerCommand('lean4.restartFile', () => this.restartFile()), commands.registerCommand('lean4.refreshFileDependencies', () => this.restartFile()), commands.registerCommand('lean4.restartServer', () => this.restartActiveClient()), commands.registerCommand('lean4.stopServer', () => this.stopActiveClient()));
        this.subscriptions.push(workspace.onDidOpenTextDocument(document => this.didOpenEditor(document)));
        this.subscriptions.push(workspace.onDidChangeWorkspaceFolders(event => {
            // Remove all clients that are not referenced by any folder anymore
            if (event.removed.length === 0) {
                return;
            }
            this.clients.forEach((client, key) => {
                if (client.folderUri.scheme === 'untitled' || getWorkspaceFolderUri(client.folderUri)) {
                    return;
                }
                logger.log(`[ClientProvider] onDidChangeWorkspaceFolders removing client for ${key}`);
                this.clients.delete(key);
                client.dispose();
                this.clientRemovedEmitter.fire(client);
            });
        }));
    }
    getActiveClient() {
        return this.activeClient;
    }
    async onInstallChanged(uri) {
        // Uri is a package Uri in the case a lean package file was changed.
        logger.log(`[ClientProvider] installChanged for ${uri}`);
        this.pendingInstallChanged.push(uri);
        if (this.processingInstallChanged) {
            // avoid re-entrancy.
            return;
        }
        this.processingInstallChanged = true;
        while (true) {
            const uri = this.pendingInstallChanged.pop();
            if (!uri) {
                break;
            }
            try {
                const projectUri = await findLeanProjectRoot(uri);
                if (projectUri === 'FileNotFound') {
                    continue;
                }
                const preconditionCheckResult = await this.checkLean4ProjectPreconditions(this.outputChannel, projectUri);
                if (preconditionCheckResult !== 'Fatal') {
                    logger.log('[ClientProvider] got lean version 4');
                    const [cached, client] = await this.ensureClient(uri);
                    if (cached && client) {
                        await client.restart();
                        logger.log('[ClientProvider] restart complete');
                    }
                }
            }
            catch (e) {
                logger.log(`[ClientProvider] Exception checking lean version: ${e}`);
            }
        }
        this.processingInstallChanged = false;
    }
    restartFile() {
        if (!this.activeClient || !this.activeClient.isRunning()) {
            displayError('No active client.');
            return;
        }
        if (!window.activeTextEditor || window.activeTextEditor.document.languageId !== 'lean4') {
            displayError('No active Lean editor tab. Make sure to focus the Lean editor tab for which you want to issue a restart.');
            return;
        }
        void this.activeClient.restartFile(window.activeTextEditor.document);
    }
    stopActiveClient() {
        if (this.activeClient && this.activeClient.isStarted()) {
            void this.activeClient?.stop();
        }
    }
    async restartActiveClient() {
        void this.activeClient?.restart();
    }
    clientIsStarted() {
        void this.activeClient?.isStarted();
    }
    async didOpenEditor(document) {
        // bail as quickly as possible on non-lean files.
        if (document.languageId !== 'lean4') {
            return;
        }
        const uri = toExtUri(document.uri);
        if (uri === undefined) {
            return;
        }
        await this.ensureClient(uri);
    }
    // Find the client for a given document.
    findClient(path) {
        const candidates = this.getClients().filter(client => client.isInFolderManagedByThisClient(path));
        // All candidate folders are a prefix of `path`, so they must necessarily be prefixes of one another
        // => the best candidate (the most top-level client folder) is just the one with the shortest path
        let bestCandidate;
        for (const candidate of candidates) {
            if (!bestCandidate) {
                bestCandidate = candidate;
                continue;
            }
            const folder = candidate.getClientFolder();
            const bestFolder = bestCandidate.getClientFolder();
            if (folder.scheme === 'file' &&
                bestFolder.scheme === 'file' &&
                folder.fsPath.length < bestFolder.fsPath.length) {
                bestCandidate = candidate;
            }
        }
        return bestCandidate;
    }
    getClients() {
        return Array.from(this.clients.values());
    }
    getClientForFolder(folder) {
        return this.clients.get(folder.toString());
    }
    // Starts a LeanClient if the given file is in a new workspace we haven't seen before.
    // Returns a boolean "true" if the LeanClient was already created.
    // Returns a null client if it turns out the new workspace is a lean3 workspace.
    async ensureClient(uri) {
        const folderUri = uri.scheme === 'file' ? await findLeanProjectRoot(uri) : new UntitledUri();
        if (folderUri === 'FileNotFound') {
            return [false, undefined];
        }
        let client = this.getClientForFolder(folderUri);
        if (client) {
            this.activeClient = client;
            return [true, client];
        }
        const key = folderUri.toString();
        if (this.pending.has(key)) {
            return [false, undefined];
        }
        this.pending.set(key, true);
        const preconditionCheckResult = await this.checkLean4ProjectPreconditions(this.outputChannel, folderUri);
        if (preconditionCheckResult === 'Fatal') {
            this.pending.delete(key);
            return [false, undefined];
        }
        logger.log('[ClientProvider] Creating LeanClient for ' + folderUri.toString());
        const elanDefaultToolchain = await this.installer.getElanDefaultToolchain(folderUri);
        client = new LeanClient(folderUri, this.outputChannel, elanDefaultToolchain, this.setupClient);
        this.subscriptions.push(client);
        this.clients.set(key, client);
        client.serverFailed(err => {
            this.clients.delete(key);
            client.dispose();
            displayError(err);
        });
        client.stopped(reason => {
            this.clientStoppedEmitter.fire([client, client === this.activeClient, reason]);
        });
        // aggregate progress changed events.
        client.progressChanged(arg => {
            this.progressChangedEmitter.fire(arg);
        });
        this.pending.delete(key);
        this.clientAddedEmitter.fire(client);
        await client.start();
        // tell the InfoView about this activated client.
        this.activeClient = client;
        return [false, client];
    }
    dispose() {
        for (const s of this.subscriptions) {
            s.dispose();
        }
    }
}
