import * as vscode from 'vscode';

export class StatementUtil {

    // static getText(document: vscode.TextDocument, position: vscode.Position, escapeEndChars?: boolean) {
    //     let regexInvalidWordEnd: RegExp = new RegExp(/[\.|\:|\-|\_|\\|\/]$/);

    //     let res:any = {};
    //     res.wordRange = document.getWordRangeAtPosition(position, /[\w\d\-\+]+/);
    //     if (!res.wordRange)
    //         return;
    //     res.word = document.getText(res.wordRange).toLowerCase();
    //     res.statementRange = document.getWordRangeAtPosition(position, /[\w\d\-\+\.\:\\\/]+/);
    //     res.statement = document.getText(res.statementRange).toLowerCase();
    //     if (escapeEndChars !== true) {
    //         while(regexInvalidWordEnd.test(res.statement)) 
    //         res.statement = res.statement.substring(0, res.statement.length-1);
    //     }
    //     return res;
    // }

    static dotSplitStatement(document: vscode.TextDocument, position: vscode.Position) {
        let statementRange = document.getWordRangeAtPosition(position, /[\w\d\-\.]+/);
        if (!statementRange)
            return;
        statementRange = new vscode.Range(statementRange.start, position);
        let statementText = document.getText(statementRange);
        return statementText.split('.');
    }

}
