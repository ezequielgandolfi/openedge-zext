import * as vscode from 'vscode';
import * as fs from 'fs';
import * as promisify from 'util.promisify';
import * as jsonminify from 'jsonminify';
import { ABLTableDefinition } from './definition';
import { ABLDocumentController } from './documentController';
import { updateTableCompletionList, getText } from './utils';

let watcher: vscode.FileSystemWatcher = null;
let _tableCollection: vscode.CompletionList = new vscode.CompletionList();
const readFileAsync = promisify(fs.readFile);

export class ABLCodeCompletion implements vscode.CompletionItemProvider {
	private _ablDocumentController: ABLDocumentController;

	constructor(controller: ABLDocumentController) {
		this._ablDocumentController = controller;
	}
	
	public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
		let doc  = this._ablDocumentController.getDocument(document);
		/*let temps: ABLTempTable[] = [];
		if (doc)
			temps = doc.tempTables;*/
		let selection = getText(document, position, true);
		let words = selection.statement.split('.');
		if (words.length == 2) {
			// Tables
			let tb = _tableCollection.items.find((item) => item.label.toLowerCase() == words[0]);
			if (tb) {
				return tb['completion'];
			}
			// Temp-tables
			let tt = doc.tempTables.find(item => item.filename.toLowerCase() == words[0]);
			if (tt) {
				return tt.completionFields;
			}
			// External Temp-tables
			let extTt;
			doc.externalDocument.forEach(external => {
				if (!extTt) {
					let extDoc = this._ablDocumentController.getDocument(external);
					if (extDoc) {
						extTt = extDoc.tempTables.find(item => item.filename.toLowerCase() == words[0]);
						if (extTt) {
							extTt = extTt.completionFields;
						}
					}
				}
			});
			if (extTt)
				return extTt;
		}
		else if (words.length == 1) {
			// Tables
			let tb = _tableCollection.items;
			// Temp-tables
			let tt: vscode.CompletionItem[] = doc.tempTables.map(item => {
				return new vscode.CompletionItem(item.filename);
			});
			// External Temp-tables
			let externalTt: vscode.CompletionItem[] = [];
			doc.externalDocument.forEach(external => {
				let _ti = this._ablDocumentController.getDocument(external).tempTables.map(item => {
					return new vscode.CompletionItem(item.filename);
				});
				externalTt = [...externalTt,..._ti];
			});
			return new vscode.CompletionList([...tb,...tt,...externalTt]);
		}
		return [];
	}
}

export function loadDumpFile(filename: string): Thenable<any> {
    if (!filename)
        return Promise.resolve({});
    return readFileAsync(filename, { encoding: 'utf8' }).then(text => {
        return JSON.parse(jsonminify(text));
    });
}

export function getTableCollection() {
	return _tableCollection;
}

function findDumpFiles() {
    return vscode.workspace.findFiles('**/.openedge-zext.db.*');
}

function loadAndSetDumpFile(filename: string) {
	unloadDumpFile(filename);
	return readFileAsync(filename, { encoding: 'utf8' }).then(text => {
		let res:ABLTableDefinition[] = JSON.parse(text);
		if(res) {
			res.map(tb => {
				tb.filename = filename;
				tb.fields.map(fd => fd.name = fd['label']);
				updateTableCompletionList(tb);
			});
			res.forEach(tb => {
				_tableCollection.items.push(tb);	
			});
		}
    });
}

function unloadDumpFile(filename: string) {
	_tableCollection.items = _tableCollection.items.filter((item) => item['filename'] != filename);
}

export function loadDictDumpFiles() {
    return new Promise<null>((resolve, reject) => {
        watcher = vscode.workspace.createFileSystemWatcher('**/.openedge-zext.db.*');
		watcher.onDidChange(uri => loadAndSetDumpFile(uri.fsPath));
		watcher.onDidCreate(uri => loadAndSetDumpFile(uri.fsPath));
		watcher.onDidDelete(uri => unloadDumpFile(uri.fsPath));
		findDumpFiles().then(filename => { filename.forEach((f) => { loadAndSetDumpFile(f.fsPath) })});
		resolve();
    });
}
