import * as vscode from 'vscode';
import { AblType, AblTypeCheck } from '@oe-zext/types';
import { CodeCompletionBase } from './code-base';
import { Table } from './table';
import { TempTable } from './temp-table';
import { AblDatabase } from '@oe-zext/database';
import { AblSource } from '@oe-zext/source';

export class Buffer extends CodeCompletionBase {

    protected getCompletionItems(document: AblSource.Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 2) {
            let buffer: AblType.Variable | AblType.Parameter;
            // local buffers
            if (position) {
                let method = document.methodInPosition(position);
                if (method) {
                    buffer = (
                        method.localVariables.find(v => (v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) && (v.name.toLowerCase() == words[0].toLowerCase()))
                        ||
                        method.params.find(v => (v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) && (v.name.toLowerCase() == words[0].toLowerCase()))
                    );
                }
            }
            // global buffers
            if (!buffer)
                buffer = document.variables.find(v => (v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) && (v.name.toLowerCase() == words[0].toLowerCase()));
            if (!buffer)
                return [];
            // find temp-table referente
            if (buffer.bufferType == AblType.BUFFER_REFERENCE.TEMP_TABLE) {
                let tempTable = document.tempTables.find(item => item.name.toLowerCase() == buffer.likeType.toLowerCase());
                if (tempTable) {
                    return [
                        ...TempTable.fieldsCompletion(tempTable, buffer.name),
                        ...TempTable.tempTableSnippets(tempTable, buffer.name)
                    ];
                }
            }
            else if (buffer.bufferType == AblType.BUFFER_REFERENCE.TABLE) {
                let table = AblDatabase.Controller.getInstance().getTable(buffer.likeType);
                if (table) {
                    return [
                        ...Table.fieldsCompletion(table, buffer.name),
                        ...Table.tableSnippets(table, buffer.name)
                    ];
                }
            }
            return [];
        }
        else if (words.length == 1) {
            // global buffers
            let buffers: Array<AblType.Variable | AblType.Parameter> = [...document.variables.filter(v => v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER)];
            // local buffers
            if (position) {
                let method = document.methodInPosition(position);
                if (method) {
                    let localVariables = method.localVariables.filter(v => v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER);
                    let params = method.params.filter(v => v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER);
                    buffers.push(...localVariables,...params);
                }
            }
            let bufferCompletion = buffers.map(v => {
                let result = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.File);
                result.detail = Buffer.bufferDetail(v);
                result.documentation = Buffer.bufferDocumentation(v);
                return result;
            });
            return bufferCompletion;
        }
        return [];
    }

    protected filterCompletionItems(items: vscode.CompletionItem[], document: AblSource.Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 1) {
            // remove global vars when local/param declared
            let method = document.methodInPosition(position);
            if (method) {
                let localVars = method.localVariables.filter(v => v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER);
                let params = method.params.filter(v => v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER);
                items = items.filter(item => {
                    if (!localVars.find(lp => lp.name.toLowerCase() == item.label.toLowerCase()) && !params.find(lp => lp.name.toLowerCase() == item.label.toLowerCase()))
                        return true;
                    return !(item.detail.startsWith(AblType.SCOPE.GLOBAL));
                });
            }
        }
        return items;
    }

    static bufferDetail(variable: AblType.Variable | AblType.Parameter): string {
        let detail = `${variable.scope} buffer ${variable.name}`;
        if (AblTypeCheck.isParameter(variable) && variable.direction)
            detail = `${variable.direction} ${detail}`;
        return detail;
    }

    static bufferDocumentation(variable: AblType.Variable | AblType.Parameter): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (AblTypeCheck.isParameter(variable)) {
            result.appendMarkdown(`- Direction: *${variable.direction}*\n`);
        }
        result.appendMarkdown(`- Type: *buffer*\n`);
        result.appendMarkdown(`- for ${variable.bufferType} *${variable.likeType}*\n`);
        return result;
    }

}
