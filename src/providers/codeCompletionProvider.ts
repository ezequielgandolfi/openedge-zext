import * as vscode from 'vscode';
import * as fs from 'fs';
import * as util from 'util';
import { ABLTableDefinition } from '../definition';
import { ABLDocumentController, getDocumentController } from '../documentController';
import { updateTableCompletionList, getText, replaceSnippetTableName } from '../utils';
import { ABL_MODE } from '../environment';

let watcher: vscode.FileSystemWatcher = null;
let _tableCollection: vscode.CompletionList = new vscode.CompletionList();
const readFileAsync = util.promisify(fs.readFile);

export class ABLCodeCompletionProvider implements vscode.CompletionItemProvider {
	private _ablDocumentController: ABLDocumentController;

	constructor(context: vscode.ExtensionContext) {
		this.initialize(context);
	}

	private initialize(context: vscode.ExtensionContext) {
		this._ablDocumentController = getDocumentController();
		context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, this, '.'));
	}
	
	public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
		let doc  = this._ablDocumentController.getDocument(document);
		let p = new vscode.Position(position.line, position.character-1); // get the previous char to compare previous statement
		let selection = getText(document, p, true);
		let words = selection.statement.split('.');
		if (words.length == 2) {
            // translate buffer var/param
            let originalName = words[0];
            words[0] = (doc.searchBuffer(words[0], position) || words[0]);
            if (originalName == words[0])
                originalName = null;
			//
			let result = this.getCompletionFields(words[0], originalName);
			if ((result)&&(result.length>0))
				return new vscode.CompletionList(result);

			result = doc.getCompletionTempTableFields(words[0], originalName);
			if ((result)&&(result.length>0))
				return new vscode.CompletionList(result);

			// External Temp-tables
			doc.externalDocument.forEach(external => {
				if ((!result)||(result.length==0)) {
					let extDoc = this._ablDocumentController.getDocument(external);
					if ((extDoc)&&(extDoc.processed)) {
						result = extDoc.getCompletionTempTableFields(words[0], originalName);
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
			let docSym = doc.getCompletionSymbols(position);
			// External Symbols
			let extSym: vscode.CompletionItem[] = [];
			doc.externalDocument.forEach(external => {
				let extDoc = this._ablDocumentController.getDocument(external);
				if ((extDoc)&&(extDoc.processed)) {
					extSym = [...extSym,...extDoc.getCompletionSymbols(position)];
				}
			});
			//
			return new vscode.CompletionList([...tb,...docSym,...extSym]);
		}
		return;
	}

	private getCompletionFields(prefix: string, replacement?: string): vscode.CompletionItem[] {
		// Tables
		let tb = _tableCollection.items.find((item) => item.label.toLowerCase() == prefix);
		if (tb) {
            let result = tb['completion'].items;
            if (!util.isNullOrUndefined(replacement))
                result = replaceSnippetTableName(result, prefix, replacement);
            return result;
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
		//watcher.onDidCreate(uri => loadAndSetDumpFile(uri.fsPath));
		watcher.onDidDelete(uri => unloadDumpFile(uri.fsPath));
		findDumpFiles().then(filename => { filename.forEach((f) => { loadAndSetDumpFile(f.fsPath) })});
		resolve();
    });
}
