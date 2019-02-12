import * as vscode from "vscode";
import * as fs from 'fs';
import { TextSelection, ABLTableDefinition, ABLIndexDefinition } from "./definition";

let regexInvalidWordEnd: RegExp = new RegExp(/[\.|\:|\-|\_|\\|\/]$/);

export function getText(document: vscode.TextDocument, position: vscode.Position, escapeEndChars?: boolean): TextSelection {
	let res = new TextSelection();
	res.wordRange = document.getWordRangeAtPosition(position, /[\w\d\-\_]+/);
	res.word = document.getText(res.wordRange).toLowerCase();
	res.statementRange = document.getWordRangeAtPosition(position, /[\w\d\-\_\.\:\\\/]+/);
	res.statement = document.getText(res.statementRange).toLowerCase();
	if (escapeEndChars !== true) {
		while(regexInvalidWordEnd.test(res.statement)) 
		res.statement = res.statement.substring(0, res.statement.length-1);
	}
	return res;
}

export function cleanArray(arr: string[]): string[] {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] == '') {
			arr.splice(i, 1);
			i--;
		}
	}
	return arr;
}

export function padRight(text: string, size: number): string {
	while (text.length < size)
		text+=' ';
	return text;
}

export function removeInvalidRightChar(text: string): string {
	let regexValidWordEnd: RegExp = new RegExp(/[\w\d]$/);
	while(!regexValidWordEnd.test(text)) 
		text = text.substring(0, text.length-1);
	return text;
}

export function updateTableCompletionList(table: ABLTableDefinition) {
	table.completionFields = new vscode.CompletionList(table.fields.map(field => {
		return new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Variable);
	}));
	table.completionIndexes = mapIndexCompletionList(table, table.indexes);
	table.completionAdditional = mapAdditionalCompletionList(table);
	table.completion = new vscode.CompletionList([...table.completionFields.items,...table.completionAdditional.items,...table.completionIndexes.items]);

	let pk = table.indexes.find(item => item.primary);
	if((pk)&&(pk.fields))
		table.pkList = pk.fields.map(item => {return item.label}).join(', ');
	else
		table.pkList = '';
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

function mapAdditionalCompletionList(table: ABLTableDefinition): vscode.CompletionList {
	let result = new vscode.CompletionList();
	let item;

	// ALL FIELDS
	item = new vscode.CompletionItem('>ALL FIELDS', vscode.CompletionItemKind.Snippet);
	item.insertText = getAllFieldsSnippet(table);
	item.detail = 'Insert all table fields';
	result.items.push(item);

	return result;
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
		snip.appendText(padRight(field.label, size) + ' = ');
		snip.appendTabstop();
	});
	return snip;
}

function getAllFieldsSnippet(table: ABLTableDefinition): vscode.SnippetString {
	let snip = new vscode.SnippetString();
	let first: boolean = true;
	let size = 0;
	// get max field name size
	table.fields.forEach(field => { if(field.name.length > size) size = field.name.length });
	// fields snippet 
	table.fields.forEach(field => {
		if(first) {
			first = false;
		}
		else {
			snip.appendText('\n');
			snip.appendText(table.filename + '.');
		}
		snip.appendText(padRight(field.name, size) + ' = ');
		snip.appendTabstop();
	});
	return snip;
}

export function applyTrim(document: vscode.TextDocument) {
	/*let activeDoc = vscode.window.visibleTextEditors.find(active => active.document.uri.fsPath == document.uri.fsPath);
	if (activeDoc) {
		for(let i = 0; i < document.lineCount; i++) {
			let line = document.lineAt(i);
			if (!line.isEmptyOrWhitespace) {
			}
			else {
				line.text = '';
			}
		}
				activeDoc.document.lineCount
				activeDoc.edit(editor => {
					let range: vscode.Range = new vscode.Range(0, 0, activeDoc)
					editor.replace(activeDoc.document.)
				})
			}

	*/
}

export function mkdir(path: string) {
	let dirs = path.split('\\');
	for (let i = 0; i < dirs.length; i++) {
		let dir = dirs.filter((v,idx) => { return (idx <= i) }).join('\\');
		if (dir.replace('\\','') == '') 
			continue;
		if (!fs.existsSync(dir))
			fs.mkdirSync(dir);
	}
}
