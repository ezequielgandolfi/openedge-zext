import * as vscode from 'vscode';
import * as fs from 'fs';
import * as promisify from 'util.promisify';
import { ABLTableDefinition, ABL_PARAM_DIRECTION, TextSelection } from './definition';
import { ABLDocumentController, ABLDocument } from './documentController';
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
		let p = new vscode.Position(position.line, position.character-1); // get the previous char to compare previous statement
		let selection = getText(document, p, true);
		let words = selection.statement.split('.');
		if (words.length == 2) {
			let result = this.getCompletionFields(words[0]);
			if ((result)&&(result.length>0))
				return new vscode.CompletionList(result);

			result = doc.getCompletionTempTableFields(words[0]);
			if ((result)&&(result.length>0))
				return new vscode.CompletionList(result);

			// External Temp-tables
			doc.externalDocument.forEach(external => {
				if ((!result)||(result.length==0)) {
					let extDoc = this._ablDocumentController.getDocument(external);
					if ((extDoc)&&(extDoc.processed)) {
						result = extDoc.getCompletionTempTableFields(words[0]);
					}
				}
			});
			if ((result)&&(result.length>0))
				return new vscode.CompletionList(result);
		}
		else if (words.length == 1) {
			// Tables
			let tb = _tableCollection.items;
			// Symbols
			let docSym = doc.getCompletionSymbols();
			// External Symbols
			let extSym: vscode.CompletionItem[] = [];
			doc.externalDocument.forEach(external => {
				let extDoc = this._ablDocumentController.getDocument(external);
				if ((extDoc)&&(extDoc.processed)) {
					extSym = [...extSym,...extDoc.getCompletionSymbols()];
				}
			});
			//
			return new vscode.CompletionList([...tb,...docSym,...extSym]);
		}
		return;
	}

	private getCompletionFields(prefix: string): vscode.CompletionItem[] {
		// Tables
		let tb = _tableCollection.items.find((item) => item.label.toLowerCase() == prefix);
		if (tb) {
			return tb['completion'].items;
		}
		return [];
	}
}

export function loadDumpFile(filename: string): Thenable<any> {
    if (!filename)
        return Promise.resolve({});
    return readFileAsync(filename, { encoding: 'utf8' }).then(text => {
        return JSON.parse(text);
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
		let fileDataResult:ABLTableDefinition[] = JSON.parse(text);
		if(fileDataResult) {
			fileDataResult
				.map(tb => {
					let obj: ABLTableDefinition = new ABLTableDefinition();
					Object.assign(obj, tb);
					obj.filename = filename;
					obj.fields.map(fd => fd.name = fd['label']);
					updateTableCompletionList(obj);
					return obj;
				})
				.forEach(tb => {
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
