import { Rpc } from "./vscode-lean4/vscode-lean4/src/rpc";
import { EventEmitter } from "vscode";
import * as colorUtils from 'vscode/vscode/vs/platform/theme/common/colorUtils';
import { ColorScheme } from 'vscode/vscode/vs/platform/theme/common/theme';
import * as editorOptions from 'vscode/vscode/vs/editor/common/config/editorOptions';
export class IFrameInfoWebview {
    iframe;
    rpc;
    visible = true;
    onDidDisposeEmitter = new EventEmitter();
    onDidDispose = this.onDidDisposeEmitter.event;
    api;
    constructor(iframe, rpc) {
        this.iframe = iframe;
        this.rpc = rpc;
        this.api = rpc.getApi();
    }
    dispose() {
        this.iframe.remove();
        this.onDidDisposeEmitter.fire();
    }
    reveal(viewColumn, preserveFocus) {
    }
}
export class IFrameInfoWebviewFactory {
    themeService;
    configurationService;
    fontFiles;
    infoviewElement;
    iframe;
    constructor(themeService, configurationService, fontFiles) {
        this.themeService = themeService;
        this.configurationService = configurationService;
        this.fontFiles = fontFiles;
    }
    setInfoviewElement(infoviewElement) {
        this.infoviewElement = infoviewElement;
    }
    make(editorApi, stylesheet, column) {
        this.iframe = document.createElement("iframe");
        this.infoviewElement.append(this.iframe);
        this.iframe.contentWindow.document.open();
        this.iframe.contentWindow.document.write(this.initialHtml(stylesheet));
        this.iframe.contentWindow.document.close();
        this.updateCssVars();
        this.themeService.onDidColorThemeChange(() => { this.updateCssVars(); });
        // Note that an extension can send data to its webviews using webview.postMessage().
        // This method sends any JSON serializable data to the webview. The message is received
        // inside the webview through the standard message event.
        // The receiving of these messages is done inside webview\index.ts where it
        // calls window.addEventListener('message',...
        const rpc = new Rpc(m => {
            try {
                // JSON.stringify is needed here to serialize getters such as `Position.line` and `Position.character`
                void this.iframe.contentWindow.postMessage(JSON.stringify(m));
            }
            catch (e) {
                // ignore any disposed object exceptions
            }
        });
        rpc.register(editorApi);
        // Similarly, we can received data from the webview by listening to onDidReceiveMessage.
        document.defaultView.addEventListener('message', m => {
            if (m.source != this.iframe.contentWindow) {
                return;
            }
            try {
                rpc.messageReceived(JSON.parse(m.data));
            }
            catch {
                // ignore any disposed object exceptions
            }
        });
        return new IFrameInfoWebview(this.iframe, rpc);
    }
    updateCssVars() {
        const theme = this.themeService.getColorTheme();
        const documentStyle = this.iframe.contentDocument?.documentElement.style;
        const colors = colorUtils.getColorRegistry().getColors();
        const exportedColors = colors.reduce((colors, entry) => {
            const color = theme.getColor(entry.id);
            if (color) {
                colors['vscode-' + entry.id.replace('.', '-')] = color.toString();
            }
            return colors;
        }, {});
        const EDITOR_FONT_DEFAULTS = editorOptions.EDITOR_FONT_DEFAULTS;
        const configuration = this.configurationService.getValue('editor');
        const editorFontFamily = configuration.fontFamily || EDITOR_FONT_DEFAULTS.fontFamily;
        const editorFontWeight = configuration.fontWeight || EDITOR_FONT_DEFAULTS.fontWeight;
        const editorFontSize = configuration.fontSize || EDITOR_FONT_DEFAULTS.fontSize;
        const linkUnderlines = this.configurationService.getValue('accessibility.underlineLinks');
        const styles = {
            'vscode-font-family': '\'Droid Sans Mono\', Consolas, Menlo, Monaco, \'Courier New\', monospace',
            'vscode-font-weight': 'normal',
            'vscode-font-size': '13px',
            'vscode-editor-font-family': editorFontFamily,
            'vscode-editor-font-weight': editorFontWeight,
            'vscode-editor-font-size': editorFontSize + 'px',
            'text-link-decoration': linkUnderlines ? 'underline' : 'none',
            ...exportedColors
        };
        for (const id in styles) {
            documentStyle?.setProperty(`--${id}`, styles[id]);
        }
        documentStyle?.setProperty('font-family', '-apple-system,BlinkMacSystemFont,Segoe WPC,Segoe UI,HelveticaNeue-Light,system-ui,Ubuntu,Droid Sans,sans-serif');
        this.iframe.contentDocument?.documentElement.setAttribute('class', `${this.apiThemeClassName(theme)}`);
        this.fontFiles.map(font => {
            this.iframe.contentDocument?.fonts.add(font);
        });
    }
    apiThemeClassName(theme) {
        switch (theme.type) {
            case ColorScheme.LIGHT: return 'vscode-light';
            case ColorScheme.DARK: return 'vscode-dark';
            case ColorScheme.HIGH_CONTRAST_DARK: return 'vscode-high-contrast';
            case ColorScheme.HIGH_CONTRAST_LIGHT: return 'vscode-high-contrast-light';
        }
    }
    initialHtml(stylesheet) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-type" content="text/html;charset=utf-8">
        <title>Infoview</title>
        <style>${stylesheet}</style>
        <style>
          body {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
        </style>
        <link rel="stylesheet" href="${new URL('./vscode-lean4/lean4-infoview/src/infoview/index.css', import.meta.url)}">
      </head>
      <body>
        <div id="react_root"></div>
        <script type="module" src="/infoview/webview.js"></script>
      </body>
      </html>`;
    }
}
