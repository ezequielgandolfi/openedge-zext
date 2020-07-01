import * as vscode from 'vscode';
import { initDocumentController } from './documentController';
import { hideStatusBar, initDiagnostic, updateStatusBar, initStatusBar } from './notification';
import { KeyBindingProvider } from './providers/keyBindingProvider';
import { HoverProvider } from './providers/hoverProvider';
import { DefinitionProvider } from './providers/definitionProvider';
import { SymbolProvider } from './providers/symbolProvider';
import { CodeCompletionProvider, loadDictDumpFiles } from './providers/codeCompletionProvider';
import { CommandProvider } from './providers/commandProvider';
import { ExternalCommandProvider } from './providers/externalCommandProvider';
import { ExtensionConfig } from './extensionConfig';
import { FormatProvider } from './providers/formatProvider';
import { ABL_MODE } from './environment';
import { ABLCheckSyntax } from './ablCommand';

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

function initProviders(context: vscode.ExtensionContext) {
	new CodeCompletionProvider(context);
	new HoverProvider(context);
	new DefinitionProvider(context);
	new SymbolProvider(context);
    
	new KeyBindingProvider(context);
	new CommandProvider(context);
	new ExternalCommandProvider(context);
	new FormatProvider(context);
}
