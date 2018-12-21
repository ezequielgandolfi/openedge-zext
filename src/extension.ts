import * as vscode from 'vscode';
import { checkSyntax } from './ablCheckSyntax';
import { run } from './ablRun';
import { openDataDictionary, readDataDictionary } from './ablDataDictionary';
import { loadOpenEdgeConfig, getConfig } from './ablConfig';
import { ABLDbSchemaCompletion, loadDictDumpFiles } from './codeCompletion';
import { compile } from './ablCompile';
import { sourceDeploy } from './deploy';
import { ABLFormatter } from './formatter';
import { ABLDocumentController } from './documentController';
import { OutlineNavigatorProvider } from './outlineNavigator';
import { ABL_MODE } from './ablMode';
import { hideStatusBar } from './notification';
import { getAllVariables } from './utils';

let errorDiagnosticCollection: vscode.DiagnosticCollection;
let warningDiagnosticCollection: vscode.DiagnosticCollection;

export function activate(ctx: vscode.ExtensionContext): void {
	const symbolOutlineProvider = new OutlineNavigatorProvider(ctx);


	startBuildOnSaveWatcher(ctx.subscriptions);
	startConfigFileWatcher();
	startDictWatcher();
	startCleanStatusWatcher(ctx.subscriptions);
	//startFormatCommand(ctx.subscriptions);
	startDocumentWatcher(ctx);

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
		runCheckSyntax(vscode.window.activeTextEditor.document, ablConfig);
	}));
	ctx.subscriptions.push(vscode.commands.registerCommand('abl.compile', () => {
		let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
		runCompile(vscode.window.activeTextEditor.document, ablConfig);
	}));
	ctx.subscriptions.push(vscode.commands.registerCommand('abl.deploy.currentFile', () => {
		sourceDeploy(vscode.window.activeTextEditor.document.uri.fsPath);
	}));
	ctx.subscriptions.push(vscode.commands.registerCommand('abl.dataDictionary', () => {
		// let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
		openDataDictionary();
	}));

	ctx.subscriptions.push(vscode.commands.registerCommand('abl.run.currentFile', () => {
		let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
		run(vscode.window.activeTextEditor.document.uri.fsPath, ablConfig);
	}));

	errorDiagnosticCollection = vscode.languages.createDiagnosticCollection('abl-error');
	ctx.subscriptions.push(errorDiagnosticCollection);
	warningDiagnosticCollection = vscode.languages.createDiagnosticCollection('abl-warning');
	ctx.subscriptions.push(warningDiagnosticCollection);

	ctx.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new ABLDbSchemaCompletion(), '.'));

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

function runCheckSyntax(document: vscode.TextDocument, ablConfig: vscode.WorkspaceConfiguration) {

	function mapSeverityToVSCodeSeverity(sev: string) {
		switch (sev) {
			case 'error': return vscode.DiagnosticSeverity.Error;
			case 'warning': return vscode.DiagnosticSeverity.Warning;
			default: return vscode.DiagnosticSeverity.Error;
		}
	}

	if (document.languageId !== ABL_MODE.language) {
		return;
	}

	let uri = document.uri;
	checkSyntax(uri.fsPath, ablConfig).then(errors => {
		errorDiagnosticCollection.clear();
		warningDiagnosticCollection.clear();

		let diagnosticMap: Map<string, Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>> = new Map();

		errors.forEach(error => {
			let canonicalFile = vscode.Uri.file(error.file).toString();
			let startColumn = 0;
			let endColumn = 1;
			if (error.line === 0) {
				vscode.window.showErrorMessage(error.msg);
			}
			else {
				if (document && document.uri.toString() === canonicalFile) {
					let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, document.lineAt(error.line - 1).range.end.character + 1);
					let text = document.getText(range);
					let [_, leading, trailing] = /^(\s*).*(\s*)$/.exec(text);
					startColumn = startColumn + leading.length;
					endColumn = text.length - trailing.length;
				}
				let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, endColumn);
				let severity = mapSeverityToVSCodeSeverity(error.severity);
				let diagnostic = new vscode.Diagnostic(range, error.msg, severity);
				let diagnostics = diagnosticMap.get(canonicalFile);
				if (!diagnostics) {
					diagnostics = new Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>();
				}
				if (!diagnostics[severity]) {
					diagnostics[severity] = [];
				}
				diagnostics[severity].push(diagnostic);
				diagnosticMap.set(canonicalFile, diagnostics);
			}
		});
		diagnosticMap.forEach((diagMap, file) => {
			errorDiagnosticCollection.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Error]);
			warningDiagnosticCollection.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Warning]);
		});
	}).catch(err => {
		vscode.window.showInformationMessage('Error: ' + err);
	});
}

function runCompile(document: vscode.TextDocument, ablConfig: vscode.WorkspaceConfiguration) {

	function mapSeverityToVSCodeSeverity(sev: string) {
		switch (sev) {
			case 'error': return vscode.DiagnosticSeverity.Error;
			case 'warning': return vscode.DiagnosticSeverity.Warning;
			default: return vscode.DiagnosticSeverity.Error;
		}
	}

	if (document.languageId !== ABL_MODE.language) {
		return;
	}

	let uri = document.uri;
	compile(uri.fsPath, ablConfig).then(errors => {
		errorDiagnosticCollection.clear();
		warningDiagnosticCollection.clear();

		let diagnosticMap: Map<string, Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>> = new Map();

		errors.forEach(error => {
			let canonicalFile = vscode.Uri.file(error.file).toString();
			let startColumn = 0;
			let endColumn = 1;
			if (error.line === 0) {
				vscode.window.showErrorMessage(error.msg);
			}
			else {
				if (document && document.uri.toString() === canonicalFile) {
					let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, document.lineAt(error.line - 1).range.end.character + 1);
					let text = document.getText(range);
					let [_, leading, trailing] = /^(\s*).*(\s*)$/.exec(text);
					startColumn = startColumn + leading.length;
					endColumn = text.length - trailing.length;
				}
				let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, endColumn);
				let severity = mapSeverityToVSCodeSeverity(error.severity);
				let diagnostic = new vscode.Diagnostic(range, error.msg, severity);
				let diagnostics = diagnosticMap.get(canonicalFile);
				if (!diagnostics) {
					diagnostics = new Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>();
				}
				if (!diagnostics[severity]) {
					diagnostics[severity] = [];
				}
				diagnostics[severity].push(diagnostic);
				diagnosticMap.set(canonicalFile, diagnostics);
			}
		});
		diagnosticMap.forEach((diagMap, file) => {
			errorDiagnosticCollection.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Error]);
			warningDiagnosticCollection.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Warning]);
		});
	}).catch(err => {
		vscode.window.showInformationMessage('Error: ' + err);
	});
}

function startBuildOnSaveWatcher(subscriptions: vscode.Disposable[]) {
	let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
	if (ablConfig.get('checkSyntaxOnSave') === 'file') {
		vscode.workspace.onDidSaveTextDocument(document => {
			if (document.languageId !== ABL_MODE.language) {
				return;
			}
			runCheckSyntax(document, ablConfig);
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
	let ablDocumentController = new ABLDocumentController(context);
}