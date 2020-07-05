import * as vscode from "vscode";

export enum ABL_PARAM_DIRECTION {
    IN = 'input',
    OUT = 'output',
    INOUT = 'input-output',
    RETURN = 'return'
}

export enum ABL_SCOPE {
    PUBLIC = 'public',
    PROTECTED = 'protected',
    PRIVATE = 'private'
}

export enum ABL_BLOCK_SCOPE {
    GLOBAL = 'global',
    LOCAL = 'local'
}

export enum ABL_TYPE {
    BUFFER = 'buffer',
    TEMP_TABLE = 'temp-table'
}

export enum ABL_BUFFER_TYPE {
    TABLE = 'table',
    TEMP_TABLE = 'temp-table'
}

export enum ABL_ASLIKE {
    AS = 'as',
    LIKE = 'like'
}

export enum ABL_METHOD_TYPE {
    PROCEDURE = 'procedure'
}

export interface AblField {
    name: string;
    dataType?: string;
    likeType?: string;
    additional?: string;
}

export interface AblVariable extends AblField {
    bufferType?: string;
    position?: vscode.Position;
    scope?: ABL_BLOCK_SCOPE;
}

export interface AblParameter extends AblVariable {
    direction?: ABL_PARAM_DIRECTION;
}

export interface AblMethod {
    name: string;
    scope: ABL_SCOPE;
    type: ABL_METHOD_TYPE;
    range: vscode.Range;
    params?: AblParameter[];
    localVariables?: AblVariable[];
}

export interface AblInclude {
    name: string;
    uri?: vscode.Uri;
    document?: vscode.TextDocument;
}

export interface AblTempTable {
    name: string;
    fields?: AblField[];
    indexes?: any[];
    range?: vscode.Range;
    referenceTable?: string;
    referenceFields?: AblField[];
}

