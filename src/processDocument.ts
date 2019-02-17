import * as vscode from "vscode";
import { ABLVariable, ABL_ASLIKE, ABLMethod, ABLParameter, ABLInclude, ABLTempTable, ABLFieldDefinition, ABLIndexDefinition, ABLTableDefinition, ABL_PARAM_DIRECTION } from "./definition";
import { removeInvalidRightChar, updateTableCompletionList } from "./utils";
import { SourceCode } from "./sourceParser";

export function getAllIncludes(sourceCode: SourceCode): ABLInclude[] {
	let result: ABLInclude[] = [];
	//let regexInclude: RegExp = new RegExp(/\{{1}([\w\d\-\\\/\.]+)(?:.|\n)*?\}{1}/gim);
	// 1 = include name
	let regexStart: RegExp = new RegExp(/\{{1}([\w\d\-\\\/\.]+)/gim);
	// 1 = include name
	let regexEnd: RegExp = new RegExp(/\}{1}/gim);
	//
	let text = sourceCode.sourceWithoutStrings;
	let resStart = regexStart.exec(text);
	let resEnd;
	while(resStart) {
		regexEnd.lastIndex = regexStart.lastIndex;
		resEnd = regexEnd.exec(text);
		if (resEnd) {
			let nm = resStart[1].trim().toLowerCase();
			if (!result.find(item => item.name == nm)) {
				let v = new ABLInclude();	
				v.name = nm;
				result.push(v);
			}
			resStart = regexStart.exec(text);
		}
		else {
			break;
		}
	}
	return result;
}

export function getAllVariables(sourceCode: SourceCode): ABLVariable[] {
	let result: ABLVariable[] = [];
	let regexDefineVar: RegExp = new RegExp(/(?:def|define){1}(?:[\s\t]|new|shared)+(?:var|variable){1}(?:[\s\t]+)([\w\d\-]+)[\s\t]+(as|like){1}[\s\t]+([\w\d\-\.]+)/gim);
	// 1 = var name
	// 2 = as | like
	// 3 = type | field like
	let text = sourceCode.sourceWithoutStrings;
	let res = regexDefineVar.exec(text);
	while(res) {
		let v = new ABLVariable();
		try {
			v.name = res[1].trim();
			v.asLike = <ABL_ASLIKE>res[2].trim();
			v.dataType = removeInvalidRightChar(res[3].trim()); // removeInvalidRightChar to remove special chars because is accepted in this capture group
			v.line = sourceCode.document.positionAt(res.index).line;
			result.push(v);
		}
		catch {} // suppress errors
		res = regexDefineVar.exec(text);
	}
	return result;
}

export function getAllMethods(sourceCode: SourceCode): ABLMethod[] {
	let result: ABLMethod[] = [];
	//let regexMethod = new RegExp(/\b(proc|procedure|func|function){1}[\s\t]+([\w\d\-]+)(.*?)[\.\:]{1}(.|[\n\s])*?(?:end\s(proc|procedure|func|function)){1}\b/gim);
	// 1 = function | procedure
	// 2 = name
	// 3 = aditional details (returns xxx...)
	// 4 = code block (incomplete)

	let regexStart = new RegExp(/\b(proc|procedure|func|function){1}[\s\t]+([\w\d\-]+)(.*?)(?:[\.\:][^\w\d\-\+])/gim);
	// 1 = function | procedure
	// 2 = name
	// 3 = aditional details (returns xxx...)
	let regexEnd = new RegExp(/\b(?:end\s(proc|procedure|func|function)){1}\b/gim);
	//
	let text = sourceCode.sourceWithoutStrings;
	let resStart = regexStart.exec(text);
	let resEnd;
	while(resStart) {
		regexEnd.lastIndex = regexStart.lastIndex;
		resEnd = regexEnd.exec(text);
		if (resEnd) {
			let m = new ABLMethod();
			try {
				m.name = resStart[2];
				m.lineAt = sourceCode.document.positionAt(resStart.index).line;
				m.lineEnd = sourceCode.document.positionAt(regexEnd.lastIndex).line;
				m.params = [];
				result.push(m);
			}
			catch {} // suppress errors
			resStart = regexStart.exec(text);
		}
		else {
			break;
		}
	}
	return result;
}

export function getAllParameters(sourceCode: SourceCode): ABLParameter[] {
	let result: ABLParameter[] = [];
	let regexParams: RegExp = new RegExp(/\b(?:def|define){1}[\s\t]+([inputo\-]*){1}[\s\t]+(?:param|parameter){1}[\s\t]+([\w\d\-\.]*){1}[\s\t]+(as|like){1}[\s\t]+([\w\d\-\.]+)/gim);
	// 1 = input | output | input-output
	// 2 = name
	// 3 = as | like
	// 4 = type | field like
	let text = sourceCode.sourceWithoutStrings;
	let res = regexParams.exec(text);
	while(res) {
		let v = new ABLParameter();
		try {
			v.name = res[2].trim();
			v.asLike = <ABL_ASLIKE>res[3].trim();
			v.dataType = removeInvalidRightChar(res[4].trim()); // removeInvalidRightChar to remove special chars because is accepted in this capture group
			v.line = sourceCode.document.positionAt(res.index).line;
			if (res[1].toLowerCase() == 'input')
				v.direction = ABL_PARAM_DIRECTION.IN;
			else if (res[1].toLowerCase() == 'output')
				v.direction = ABL_PARAM_DIRECTION.OUT;
			else
				v.direction = ABL_PARAM_DIRECTION.INOUT;
			result.push(v);
		}
		catch {} // suppress errors
		res = regexParams.exec(text);
	}
	return result;
}

export function getAllTempTables(sourceCode: SourceCode): ABLTempTable[] {
	let result: ABLTempTable[] = [];
	//let regexTT: RegExp = new RegExp(/(?:def|define){1}(?:[\s\t]|new|global|shared)+(?:temp-table){1}[\s\t\n\r]+([\w\d\-]*)[\s\t\n\r]+([\w\W]*?)(?:\.(?!\w))/gim);
	let regexStart: RegExp = new RegExp(/\b(?:def|define){1}(?:[\s\t]|new|global|shared)+(?:temp-table){1}[\s\t\n\r]+([\w\d\-\+]*)[^\w\d\-\+]/gim);
	// 1 = name
	let regexEnd: RegExp = new RegExp(/\.[^\w\d\-\+]/gim);
	// 
	let text = sourceCode.sourceWithoutStrings;
	let innerText;
	let resStart = regexStart.exec(text);
	let resEnd;
	while(resStart) {
		regexEnd.lastIndex = regexStart.lastIndex;
		resEnd = regexEnd.exec(text);
		if (resEnd) {
			innerText = text.substring(regexStart.lastIndex, resEnd.index);
			let v = new ABLTempTable();
			try {
				v.label = resStart[1];
				v.kind = vscode.CompletionItemKind.Struct;
				v.detail = '';
				v.fields = getTempTableFields(innerText, sourceCode);
				v.indexes = getTempTableIndexes(innerText);
				v.line = sourceCode.document.positionAt(resStart.index).line;
				updateTableCompletionList(v);
				result.push(v);
			}
			catch {} // suppress errors
			resStart = regexStart.exec(text);
		}
		else {
			break;
		}
	}
	return result;
}

function getTempTableFields(text: string, sourceCode: SourceCode): ABLVariable[] {
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
			v.line = sourceCode.document.positionAt(res.index).line;
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


