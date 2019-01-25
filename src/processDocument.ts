import * as vscode from "vscode";
import { ABLVariable, ABL_ASLIKE, ABLMethod, ABLParameter, ABLInclude, ABLTempTable, ABLFieldDefinition, ABLIndexDefinition, ABLTableDefinition } from "./definition";
import { removeInvalidRightChar, updateTableCompletionList } from "./utils";

export function getAllIncludes(document: vscode.TextDocument): ABLInclude[] {
	let result: ABLInclude[] = [];
	let regexInclude: RegExp = new RegExp(/\{{1}([\w\d\-\\\/\.]+)(?:.|\n)*?\}{1}/gim);
	// 1 = include name
	let text = document.getText();
	let res = regexInclude.exec(text);
	while(res) {
		let v = new ABLInclude();
		try {
			v.name = res[1].trim();
			result.push(v);
		}
		catch {} // suppress errors
		res = regexInclude.exec(text);
	}
	return result;
}

export function getAllVariables(document: vscode.TextDocument): ABLVariable[] {
	let result: ABLVariable[] = [];
	let regexDefineVar: RegExp = new RegExp(/(?:def|define){1}(?:[\s\t]|new|shared)+(?:var|variable){1}(?:[\s\t]+)([\w\d\-]+)[\s\t]+(as|like){1}[\s\t]+([\w\d\-\.]+)/gim);
	// 1 = var name
	// 2 = as | like
	// 3 = type | field like
	let text = document.getText();
	let res = regexDefineVar.exec(text);
	while(res) {
		let v = new ABLVariable();
		try {
			v.name = res[1].trim();
			v.asLike = <ABL_ASLIKE>res[2].trim();
			v.dataType = removeInvalidRightChar(res[3].trim()); // removeInvalidRightChar to remove special chars because is accepted in this capture group
			v.line = document.positionAt(res.index).line;
			result.push(v);
		}
		catch {} // suppress errors
		res = regexDefineVar.exec(text);
	}
	return result;
}

export function getAllMethods(document: vscode.TextDocument): ABLMethod[] {
	let result: ABLMethod[] = [];
	//let regexMethod = new RegExp(/\b(proc|procedure|func|function){1}[\s\t]+([\w\d\-]+)(.*?)[\.\:]{1}(.|[\n\s])*?(?:end\s(proc|procedure|func|function)){1}\b/gim);
	// 1 = function | procedure
	// 2 = name
	// 3 = aditional details (returns xxx...)
	// 4 = code block (incomplete)

	let regexMethodStart = new RegExp(/\b(proc|procedure|func|function){1}[\s\t]+([\w\d\-]+)(.*?)[\.\:]{1}/gim);
	// 1 = function | procedure
	// 2 = name
	// 3 = aditional details (returns xxx...)
	let regexMethodEnd = new RegExp(/\b(?:end\s(proc|procedure|func|function)){1}\b/gim);
	// no capture group
	let text = document.getText();
	let resStart = regexMethodStart.exec(text);
	let resEnd;
	while(resStart) {
		regexMethodEnd.lastIndex = regexMethodStart.lastIndex;
		resEnd = regexMethodEnd.exec(text);
		if (resEnd) {
			let m = new ABLMethod();
			try {
				m.name = resStart[2];
				m.lineAt = document.positionAt(resStart.index).line;
				m.lineEnd = document.positionAt(regexMethodEnd.lastIndex).line;
				result.push(m);
			}
			catch {} // suppress errors
			resStart = regexMethodStart.exec(text);
		}
		else {
			break;
		}
	}
	return result;
}

export function getAllParameters(document: vscode.TextDocument): ABLParameter[] {
	let result: ABLParameter[] = [];
	let regexParams: RegExp = new RegExp(/\b(?:def|define){1}[\s\t]+([inputo\-]*){1}[\s\t]+(?:param|parameter){1}[\s\t]+([\w\d\-\.]*){1}[\s\t]+(as|like){1}[\s\t]+([\w\d\-\.]+)/gim);
	// 1 = input | output | input-output
	// 2 = name
	// 3 = as | like
	// 4 = type | field like
	let text = document.getText();
	let res = regexParams.exec(text);
	while(res) {
		let v = new ABLParameter();
		try {
			v.name = res[2].trim();
			v.asLike = <ABL_ASLIKE>res[3].trim();
			v.dataType = removeInvalidRightChar(res[4].trim()); // removeInvalidRightChar to remove special chars because is accepted in this capture group
			v.line = document.positionAt(res.index).line;
			result.push(v);
		}
		catch {} // suppress errors
		res = regexParams.exec(text);
	}
	return result;
}

export function getAllTempTables(document: vscode.TextDocument): ABLTempTable[] {
	let result: ABLTempTable[] = [];
	let regexTT: RegExp = new RegExp(/(?:def|define){1}(?:[\s\t]|new|global|shared)+(?:temp-table){1}[\s\t\n\r]+([\w\d\-]*)[\s\t\n\r]+([\w\W]*?)(?:\.(?!\w))/gim);
	// 1 = name
	// 2 = content
	let text = document.getText();
	let res = regexTT.exec(text);
	while(res) {
		let v = new ABLTempTable();
		try {
			v.filename = res[1];
			v.kind = vscode.CompletionItemKind.Struct;
			v.detail = '';
			v.label = 'Temp-table';
			v.fields = getTempTableFields(res[2]);
			v.indexes = getTempTableIndexes(res[2]);
			updateTableCompletionList(v);
			result.push(v);
		}
		catch {} // suppress errors
		res = regexTT.exec(text);
	}
	return result;
}

function getTempTableFields(text: string): ABLVariable[] {
	let result: ABLVariable[] = [];
	let regexDefineField: RegExp = new RegExp(/(?:field){1}(?:[\s\t]+)([\w\d\-]+)[\s\t]+(as|like){1}[\s\t]+([\w\d\-\.]+)/gim);
	// 1 = var name
	// 2 = as | like
	// 3 = type | field like
	let res = regexDefineField.exec(text);
	while(res) {
		let v: ABLVariable = new ABLVariable();
		try {
			v.name = res[1].trim();
			v.asLike = <ABL_ASLIKE>res[2].trim();
			v.dataType = removeInvalidRightChar(res[3].trim()); // removeInvalidRightChar to remove special chars because is accepted in this capture group
			//v.line = document.positionAt(res.index).line;
			result.push(v);
		}
		catch {} // suppress errors
		res = regexDefineField.exec(text);
	}
	return result;
}

function getTempTableIndexes(text: string): ABLIndexDefinition[] {
	return [];
}


