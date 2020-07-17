import * as vscode from 'vscode';
import { AblType } from '@oe-zext/types';
import { CodeCompletionBase } from './code-base';
import { AblSource } from '../abl-source';

export class Method extends CodeCompletionBase {

    protected getCompletionItems(document: AblSource.Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 1) {
            let methodCompletion = document.methods.map(method => {
                let result = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
                result.detail = Method.methodDetail(method);
                result.documentation = Method.methodDocumentation(method);
                result.insertText = Method.methodSnippet(method);
                return result;
            });
            return methodCompletion;
        }
        return [];
    }

    static methodDetail(method: AblType.Method) {
        return `${method.visibility} ${method.type} ${method.name}`;
    }

    static methodDocumentation(method: AblType.Method): vscode.MarkdownString {
        if (method.params.length > 0) {
            let result = new vscode.MarkdownString();
            method.params.forEach(param => {
                if (param.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                    result.appendMarkdown(`- buffer *${param.name}* for ${param.bufferType} *${param.likeType}*\n`);
                }
                else if (param.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE) {
                    result.appendMarkdown(`- ${param.direction} for temp-table *${param.name}*\n`);
                }
                else {
                    result.appendMarkdown(`- ${param.direction} *${param.name}*\n`);
                }
            });
            return result;
        }
        return null;
    }

    static methodSnippet(method: AblType.Method): vscode.SnippetString {
        if (method.params.length > 0) {
            let isFirst = true;
            let result: vscode.SnippetString = new vscode.SnippetString();
            result.appendText(`${method.name} (\n`);
            method.params.forEach(param => {
                if (!isFirst)
                    result.appendText(',\n')
                isFirst = false;
                if (param.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                    result.appendText(`\tbuffer ${param.likeType}`);
                }
                else if (param.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE) {
                    result.appendText(`\t${param.direction} table ${param.name}`);
                }
                else {
                    result.appendText(`\t${param.direction} ${param.name}`);
                }
            });
            return result.appendText(').');
        }
        return null;
    }

}
