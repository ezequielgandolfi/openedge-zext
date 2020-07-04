import * as vscode from 'vscode';
import { initDocumentController } from './legacyDocumentController';
import { hideStatusBar, initDiagnostic, updateStatusBar, initStatusBar } from './notification';
import { KeyBindingExtension } from './keyBindingExtension';
import { HoverExtension } from './hoverExtension';
import { DefinitionExtension } from './definitionExtension';
import { SymbolExtension } from './symbolExtension';
import { LegacyCodeCompletionExtension, loadDictDumpFiles } from './legacyCodeCompletionExtension';
import { ABLCommandExtension } from './ablCommandExtension';
import { ExternalCommandExtension } from './externalCommandExtension';
import { ExtensionConfig } from './extensionConfig';
import { FormatExtension } from './formatExtension';
import { ABL_MODE } from './environment';
import { ABLCheckSyntax } from './ablCommand';
import { TerminalExtension } from './terminalExtension';
import { DbfController } from './dbfController';
import { CodeCompletionExtension } from './codeCompletionExtension';
import { DocumentController } from './documentController';

export function activate(context: vscode.ExtensionContext): void {
    new ExtensionConfig(context);

    initControllers(context);
    
    initOnSaveWatcher(context);
    initOnCloseWatcher(context);
    initOnChangeActiveTextWatcher(context);

    startDictWatcher();
    startDocumentWatcher(context);
    attachExtensions(context);
    initDiagnostic(context);
    initStatusBar(context);
}

function deactivate() {
}

function initControllers(context: vscode.ExtensionContext) {
    context.subscriptions.push(DbfController.getInstance());
    context.subscriptions.push(DocumentController.getInstance());
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
    LegacyCodeCompletionExtension.attach(context);
    CodeCompletionExtension.attach(context);
    HoverExtension.attach(context);
    DefinitionExtension.attach(context);
    SymbolExtension.attach(context);
    
    KeyBindingExtension.attach(context);
    FormatExtension.attach(context);
    ABLCommandExtension.attach(context);
    ExternalCommandExtension.attach(context);
    TerminalExtension.attach(context);
}
