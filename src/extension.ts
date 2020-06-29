import * as vscode from 'vscode';
import { execCheckSyntax } from './ablCheckSyntax';
import { ABLFormattingProvider as ABLFormattingProvider } from './providers/formattingProvider';
import { initDocumentController } from './documentController';
import { ABL_MODE } from './environment';
import { hideStatusBar, initDiagnostic, updateStatusBar, initStatusBar } from './notification';
import { KeyBindingProvider } from './providers/keyBindingProvider';
import { ABLHoverProvider } from './providers/hoverProvider';
import { ABLDefinitionProvider } from './providers/definitionProvider';
import { ABLSymbolProvider } from './providers/symbolProvider';
import { ABLCodeCompletionProvider, loadDictDumpFiles } from './providers/codeCompletionProvider';
import { CommandProvider } from './providers/commandProvider';
import { ExternalCommandProvider } from './providers/externalCommandProvider';
import { ExtensionConfig } from './extensionConfig';

export function activate(ctx: vscode.ExtensionContext): void {
	new ExtensionConfig();
	
    initOnSaveWatcher(ctx);
    initOnCloseWatcher(ctx);
    initOnChangeActiveTextWatcher(ctx);

	startDictWatcher();
	startDocumentWatcher(ctx);
	initProviders(ctx);
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
			execCheckSyntax(document, ablConfig);
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

function initProviders(context: vscode.ExtensionContext) {
	new ABLCodeCompletionProvider(context);
	new ABLHoverProvider(context);
	new ABLDefinitionProvider(context);
	new ABLSymbolProvider(context);
    new ABLFormattingProvider(context);
    
	new KeyBindingProvider(context);
	new CommandProvider(context);
	new ExternalCommandProvider(context);
}
