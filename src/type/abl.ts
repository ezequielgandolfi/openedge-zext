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
interface Typed {
    type: any;
}

export interface Field extends Typed {
    name: string;
    dataType?: string;
    likeType?: string;
    additional?: string;
}

export interface Variable extends Field {
    bufferType?: string;
    position?: vscode.Position;
    scope?: SCOPE;
}

export interface Parameter extends Variable {
    direction?: PARAM_DIRECTION;
}

export interface Method extends Typed {
    name: string;
    visibility: VISIBILITY;
    kind: METHOD_KIND;
    range: vscode.Range;
    params?: Parameter[];
    localVariables?: Variable[];
}

export interface Include extends Typed {
    name: string;
    uri?: vscode.Uri;
    document?: vscode.TextDocument;
}

export interface TempTable extends Typed {
    name: string;
    fields?: Field[];
    indexes?: any[]; // not used at this moment
    range?: vscode.Range;
    referenceTable?: string;
    referenceFields?: Field[];
}
//#endregion

