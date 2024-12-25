import "vscode/localExtensionHost";
import { LeanClientProvider } from "./vscode-lean4/vscode-lean4/src/utils/clientProvider";
import { Uri, workspace } from "vscode";
import { InfoProvider } from "./vscode-lean4/vscode-lean4/src/infoview";
import { AbbreviationFeature } from "./vscode-lean4/vscode-lean4/src/abbreviation/AbbreviationFeature";
import { LeanTaskGutter } from "./vscode-lean4/vscode-lean4/src/taskgutter";
import { IFrameInfoWebviewFactory } from "./infowebview";
import { setupMonacoClient } from "./monacoleanclient";
import { checkLean4ProjectPreconditions } from "./preconditions";
import { initialize, getService, IThemeService, IConfigurationService, } from "vscode/services";
import getConfigurationServiceOverride from "@codingame/monaco-vscode-configuration-service-override";
import getTextmateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getModelServiceOverride from "@codingame/monaco-vscode-model-service-override";
import { registerExtension, } from "vscode/extensions";
import { DisposableStore } from "vscode/monaco";
import packageJson from "./vscode-lean4/vscode-lean4/package.json";
export class LeanMonaco {
    ready;
    whenReady = new Promise((resolve) => {
        this.ready = resolve;
    });
    static activeInstance = null;
    registerFileUrlResults = new DisposableStore();
    extensionRegisterResult;
    clientProvider;
    infoProvider;
    iframeWebviewFactory;
    abbreviationFeature;
    taskGutter;
    infoviewEl;
    disposed = false;
    async start(options) {
        console.debug("[LeanMonaco]: starting");
        if (LeanMonaco.activeInstance == this) {
            console.warn("[LeanMonaco]: A LeanMonaco instance cannot be started twice.");
            return;
        }
        if (LeanMonaco.activeInstance) {
            console.warn("[LeanMonaco]: There can only be one active LeanMonaco instance at a time. Disposing previous instance.");
            LeanMonaco.activeInstance?.dispose();
        }
        LeanMonaco.activeInstance = this;
        if (!window.MonacoEnvironment) {
            console.debug("[LeanMonaco]: setting monaco environment");
            const workerLoaders = {
                editorWorkerService: () => new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), { type: "module" }),
                textMateWorker: () => new Worker(new URL("@codingame/monaco-vscode-textmate-service-override/worker", import.meta.url), { type: "module" }),
            };
            window.MonacoEnvironment = {
                getWorker: function (moduleId, label) {
                    const workerFactory = workerLoaders[label];
                    if (workerFactory != null) {
                        return workerFactory();
                    }
                    throw new Error(`Unimplemented worker ${label} (${moduleId})`);
                },
            };
            await initialize({
                ...getTextmateServiceOverride(),
                ...getThemeServiceOverride(),
                ...getConfigurationServiceOverride(),
                ...getLanguagesServiceOverride(),
                ...getModelServiceOverride(),
            }, 
            // The wrapper HTML element determines the extend of certain monaco features
            // such as the right-click context menu.
            options.htmlElement ?? undefined, {
                workspaceProvider: {
                    trusted: true,
                    workspace: {
                        workspaceUri: Uri.file("/workspace.code-workspace"),
                    },
                    async open() {
                        return false;
                    },
                },
            });
            console.debug("[LeanMonaco]: done initializing");
        }
        await (await import("@codingame/monaco-vscode-theme-defaults-default-extension")).whenReady;
        if (this.disposed) {
            console.debug("[LeanMonaco]: is disposed (A)");
            return;
        }
        this.extensionRegisterResult = registerExtension(this.getExtensionManifest(), 1 /* ExtensionHostKind.LocalProcess */);
        for (const entry of this.getExtensionFiles()) {
            const registerFileUrlResult = this.extensionRegisterResult.registerFileUrl(entry[0], entry[1].href);
            this.registerFileUrlResults.add(registerFileUrlResult);
        }
        await this.extensionRegisterResult.whenReady();
        if (this.disposed) {
            console.debug("[LeanMonaco]: is disposed (B)");
            return;
        }
        const themeService = await getService(IThemeService);
        const configurationService = await getService(IConfigurationService);
        if (this.disposed) {
            console.debug("[LeanMonaco]: is disposed (C)");
            return;
        }
        this.updateVSCodeOptions(options.vscode ?? {});
        this.abbreviationFeature = new AbbreviationFeature({}, {
            kind: "MoveAllSelections",
        });
        this.clientProvider = new LeanClientProvider({
            installChanged: () => {
                return { dispose: () => { } };
            },
            testLeanVersion: () => {
                return "lean4/stable";
            },
            getElanDefaultToolchain: () => {
                return "lean4/stable";
            },
        }, { appendLine: () => { } }, checkLean4ProjectPreconditions, setupMonacoClient(this.getWebSocketOptions(options)));
        const asAbsolutePath = (path) => {
            switch (path) {
                // url.pathToFileURL
                case "media/progress-light.svg":
                    return Uri.parse(`${new URL("./vscode-lean4/vscode-lean4/media/progress-light.svg", import.meta.url)}`);
                case "media/progress-dark.svg":
                    return Uri.parse(`${new URL("./vscode-lean4/vscode-lean4/media/progress-dark.svg", import.meta.url)}`);
                case "media/progress-error-light.svg":
                    return Uri.parse(`${new URL("./vscode-lean4/vscode-lean4/media/progress-error-light.svg", import.meta.url)}`);
                case "media/progress-error-dark.svg":
                    return Uri.parse(`${new URL("./vscode-lean4/vscode-lean4/media/progress-error-dark.svg", import.meta.url)}`);
            }
        };
        this.taskGutter = new LeanTaskGutter(this.clientProvider, {
            asAbsolutePath: asAbsolutePath,
        });
        // Load fonts
        const fontFiles = [
            new FontFace("JuliaMono", `url(${new URL("./fonts/JuliaMono-Regular.ttf", import.meta.url)})`),
            new FontFace("Noto Color Emoji", `url(${new URL("./fonts/NotoColorEmoji-Regular.ttf", import.meta.url)})`),
            // new FontFace(
            //   "LeanWeb",
            //   `url(${new URL("./fonts/LeanWeb-Regular.otf", import.meta.url)})`,
            // )
        ];
        fontFiles.map((font) => {
            document.fonts.add(font);
        });
        this.iframeWebviewFactory = new IFrameInfoWebviewFactory(themeService, configurationService, fontFiles);
        if (this.infoviewEl)
            this.iframeWebviewFactory.setInfoviewElement(this.infoviewEl);
        this.infoProvider = new InfoProvider(this.clientProvider, { language: "lean4" }, {}, this.iframeWebviewFactory);
        // Wait for all fonts to be loaded
        await Promise.all(fontFiles.map((font) => font.load()));
        // Here we provide default options for the editor. They can be overwritten by the user.
        this.updateVSCodeOptions({
            // Layout options, trying to maximise the usable space of the code editor
            "editor.lineNumbers": "on",
            "editor.stickyScroll.enabled": false,
            "editor.folding": false,
            "editor.minimap.enabled": false,
            // features useful for Lean
            "editor.glyphMargin": true, // Shows the yellow/red task gutter on the left.
            "editor.semanticHighlighting.enabled": true,
            "editor.lightbulb.enabled": "on",
            "editor.detectIndentation": false, // rather, indentation in Lean is always 2
            "editor.acceptSuggestionOnEnter": "off", // since there are plenty suggestions
            // other options
            "editor.renderWhitespace": "trailing",
            "editor.fontFamily": "'JuliaMono', 'Noto Color Emoji'",
            "editor.wordWrap": "on",
            "editor.wrappingStrategy": "advanced",
            "workbench.colorTheme": "Visual Studio Light",
            ...options.vscode,
        });
        if (this.disposed) {
            console.debug("[LeanMonaco]: is disposed (D)");
            return;
        }
        console.info("[LeanMonaco]: is ready!");
        this.ready();
    }
    /** Update options of the editor */
    updateVSCodeOptions(vsCodeOptions) {
        for (const key in vsCodeOptions) {
            workspace.getConfiguration().update(key, vsCodeOptions[key]);
        }
    }
    setInfoviewElement(infoviewEl) {
        if (this.iframeWebviewFactory)
            this.iframeWebviewFactory.setInfoviewElement(infoviewEl);
        this.infoviewEl = infoviewEl;
    }
    getExtensionFiles() {
        const extensionFiles = new Map();
        extensionFiles.set("/language-configuration.json", new URL("./vscode-lean4/vscode-lean4/language-configuration.json", import.meta.url));
        extensionFiles.set("/syntaxes/lean4.json", new URL("./vscode-lean4/vscode-lean4/syntaxes/lean4.json", import.meta.url));
        extensionFiles.set("/syntaxes/lean4-markdown.json", new URL("./vscode-lean4/vscode-lean4/syntaxes/lean4-markdown.json", import.meta.url));
        extensionFiles.set("/syntaxes/codeblock.json", new URL("./vscode-lean4/vscode-lean4/syntaxes/codeblock.json", import.meta.url));
        extensionFiles.set("/themes/cobalt2.json", new URL("./themes/cobalt2.json", import.meta.url));
        return extensionFiles;
    }
    /** This basically returns the `package.json` of `vscode-lean4` with some ts-fixes and the custom themes. */
    getExtensionManifest() {
        return {
            ...packageJson,
            contributes: {
                ...packageJson.contributes,
                configuration: packageJson.contributes.configuration, // Apparently `IExtensionContributions.configuration` has type `any`
                // TODO: This is suspect, the thrid entry does not have "language", yet it doesn't complain
                // look into that.
                grammars: packageJson.contributes.grammars,
                // Somehow `submenu` is incompatible. Since we don't use that anyways we just drop
                // `menus` and `submenus` from the package.json
                menus: undefined,
                submenus: undefined,
                // Add custom themes here.
                themes: [
                    {
                        id: "Cobalt",
                        label: "Cobalt",
                        uiTheme: "vs",
                        path: "./themes/cobalt2.json",
                    },
                ],
            },
            extensionKind: packageJson.extensionKind,
        };
    }
    getWebSocketOptions(options) {
        return {
            $type: "WebSocketUrl",
            startOptions: {
                onCall: () => {
                    console.log("Connected to socket.");
                },
                reportStatus: true,
            },
            stopOptions: {
                onCall: () => {
                    console.log("Disconnected from socket.");
                },
                reportStatus: true,
            },
            ...options.websocket,
        };
    }
    /** Restarting all clients.
     * Note: I think with the current implementation, there is always just one client
     * (is that true?), but the vscode-extension is designed for more.
     */
    restart() {
        this.clientProvider?.getClients().map((client) => {
            client.restart();
        });
    }
    dispose() {
        if (LeanMonaco.activeInstance == this) {
            LeanMonaco.activeInstance = null;
        }
        this.registerFileUrlResults?.dispose();
        this.registerFileUrlResults = new DisposableStore();
        this.extensionRegisterResult?.dispose();
        this.extensionRegisterResult = undefined;
        this.disposed = true;
        this.infoProvider?.dispose();
        this.infoProvider = undefined;
        this.taskGutter?.dispose();
        this.taskGutter = undefined;
        this.clientProvider?.dispose();
        this.clientProvider = undefined;
        this.abbreviationFeature?.dispose();
        this.abbreviationFeature = undefined;
    }
}
