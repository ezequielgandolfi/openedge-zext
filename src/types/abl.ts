import * as vscode from 'vscode';

export namespace AblType {
    
    //#region Enums
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
    
    export enum METHOD_TYPE {
        PROCEDURE = 'procedure'
    }
    //#endregion

    //#region types
    export interface Field {
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
    
    export interface Method {
        name: string;
        visibility: VISIBILITY;
        type: METHOD_TYPE;
        range: vscode.Range;
        params?: Parameter[];
        localVariables?: Variable[];
    }
    
    export interface Include {
        name: string;
        uri?: vscode.Uri;
        document?: vscode.TextDocument;
    }
    
    export interface TempTable {
        name: string;
        fields?: Field[];
        indexes?: any[]; // not used at this moment
        range?: vscode.Range;
        referenceTable?: string;
        referenceFields?: Field[];
    }
    //#endregion
    
}
