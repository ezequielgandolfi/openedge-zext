import * as vscode from 'vscode';
import { initDocumentController } from './documentController';
import { hideStatusBar, initDiagnostic, updateStatusBar, initStatusBar } from './notification';
import { KeyBindingExtension } from './keyBindingExtension';
import { HoverExtension } from './hoverExtension';
import { DefinitionExtension } from './definitionExtension';
import { SymbolExtension } from './symbolExtension';
import { CodeCompletionExtension, loadDictDumpFiles } from './codeCompletionExtension';
import { ABLCommandExtension } from './ablCommandExtension';
import { ExternalCommandExtension } from './externalCommandExtension';
import { ExtensionConfig } from './extensionConfig';
import { FormatExtension } from './formatExtension';
import { ABL_MODE } from './environment';
import { ABLCheckSyntax } from './ablCommand';

export function activate(ctx: vscode.ExtensionContext): void {
    new ExtensionConfig();
    
    initOnSaveWatcher(ctx);
    initOnCloseWatcher(ctx);
    initOnChangeActiveTextWatcher(ctx);

    startDictWatcher();
    startDocumentWatcher(ctx);
    attachExtensions(ctx);
    initDiagnostic(ctx);
    initStatusBar(ctx);
}

function deactivate() {
}

function initOnSaveWatcher(context: vscode.ExtensionContext) {
    vscode.workspace.onDidSaveTextDocument(document => hideStatusBar(document.uri.fsPath));

    let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
    if (ablConfig.get('checkSyntaxOnSave') === 'file') {
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.languageId !== ABL_MODE.language) {
                return;
            }
            new ABLCheckSyntax().execute(document);
        }, null, context.subscriptions);
    }
}

function initOnCloseWatcher(context: vscode.ExtensionContext) {
    vscode.workspace.onDidCloseTextDocument(document => hideStatusBar(document.uri.fsPath));
}

function initOnChangeActiveTextWatcher(context: vscode.ExtensionContext) {
    vscode.window.onDidChangeActiveTextEditor(editor => updateStatusBar());
}

function startDictWatcher() {
    loadDictDumpFiles();
}

function startDocumentWatcher(context: vscode.ExtensionContext) {
    initDocumentController(context);
}

function attachExtensions(context: vscode.ExtensionContext) {
    CodeCompletionExtension.attach(context);
    HoverExtension.attach(context);
    DefinitionExtension.attach(context);
    SymbolExtension.attach(context);
    
    KeyBindingExtension.attach(context);
    FormatExtension.attach(context);
    ABLCommandExtension.attach(context);
    ExternalCommandExtension.attach(context);
}
