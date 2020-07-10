import * as vscode from 'vscode';

export interface Statement {
    word?: string;
    wordRange?: vscode.Range;
    statement?: string;
    statementRange?: vscode.Range;
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

}
