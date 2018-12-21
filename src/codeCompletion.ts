import * as vscode from 'vscode';
import { readFile } from 'fs';
import * as promisify from 'util.promisify';
import * as jsonminify from 'jsonminify';
import * as utils from './utils';
import { ABLTableDefinition, ABLIndexDefinition } from './definition';

let watcher: vscode.FileSystemWatcher = null;
let _tableCollection: vscode.CompletionList = new vscode.CompletionList();
const readFileAsync = promisify(readFile);

export class ABLDbSchemaCompletion implements vscode.CompletionItemProvider {
	public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
		let selection = utils.getText(document, position, true);
		let words = selection.statement.split('.');
		if (words.length == 2) {
			let tb = _tableCollection.items.find((item) => item.label.toLowerCase() == words[0]);
			if (tb) {
				return tb['completion'];
			}
		}
		else if (words.length == 1)
			return _tableCollection;
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
				tb.completionFields = new vscode.CompletionList(tb.fields);
				tb.completionIndexes = mapIndexCompletionList(tb, tb.indexes);
				tb.completion = new vscode.CompletionList([...tb.completionFields.items,...tb.completionIndexes.items]);

				let pk = tb.indexes.find(item => item.primary);
				if((pk)&&(pk.fields))
					tb.pkList = pk.fields.map(item => {return item.label}).join(', ');
				else
					tb.pkList = '';
			});
			res.forEach(tb => {
				_tableCollection.items.push(tb);	
			});
		}
    });
}

function getIndexSnippet(table: ABLTableDefinition, index: ABLIndexDefinition): vscode.SnippetString {
	let snip = new vscode.SnippetString();
	let first: boolean = true;
	let size = 0;
	// get max field name size
	index.fields.forEach(field => { if(field.label.length > size) size = field.label.length });
	// fields snippet 
	index.fields.forEach(field => {
		if(first) {
			first = false;
		}
		else {
			snip.appendText('\n');
			snip.appendText('\tand ' + table.label + '.');
		}
		snip.appendText(utils.padRight(field.label, size) + ' = ');
		snip.appendTabstop();
	});
	return snip;
}

function mapIndexCompletionList(table: ABLTableDefinition, list: ABLIndexDefinition[]): vscode.CompletionList {
	let result = new vscode.CompletionList();

	if(!list) return result;
	
	list.forEach(objItem => {
		if (!objItem.fields) return;
		let item = new vscode.CompletionItem(objItem.label, vscode.CompletionItemKind.Snippet);
		item.insertText = getIndexSnippet(table, objItem);
		item.detail = objItem.fields.map(item => {return item.label}).join(', ');
		if (objItem.primary) {
			item.label = '>INDEX (PK) ' + item.label;
			item.detail = 'Primary Key, Fields: ' + item.detail;
		}
		else if (objItem.unique) {
			item.label = '>INDEX (U) ' + item.label; 
			item.detail = 'Unique Index, Fields: ' + item.detail;
		}
		else {
			item.label = '>INDEX ' + item.label;
			item.detail = 'Index, Fields: ' + item.detail;
		}
		result.items.push(item);
	});
	return result;
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
