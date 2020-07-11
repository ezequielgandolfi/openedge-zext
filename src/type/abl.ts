import * as vscode from 'vscode';



//#region Enums
export enum TYPE {
    FIELD = 'field',
    INCLUDE = 'include',
    METHOD = 'method',
    PARAMETER = 'parameter',
    TEMP_TABLE = 'temp-table',
    VARIABLE = 'variable'
}

export enum PARAM_DIRECTION {
    IN = 'input',
    OUT = 'output',
    INOUT = 'input-output',
    RETURN = 'return'
}

export enum VISIBILITY {
    PUBLIC = 'public',
    PROTECTED = 'protected',
    PRIVATE = 'private'
}

export enum SCOPE {
    GLOBAL = 'global',
    LOCAL = 'local',
    PARAMETER = 'parameter'
}

export enum ATTRIBUTE_TYPE {
    BUFFER = 'buffer',
    TEMP_TABLE = 'temp-table'
}

export enum BUFFER_REFERENCE {
    TABLE = 'table',
    TEMP_TABLE = 'temp-table'
}

export enum TYPE_DEFINITION {
    AS = 'as',
    LIKE = 'like'
}

export enum METHOD_KIND {
    PROCEDURE = 'procedure'
}
//#endregion

//#region types

export interface IUri {
    uri?: vscode.Uri;
}

export interface IPosition extends IUri {
    position?: vscode.Position;
}

export interface IRange extends IUri {
    range?: vscode.Range;
}

export interface IType {
    type: any;
}

export interface Field extends IType {
    name: string;
    dataType?: string;
    likeType?: string;
    additional?: string;
}

export interface Variable extends Field, IPosition {
    bufferType?: string;
    position?: vscode.Position;
    uri?: vscode.Uri;
    scope?: SCOPE;
}

export interface Parameter extends Variable {
    direction?: PARAM_DIRECTION;
}

export interface Method extends IType, IRange {
    name: string;
    visibility: VISIBILITY;
    kind: METHOD_KIND;
    range: vscode.Range;
    uri?: vscode.Uri;
    params?: Parameter[];
    localVariables?: Variable[];
}

export interface Include extends IType, IUri {
    name: string;
    uri?: vscode.Uri;
    document?: vscode.TextDocument;
}

export interface TempTable extends IType, IRange {
    name: string;
    fields?: Field[];
    indexes?: any[]; // not used at this moment
    range?: vscode.Range;
    uri?: vscode.Uri;
    referenceTable?: string;
    referenceFields?: Field[];
}
//#endregion

