import { LanguageClientWrapper, } from "monaco-editor-wrapper";
import { displayError } from "./vscode-lean4/vscode-lean4/src/utils/notifs";
export const setupMonacoClient = (options) => {
    return async (clientOptions, folderUri, elanDefaultToolchain) => {
        const languageClientWrapper = new LanguageClientWrapper();
        await languageClientWrapper.init({
            languageClientConfig: {
                languageId: "lean4",
                options,
                clientOptions: {
                    ...clientOptions,
                    connectionOptions: {
                        ...clientOptions.connectionOptions,
                        messageStrategy: {
                            handleMessage: (message, next) => {
                                if (message.error) {
                                    // TODO: Handle Lean errors correctly
                                    displayError(message.error.message);
                                    next(message); // remove this to prevent propagating the message
                                }
                                else {
                                    next(message);
                                }
                            },
                        },
                    },
                },
            },
        });
        await languageClientWrapper?.start();
        const client = languageClientWrapper.getLanguageClient();
        client._serverProcess = { stderr: { on: () => { } } };
        return client;
    };
};
