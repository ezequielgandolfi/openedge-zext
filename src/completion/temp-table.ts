import * as vscode from 'vscode';
import { AblType, AblTypeCheck } from '@oe-zext/types';
import { CodeCompletionBase } from './code-base';
import { AblSource } from '@oe-zext/source';

export class TempTable extends CodeCompletionBase {

    protected getCompletionItems(document: AblSource.Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 2) {
            let tempTable = document.tempTables.find(item => item.name.toLowerCase() == words[0].toLowerCase());
            if (tempTable) {
                return [
                    ...TempTable.fieldsCompletion(tempTable),
                    ...TempTable.tempTableSnippets(tempTable)
                ];
            }
            return [];
        }
        else if (words.length == 1) {
            // global temps
            let tempTables = [...document.tempTables];
            // local params (unnecessary - always have global temps with same name)
            if (position) {
                let method = document.methodInPosition(position);
                if (method) {
                    let params = method.params.filter(v => v.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE);
                    tempTables.push(...params);
                }
            }
            let tempsCompletion = tempTables.map(tt => {
                let result = new vscode.CompletionItem(tt.name, vscode.CompletionItemKind.Struct);
                result.detail = TempTable.tempTableDetail(tt);
                result.documentation = TempTable.tempTableDocumentation(tt);
                return result;
            });
            return tempsCompletion;

        }
        return [];
    }

    protected filterCompletionItems(items: vscode.CompletionItem[], document: AblSource.Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 1) {
            // remove parameter temp-tables
            let method = document.methodInPosition(position);
            if (method) {
                let paramTempTable = method.params.filter(v => v.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE);
                items = items.filter(item => {
                    if (!paramTempTable.find(tt => tt.name.toLowerCase() == item.label.toLowerCase()))
                        return true;
                    return (item.detail.includes(`${AblType.SCOPE.PARAMETER} `));
                });
            }
        }
        return items;
    }

    static tempTableDetail(tempTable: AblType.TempTable | AblType.Parameter): string {
        let detail = `temp-table ${tempTable.name}`;
        if (AblTypeCheck.isParameter(tempTable) && tempTable.direction)
            detail = `${tempTable.direction} ${tempTable.scope} ${detail}`;
        return detail;
    }

    static tempTableDocumentation(tempTable: AblType.TempTable | AblType.Parameter): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (AblTypeCheck.isParameter(tempTable)) {
            result.appendMarkdown(`- Direction: *${tempTable.direction}*\n`);
        }
        result.appendMarkdown(`- Type: *temp-table*\n`);
        return result;
    }

    static fieldsCompletion(tempTable:AblType.TempTable, nameReplacement?:string): vscode.CompletionItem[] {
        let fields = [
            ...(tempTable.referenceFields || []),
            ...tempTable.fields
        ];
        return fields.map(field => {
            let item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
            item.detail = TempTable.fieldDetail(field);
            item.documentation = TempTable.fieldDocumentation(field);
            return item;
        });
    }

    static fieldDetail(field: AblType.Field): string {
        return `field ${field.name}`;
    }

    static fieldDocumentation(field: AblType.Field): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (field.dataType) {
            result.appendMarkdown(`- **${field.dataType}** type\n`);
        }
        else if (field.likeType) {
            result.appendMarkdown(`- like **${field.likeType}**\n`);
        }
        return result;
    }

    static tempTableSnippets(tempTable:AblType.TempTable, nameReplacement?:string): vscode.CompletionItem[] {
        let result: vscode.CompletionItem[] = [];
        // All fields completion snippet
        let snippet = new vscode.SnippetString();
        let isFirst: boolean = true;
        let maxSize = 0;
        let allFields: AblType.Field[] = [
            ...(tempTable.referenceFields || []),
            ...tempTable.fields
        ];
        allFields.forEach(field => { if(field.name.length > maxSize) maxSize = field.name.length });
        allFields.forEach(field => {
            if(isFirst) {
                isFirst = false;
            }
            else {
                snippet.appendText('\n');
                snippet.appendText((nameReplacement || tempTable.name) + '.');
            }
            snippet.appendText(field.name.padEnd(maxSize, ' ') + ' = ');
            snippet.appendTabstop();
        });
        let allFieldsItem = new vscode.CompletionItem('> ALL FIELDS', vscode.CompletionItemKind.Snippet);
        allFieldsItem.detail = 'insert all temp-table fields';
        allFieldsItem.insertText = snippet;
        result.push(allFieldsItem);
        //

        return result;
    }
}
