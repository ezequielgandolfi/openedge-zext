import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ABL_MODE } from '../environment';
import { COMPILE_OPTIONS, execCompile } from '../ablCompile';
import { isArray } from 'util';
import { execCheckSyntax } from '../ablCheckSyntax';
import { execRun } from '../ablRun';
import { documentDeploy } from '../deploy';
import { readDataDictionary } from '../ablDataDictionary';
import { getDocumentController } from '../documentController';

export class CommandProvider {
	constructor(context: vscode.ExtensionContext) {
		this.initialize(context);
	}

	private initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.checkSyntax', () => {
			let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
			execCheckSyntax(vscode.window.activeTextEditor.document, ablConfig);
		}));
		context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.compile', () => {
			let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
			execCompile(vscode.window.activeTextEditor.document, null, ablConfig, [COMPILE_OPTIONS.COMPILE]);
		}));
		context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.run', () => {
			let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
			execRun(vscode.window.activeTextEditor.document, ablConfig);
		}));
		context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.deploySource', () => {
			documentDeploy(vscode.window.activeTextEditor.document);
		}));
		context.subscriptions.push(vscode.commands.registerCommand('abl.dictionary.dumpDefinition', () => {
			let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
			readDataDictionary(ablConfig);
		}));
		context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.compileOptions', () => {
			this.chooseCompileOption();
		}));
		context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.saveMap', (args) => {
			let doc = vscode.window.activeTextEditor.document;
			let filename = null;
			if (args) {
				if ((isArray(args))&&(args.length>0))
					filename = args[0];
				else
					filename = args;
			}
			this.saveMapFile(doc, filename);
			return filename;
		}));
	}

	private chooseCompileOption() {
		let options = Object.keys(COMPILE_OPTIONS).map(k => {return COMPILE_OPTIONS[k]});
		vscode.window.showQuickPick(options, {placeHolder: 'Compile option', canPickMany: true}).then(v => {
			let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
			execCompile(vscode.window.activeTextEditor.document, null, ablConfig, v);
		});
	}

	private saveMapFile(document: vscode.TextDocument, filename?: string) {
		let doc = getDocumentController().getDocument(document);
		if (doc) {
			let save = (fname:string, showMessage:boolean) => {
				let data = doc.getMap();
				if (data) {
					fs.writeFileSync(fname, JSON.stringify(data));
					if (showMessage)
						vscode.window.showInformationMessage('File ' + path.basename(fname) + ' created!');
				}
				else if (showMessage) {
					vscode.window.showErrorMessage('Error mapping file');
				}
			}
			//
			if (filename) {
				save(filename, false);
			}
			else {
				let opt: vscode.InputBoxOptions = {prompt: 'Save into file', value: doc.document.uri.fsPath + '.oe-map.json'};
				vscode.window.showInputBox(opt).then(fname => { if(fname) save(fname, true) });
			}
		}
	}
	
}