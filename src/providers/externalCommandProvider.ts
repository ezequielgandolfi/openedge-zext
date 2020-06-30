import * as vscode from 'vscode';
import { getDocumentController } from '../documentController';
import { SourceParser } from '../sourceParser';
import { getTableCollection } from './codeCompletionProvider';
import { ABL_MODE } from '../environment';
import { OpenEdgeConfig } from '../extensionConfig';
import { ABLCompile, COMPILE_OPTIONS } from '../ablCommand';

/**
 * Provider for invisible commands.
 * Can be used by other VSCode extensions.
 */
export class ExternalCommandProvider {
	constructor(context: vscode.ExtensionContext) {
		this.initialize(context);
	}

	private initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.getMap', () => {
			let doc = vscode.window.activeTextEditor.document;
			if (doc)
				return getDocumentController().getDocument(doc).getMap();
			else
				return {};
		}));
		context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.getSourceCode', () => {
			let doc = vscode.window.activeTextEditor.document;
			if (doc)
				return new SourceParser().getSourceCode(doc);
			else
				return;
		}));
		// other commands
		context.subscriptions.push(vscode.commands.registerCommand('abl.tables', () => {
			return getTableCollection().items.map(item => item.label);
		}));
		context.subscriptions.push(vscode.commands.registerCommand('abl.table', (tableName) => {
			return getTableCollection().items.find(item => item.label == tableName);
		}));
	
		context.subscriptions.push(vscode.commands.registerCommand('abl.compile', (fileName: string, mergeOeConfig?: OpenEdgeConfig) => {
			let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
			return new Promise(function(resolve,reject) {
				vscode.workspace.openTextDocument(fileName).then(doc => {
					new ABLCompile().execute(doc, mergeOeConfig, true, [COMPILE_OPTIONS.COMPILE]).then(v => resolve(v));
				});
			})
		}));
	}
	
}