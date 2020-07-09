import * as vscode from 'vscode';
import { ABL_MODE } from './environment';
import { DbfController } from './dbfController';
import { DocumentController } from './documentController';
import { StatementUtil } from './statementUtil';
import { AblType, AblTypeCheck, DbType } from './types';
import { Document } from './documentModel';

class CodeCompletionExtension {

    static attach(context: vscode.ExtensionContext) {
        let instance = new CodeCompletionExtension();
        instance.registerProviders(context);
    }
    
	private registerProviders(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new TableCompletion(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new MethodCompletion(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new VariableCompletion(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new BufferCompletion(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new TempTableCompletion(), '.'));
    }
    
}

class CodeCompletionBase implements vscode.CompletionItemProvider {

    protected documentController = DocumentController.getInstance();

    provideCompletionItems(textDocument: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let document = this.documentController.getDocument(textDocument);
        if (document) {
            let words = this.splitStatement(textDocument, position);
            if ((!words) || (words.length == 0))
                words = [''];
            let completionItems = this.getCompletion(document, 1,words, textDocument, position);
            completionItems = this.filterCompletionItems(completionItems, document, words, textDocument, position);
            return new vscode.CompletionList([...completionItems]);
        }
        return;
    }

    protected splitStatement(document: vscode.TextDocument, position: vscode.Position): string[] {
        return StatementUtil.dotSplitStatement(document, position);
    }

    protected get maxDeepLevel(): number {
        return 2;
    }

    private getCompletion(document: Document, deepLevel: number, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        let result = [
            ...this.getCompletionItems(document, words, textDocument, position),
        ];
        if (deepLevel < this.maxDeepLevel) {
            document?.includes.forEach(item => {
                if (item.document) {
                    let itemDocument = this.documentController.getDocument(item.document);
                    if (itemDocument) {
                        let itemResult = this.getCompletion(itemDocument, deepLevel + 1, words, item.document);
                        if (itemResult?.length > 0)
                            result.push(...itemResult);
                    }
                }
            });
        }
        return result;
    }
    

    protected getCompletionItems(document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        return [];
    }

    protected filterCompletionItems(items: vscode.CompletionItem[], document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        return items;
    }


}

class TableCompletion implements vscode.CompletionItemProvider {

    private tableCompletion: vscode.CompletionItem[];

    constructor() {
        DbfController.getInstance().onChange(db => this.resetTableCompletion());
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let words = StatementUtil.dotSplitStatement(document, position);
        if (words.length == 2) {
            let table = DbfController.getInstance().getTable(words[0]);
            if (table) {
                return [
                    ...TableCompletion.fieldsCompletion(table),
                    ...TableCompletion.tableSnippets(table)
                ];
            }
        }
        else if (words.length == 1) {
            return new vscode.CompletionList([...this.getStatementCompletion()]);
        }
        return;
    }

    private getStatementCompletion() {
        if (!this.tableCompletion)
            this.setTableCompletion();
        return this.tableCompletion;
    }

    private setTableCompletion() {
        this.tableCompletion = DbfController.getInstance().getCollection().map(table => {
            let pkFields = table.indexes.find(i => i.isPK)?.fields.join(', ');
            let r = new vscode.CompletionItem(table.name, vscode.CompletionItemKind.File);
            r.detail = table.description;
            let doc = new vscode.MarkdownString();
            doc.appendMarkdown(`- table *${table.name}*\n`);
            if (pkFields)
                doc.appendMarkdown(`- key: *${pkFields}*\n`);
            r.documentation = doc;
            return r;
        });
    }

    private resetTableCompletion() {
        this.tableCompletion = null;
    }

    static fieldsCompletion(table:DbType.Table, nameReplacement?:string): vscode.CompletionItem[] {
        return table.fields.map(field => {
            let item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
            item.detail = TableCompletion.fieldDetail(field);
            item.documentation = TableCompletion.fieldDocumentation(field);
            return item;
        });
    }

    static fieldDetail(field: DbType.Field): string {
        return `field ${field.name}`;
    }

    static fieldDocumentation(field: DbType.Field): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (field.isPK)
            result.appendMarkdown(`- **Primary Key**\n`);
        else if (field.isKey)
            result.appendMarkdown(`- **Used in index**\n`);
        if (field.mandatory)
            result.appendMarkdown(`- **Mandatory**\n`);
        result.appendMarkdown(`- Label: *'${field.description}'*\n`);
        result.appendMarkdown(`- Type: *${field.type}*\n`);
        result.appendMarkdown(`- Format *${field.format}*\n`);
        return result;
    }

    static tableSnippets(table:DbType.Table, nameReplacement?:string): vscode.CompletionItem[] {
        let result: vscode.CompletionItem[] = [];

        // All fields completion snippet
        let snippet = new vscode.SnippetString();
        let isFirst: boolean = true;
        let maxSize = 0;
        table.fields.forEach(field => { if(field.name.length > maxSize) maxSize = field.name.length });
        table.fields.forEach(field => {
            if(isFirst) {
                isFirst = false;
            }
            else {
                snippet.appendText('\n');
                snippet.appendText((nameReplacement || table.name) + '.');
            }
            snippet.appendText(field.name.padEnd(maxSize, ' ') + ' = ');
            snippet.appendTabstop();
        });
        let allFieldsItem = new vscode.CompletionItem('>ALL FIELDS', vscode.CompletionItemKind.Snippet);
        allFieldsItem.detail = 'insert all table fields';
        allFieldsItem.insertText = snippet;
        result.push(allFieldsItem);
        // indexes
        table.indexes.forEach(index => {
            if (!index.fields) return;
            let item = new vscode.CompletionItem(index.name, vscode.CompletionItemKind.Snippet);
            let snippet = new vscode.SnippetString();
            let isFirst = true;
            maxSize = 0;
            index.fields.forEach(fieldName => { if(fieldName.length > maxSize) maxSize = fieldName.length });
            index.fields.forEach(fieldName => {
                if(isFirst) {
                    isFirst = false;
                }
                else {
                    snippet.appendText('\n');
                    snippet.appendText((nameReplacement || table.name) + '.');
                }
                snippet.appendText(fieldName.padEnd(maxSize, ' ') + ' = ');
                snippet.appendTabstop();
            });
            item.insertText = snippet;
            item.detail = index.fields.join(', ');
            if (index.isPK) {
                item.label = '>INDEX (PK) ' + item.label;
                item.detail = 'Primary Key, Fields: ' + item.detail;
            }
            else if (index.isUnique) {
                item.label = '>INDEX (U) ' + item.label; 
                item.detail = 'Unique Index, Fields: ' + item.detail;
            }
            else {
                item.label = '>INDEX ' + item.label;
                item.detail = 'Index, Fields: ' + item.detail;
            }
            result.push(item);
        });
        //

        return result;
    }

}

class MethodCompletion extends CodeCompletionBase {

    protected getCompletionItems(document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 1) {
            let methodCompletion = document.methods.map(method => {
                let result = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
                result.detail = MethodCompletion.methodDetail(method);
                result.documentation = MethodCompletion.methodDocumentation(method);
                result.insertText = MethodCompletion.methodSnippet(method);
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

class VariableCompletion extends CodeCompletionBase {

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
                result.detail = VariableCompletion.variableDetail(v);
                result.documentation = VariableCompletion.variableDocumentation(v);
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

class BufferCompletion extends CodeCompletionBase {

    protected getCompletionItems(document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 2) {
            let buffer: AblType.Variable;
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
                        ...TempTableCompletion.fieldsCompletion(tempTable, buffer.name),
                        ...TempTableCompletion.tempTableSnippets(tempTable, buffer.name)
                    ];
                }
            }
            else if (buffer.bufferType == AblType.BUFFER_REFERENCE.TABLE) {
                let table = DbfController.getInstance().getTable(buffer.likeType);
                if (table) {
                    return [
                        ...TableCompletion.fieldsCompletion(table, buffer.name),
                        ...TableCompletion.tableSnippets(table, buffer.name)
                    ];
                }
            }
            return [];
        }
        else if (words.length == 1) {
            // global buffers
            let buffers = [...document.variables.filter(v => v.dataType == AblType.ATTRIBUTE_TYPE.BUFFER)];
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
                result.detail = BufferCompletion.bufferDetail(v);
                result.documentation = BufferCompletion.bufferDocumentation(v);
                return result;
            });
            return bufferCompletion;
        }
        return [];
    }

    protected filterCompletionItems(items: vscode.CompletionItem[], document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
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

    static bufferDetail(variable: AblType.Variable): string {
        let detail = `${variable.scope} buffer ${variable.name}`;
        if (AblTypeCheck.isParameter(variable) && variable.direction)
            detail = `${variable.direction} ${detail}`;
        return detail;
    }

    static bufferDocumentation(variable: AblType.Variable): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (AblTypeCheck.isParameter(variable)) {
            result.appendMarkdown(`- Direction: *${variable.direction}*\n`);
        }
        result.appendMarkdown(`- Type: *buffer*\n`);
        result.appendMarkdown(`- for ${variable.bufferType} *${variable.likeType}*\n`);
        return result;
    }

}

class TempTableCompletion extends CodeCompletionBase {

    protected getCompletionItems(document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 2) {
            let tempTable = document.tempTables.find(item => item.name.toLowerCase() == words[0].toLowerCase());
            if (tempTable) {
                return [
                    ...TempTableCompletion.fieldsCompletion(tempTable),
                    ...TempTableCompletion.tempTableSnippets(tempTable)
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
                result.detail = TempTableCompletion.tempTableDetail(tt);
                result.documentation = TempTableCompletion.tempTableDocumentation(tt);
                return result;
            });
            return tempsCompletion;

        }
        return [];
    }

    protected filterCompletionItems(items: vscode.CompletionItem[], document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
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
            item.detail = TempTableCompletion.fieldDetail(field);
            item.documentation = TempTableCompletion.fieldDocumentation(field);
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
