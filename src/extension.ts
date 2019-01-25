import * as vscode from 'vscode';
import { execCheckSyntax } from './ablCheckSyntax';
import { execRun } from './ablRun';
import { openDataDictionary, readDataDictionary } from './ablDataDictionary';
import { loadOpenEdgeConfig, getConfig } from './ablConfig';
import { loadDictDumpFiles } from './codeCompletion';
import { execCompile } from './ablCompile';
import { sourceDeploy } from './deploy';
import { ABLFormatter } from './formatter';
import { ABLDocumentController, initDocumentController } from './documentController';
import { OutlineNavigatorProvider } from './outlineNavigator';
import { ABL_MODE } from './environment';
import { hideStatusBar, initDiagnostic } from './notification';
import { getAllVariables } from './processDocument';

export function activate(ctx: vscode.ExtensionContext): void {
	//const symbolOutlineProvider = new OutlineNavigatorProvider(ctx);


	startBuildOnSaveWatcher(ctx.subscriptions);
	startConfigFileWatcher();
	startDictWatcher();
	startCleanStatusWatcher(ctx.subscriptions);
	//startFormatCommand(ctx.subscriptions);
	startDocumentWatcher(ctx);
	initDiagnostic(ctx);

	//vscode.workspace.getConfiguration('files').update('encoding', 'iso88591', false);
	//vscode.workspace.getConfiguration('editor').update('tabSize', 4, false);
	/*let config = vscode.workspace.getConfiguration('abl');
	config.update('editor.tabSize', 8, false);
	config.update('editor.insertSpaces', true, false);
	config.update('editor.detectIdentation', false, false);*/
	// Set default workspace
	/*let config = vscode.workspace.getConfiguration('editor');
	config.update('tabSize', 4, false);
	config.update('insertSpaces', true, false);
	config.update('detectIdentation', false, false);*/

	ctx.subscriptions.push(vscode.commands.registerCommand('abl.propath', () => {
		vscode.window.showInformationMessage('PROPATH : ' + (getConfig().proPath || ''));
	}));
	ctx.subscriptions.push(vscode.commands.registerCommand('abl.checkSyntax', () => {
		let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
		execCheckSyntax(vscode.window.activeTextEditor.document, ablConfig);
	}));
	ctx.subscriptions.push(vscode.commands.registerCommand('abl.compile', () => {
		let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
		execCompile(vscode.window.activeTextEditor.document, ablConfig);
	}));
	ctx.subscriptions.push(vscode.commands.registerCommand('abl.run.currentFile', () => {
		let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
		execRun(vscode.window.activeTextEditor.document.uri.fsPath, ablConfig);
	}));
	ctx.subscriptions.push(vscode.commands.registerCommand('abl.deploy.currentFile', () => {
		sourceDeploy(vscode.window.activeTextEditor.document.uri.fsPath);
	}));
	ctx.subscriptions.push(vscode.commands.registerCommand('abl.dataDictionary', () => {
		// let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
		openDataDictionary();
	}));

	ctx.subscriptions.push(vscode.commands.registerCommand('abl.dictionary.read', () => {
		let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
		readDataDictionary(ablConfig);
	}));

	ctx.subscriptions.push(vscode.commands.registerCommand('abl.prototype', () => {
		getAllVariables(vscode.window.activeTextEditor.document);
	}));
}

function deactivate() {
}

function startBuildOnSaveWatcher(subscriptions: vscode.Disposable[]) {
	let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
	if (ablConfig.get('checkSyntaxOnSave') === 'file') {
		vscode.workspace.onDidSaveTextDocument(document => {
			if (document.languageId !== ABL_MODE.language) {
				return;
			}
			execCheckSyntax(document, ablConfig);
		}, null, subscriptions);
	}
}

function startCleanStatusWatcher(subscriptions: vscode.Disposable[]) {
	vscode.window.onDidChangeActiveTextEditor(editor => hideStatusBar());
	/*vscode.workspace.onDidChangeTextDocument(documentEvent => {
		if (documentEvent.document.languageId === ABL_MODE.language) {
			hideStatusBar();
		}
	}, null, subscriptions);*/
}

function startConfigFileWatcher() {
	loadOpenEdgeConfig();
}

function startDictWatcher() {
	loadDictDumpFiles();
}

function startFormatCommand(subscriptions: vscode.Disposable[]) {
	const ablFormatter = new ABLFormatter();
	subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(ABL_MODE.language, ablFormatter));
	//subscriptions.push(vscode.languages.registerOnTypeFormattingEditProvider(ABL_MODE.language, ablFormatter, '\n', '\r\n'));
}

function startDocumentWatcher(context: vscode.ExtensionContext) {
	initDocumentController(context);
}