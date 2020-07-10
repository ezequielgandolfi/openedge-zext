import * as vscode from 'vscode';
import { AblType, AblTypeCheck } from '../type';
import { Document } from '../documentModel';
import { CodeCompletionBase } from './code-base';

export class Variable extends CodeCompletionBase {

    protected getCompletionItems(document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 1) {
            // global vars
            let variables = [...document.variables.filter(v => !((v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER)||(v.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE)))];
            // local vars/params
            if (position) {
                let method = document.methodInPosition(position);
                if (method) {
                    let localVariables = method.localVariables.filter(v => !((v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER)||(v.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE)));
                    let params = method.params.filter(v => !((v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER)||(v.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE)));
                    variables.push(...localVariables,...params);
                }
            }
            let variableCompletion = variables.map(v => {
                let result = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
                result.detail = Variable.variableDetail(v);
                result.documentation = Variable.variableDocumentation(v);
                return result;
            });
            
            return variableCompletion;
        }
        return [];
    }

    protected filterCompletionItems(items: vscode.CompletionItem[], document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 1) {
            // remove global vars when local/param declared
            let method = document.methodInPosition(position);
            if (method) {
                let localVars = method.localVariables.filter(v => !((v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER)||(v.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE)));
                let params = method.params.filter(v => !((v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER)||(v.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE)));
                items = items.filter(item => {
                    if (!localVars.find(lp => lp.name.toLowerCase() == item.label.toLowerCase()) && !params.find(lp => lp.name.toLowerCase() == item.label.toLowerCase()))
                        return true;
                    return !(item.detail.startsWith(AblType.SCOPE.GLOBAL));
                });
            }
        }
        return items;
    }

    static variableDetail(variable: AblType.Variable | AblType.Parameter): string {
        let detail = `${variable.scope} variable ${variable.name}`;
        if (AblTypeCheck.isParameter(variable) && variable.direction)
            detail = `${variable.direction} ${detail}`;
        return detail;
    }

    static variableDocumentation(variable: AblType.Variable | AblType.Parameter): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (AblTypeCheck.isParameter(variable)) {
            result.appendMarkdown(`- Direction: *${variable.direction}*\n`);
        }
        if (variable.dataType) {
            result.appendMarkdown(`- Type: *${variable.dataType}*\n`);
        }
        else if (variable.likeType) {
            result.appendMarkdown(`- Like: *${variable.likeType}*\n`);
        }
        return result;
    }

}
