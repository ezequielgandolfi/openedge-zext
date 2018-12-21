import { TextDocument, Position } from "vscode";
import { TextSelection, ABLVariable, ABL_ASLIKE, ABLMethod, ABLParameter } from "./definition";

let regexMethodDef: RegExp = new RegExp(/^(\s|\t)*(proc|procedure|func|function)(\s)+(.)+(\.|\:){1}(\s|\t)*$/i);
let regexMethodSplit: RegExp = new RegExp(/[\s\(\)\[\];|'"\{\}\.\:\t\n]/);

let regexIncludeDef: RegExp = new RegExp(/({){1}(?!&)+(.)*(}){1}/i);
let regexIncludeSplit: RegExp = new RegExp(/[\s\{\}\n]/);

let regexInvalidWordEnd: RegExp = new RegExp(/[\.|\:|\-|\_|\\|\/]$/);


//let regexDefineVar: RegExp = new RegExp(/(def|define)+([\s\t]|new|shared)+(var|variable)+[\s\t]+[\w\d\-\_]+(\s|\t|as|like)+([a-z]|\.|\-)+/gim);

export function getText(document: TextDocument, position: Position, escapeEndChars?: boolean): TextSelection {
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

export function getMethodDefinition(line: string): string {
	if (regexMethodDef.test(line)) {
		let words = cleanArray(line.split(regexMethodSplit));
		if (words.length > 1) {
			return words[1];
		}
	}
	return '';
}

export function getIncludeDefinition(line: string): string {
	let cmd = regexIncludeDef.exec(line);
	if (cmd != null) {
		let words = cleanArray(cmd[0].split(regexIncludeSplit));
		if (words.length > 0) {
			return words[0].replace('\\','/');
		}
	}
	return '';
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

export function getAllVariables(document: TextDocument): ABLVariable[] {
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
			//v.line = document.positionAt(regexDefineVar.lastIndex).line;
			v.line = document.positionAt(res.index).line;
			result.push(v);
		}
		catch {} // suppress errors
		res = regexDefineVar.exec(text);
	}
	return result;
}

export function getAllMethods(document: TextDocument): ABLMethod[] {
	let result: ABLMethod[] = [];
	let regexMethod = new RegExp(/\b(proc|procedure|func|function){1}[\s\t]+([\w\d\-]+)(.*?)[\.\:]{1}(.|[\n\s])*?(end\s(?:proc|procedure|func|function)){1}\b/gim);
	// 1 = function | procedure
	// 2 = name
	// 3 = adicional details (returns xxx...)
	// 4 = code block (incomplete)
	// 5 = end function | procedure
	let text = document.getText();
	let res = regexMethod.exec(text);
	while(res) {
		let m = new ABLMethod();
		try {
			m.name = res[2];
			m.lineAt = document.positionAt(res.index).line;
			m.lineEnd = document.positionAt(regexMethod.lastIndex).line;
			result.push(m);
		}
		catch {} // suppress errors
		res = regexMethod.exec(text);
	}
	return result;
}

export function getAllParameters(document: TextDocument): ABLParameter[] {
	let result: ABLParameter[] = [];
	let regexParams: RegExp = new RegExp(/\b(?:def|define){1}[\s\t]+([inputou\-]*){1}[\s\t]+(?:param|parameter){1}[\s\t]+([\w\d\-\.]*){1}[\s\t]+(as|like){1}[\s\t]+([\w\d\-\.]+)/gim);
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

function removeInvalidRightChar(text: string): string {
	let regexValidWordEnd: RegExp = new RegExp(/[\w\d]$/);
	while(!regexValidWordEnd.test(text)) 
		text = text.substring(0, text.length-1);
	return text;
}
