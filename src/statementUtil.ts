import * as vscode from 'vscode';
import { AblSource } from './abl-source';

export interface Statement {
    word?: string;
    wordRange?: vscode.Range;
    statement?: string;
    statementRange?: vscode.Range;
}

export interface MethodParameterSignature {
    name: string;
    activeParameter: number;
}

export class StatementUtil {

    static readonly regexInvalidWordEnd = /[\.|\:|\-|\_|\\|\/]$/;

    static dotSplitStatement(document: vscode.TextDocument, position: vscode.Position) {
        let statementRange = document.getWordRangeAtPosition(position, /[\w\d\-\.]+/);
        if (!statementRange)
            return;
        statementRange = new vscode.Range(statementRange.start, position);
        let statementText = document.getText(statementRange);
        return statementText.split('.');
    }

    static statementAtPosition(document: vscode.TextDocument, position: vscode.Position, escapeEndChars?: boolean): Statement {
        let result: Statement = {};
        result.wordRange = document.getWordRangeAtPosition(position, /[\w\d\-\+]+/);
        if (!result.wordRange)
            return;
        result.word = document.getText(result.wordRange).toLowerCase();
        result.statementRange = document.getWordRangeAtPosition(position, /[\w\d\-\+\.\:\\\/]+/);
        result.statement = document.getText(result.statementRange).toLowerCase();
        if (escapeEndChars !== true) {
            while(StatementUtil.regexInvalidWordEnd.test(result.statement)) 
                result.statement = result.statement.substring(0, result.statement.length-1);
        }
        return result;
    }

    static fileSplitStatement(document: vscode.TextDocument, position: vscode.Position) {
        let statementRange = document.getWordRangeAtPosition(position, /[\w\d\-\.\:\{\/\\]+/);
        if (!statementRange)
            return;
        statementRange = new vscode.Range(statementRange.start, position);
        let statementText = document.getText(statementRange).replace('\\','/');
        if (statementText.startsWith('{'))
            return statementText.substring(1).split('/');
        return [];
    }

    static cleanArray(array: string[]): string[] {
        if (!array)
            return [];
        for (var i = 0; i < array.length; i++) {
            if (array[i] == '') {
                array.splice(i, 1);
                i--;
            }
        }
        return array;
    }

    static nestedMethodName(document: vscode.TextDocument, position: vscode.Position, escapeEndChars?: boolean): MethodParameterSignature {
        let source = new AblSource.Extractor().execute(document);
        let text = source.sourceWithoutStrings;
        let offset = document.offsetAt(position) - 1;
        let level = 0;
        let methodName = '';
        let methodParam = 0;
        let char = '';

        while (/*(level >= 0)&&*/(offset > 0)) {
            char = text.charAt(offset);
            if (char == '(') {
                if (level == 0) {
                    methodName = '';
                }
                level++;
            }
            else if (char == ')') {
                level--;
            }
            else if (level == 0) {
                if (char == ',') {
                    methodParam++;
                }
            }
            else if (level == 1) {
                if (char.match(/[\w\d\-]/i)) {
                    methodName = char + methodName;
                }
                else if (methodName != '') {
                    if (char.match(/[^\s\t\n\r\(\,]/)) {
                        methodName = '';
                        methodParam = 0;
                    }
                    break;
                }
            }
            offset--;
        }
        if (methodName != '') {
            return {
                name: methodName,
                activeParameter: methodParam
            };
        }
        return null;
    }

}
