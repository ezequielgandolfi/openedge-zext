import * as vscode from 'vscode';

export interface ICheckResult {
	file: string;
	line: number;
	column: number;
	msg: string;
	severity: string;
}

export class TextSelection {
    word: string;
    wordRange: vscode.Range;
    statement: string;
    statementRange: vscode.Range;
}

export enum SYMBOL_TYPE {
    METHOD = 'Method',
    INCLUDE = 'Include File',
    LOCAL_VAR = 'Local Variable',
    GLOBAL_VAR = 'Global Variable',
    LOCAL_PARAM = 'Local Parameter',
    GLOBAL_PARAM = 'Global Parameter',
    TEMPTABLE = 'Temp-table'
}

export enum ABL_ASLIKE {
    AS = 'as',
    LIKE = 'like'
}

export enum ABL_PARAM_DIRECTION {
    IN = 'input',
    OUT = 'output',
    INOUT = 'input-output'
}

export interface ABLFieldDefinition {
    label: string;
    kind: vscode.CompletionItemKind;
    detail: string;
    dataType: string;
    mandatory: boolean;
    format: string;
}
export interface ABLIndexDefinition {
    label: string;
    kind: vscode.CompletionItemKind;
    detail: string;
    fields: ABLFieldDefinition[];
    unique: boolean;
    primary: boolean;
}
export class ABLTableDefinition {
    filename: string;
    label: string;
    kind: vscode.CompletionItemKind;
    detail: string;
    pkList: string;
    fields: ABLVariable[];
    indexes: ABLIndexDefinition[];
    completionFields: vscode.CompletionList;
    completionIndexes: vscode.CompletionList;
    completionAdditional: vscode.CompletionList;
    completion: vscode.CompletionList;

    get allFields(): ABLVariable[] {
        return this.fields;
    }
}

export class ABLVariable {
    name: string;
    asLike: ABL_ASLIKE;
    dataType: string;
    line: number;
}

export class ABLMethod {
    name: string;
    lineAt: number;
    lineEnd: number;
    params: ABLParameter[];
}

export class ABLParameter extends ABLVariable {
    direction: ABL_PARAM_DIRECTION;
}

export class ABLInclude {
    name: string;
    fsPath: string;
}

export class ABLTempTable extends ABLTableDefinition {
    line: number;
    likeTable: string;
    likeFields: ABLVariable[];

    get allFields(): ABLVariable[] {
        if (this.likeFields)
            return [...this.likeFields,...this.fields];
        return this.fields;
    }
}
