/**
 * For LSP communication, we need a way to translate between LSP types and corresponding VSCode types.
 * By default this translation is provided as a bunch of methods on a `LanguageClient`, but this is
 * awkward to use in multi-client workspaces wherein we need to look up specific clients. In fact the
 * conversions are *not* stateful, so having them depend on the client is unnecessary. Instead, we
 * provide global converters here.
 *
 * Some of the conversions are patched to support extended Lean-specific structures.
 *
 * @module
 */
import { Code2ProtocolConverter, DidOpenTextDocumentParams, Protocol2CodeConverter } from 'vscode-languageclient';
export declare function setDependencyBuildMode(params: DidOpenTextDocumentParams, dependencyBuildMode: 'once' | 'never'): DidOpenTextDocumentParams;
export declare const p2cConverter: Protocol2CodeConverter;
export declare const c2pConverter: Code2ProtocolConverter;
export declare function patchConverters(p2cConverter: Protocol2CodeConverter, c2pConverter: Code2ProtocolConverter): void;
