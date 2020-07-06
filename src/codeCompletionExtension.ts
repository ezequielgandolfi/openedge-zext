import * as vscode from 'vscode';
import { ABL_MODE } from './environment';
import { DbfController } from './dbfController';
import { DocumentController } from './documentController';
import { StatementUtil } from './statementUtil';
import { ABL_TYPE, AblMethod, AblVariable as AblField, AblParameter, AblTempTable } from './documentDefinition';
import { Document } from './documentModel';
import { DbTable, DbField } from './dbModel';

export class CodeCompletionExtension {

    static attach(context: vscode.ExtensionContext) {
        let instance = new CodeCompletionExtension();
        instance.registerProviders(context);
    }
    
	private registerProviders(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new TableCompletion(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new MethodCompletion(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new VariableCompletion(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new BufferCompletion(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new ParameterCompletion(), '.'));
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

    static fieldsCompletion(table:DbTable, nameReplacement?:string): vscode.CompletionItem[] {
        return table.fields.map(field => {
            let item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
            item.detail = TableCompletion.fieldDetail(field);
            item.documentation = TableCompletion.fieldDocumentation(field);
            return item;
        });
    }

    static fieldDetail(field: DbField): string {
        return `field ${field.name}`;
    }

    static fieldDocumentation(field: DbField): vscode.MarkdownString {
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

    static tableSnippets(table:DbTable, nameReplacement?:string): vscode.CompletionItem[] {
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

    static methodDetail(method: AblMethod) {
        return `${method.scope} ${method.type} ${method.name}`;
    }

    static methodDocumentation(method: AblMethod): vscode.MarkdownString {
        if (method.params.length > 0) {
            let result = new vscode.MarkdownString();
            method.params.forEach(param => {
                if (param.dataType == ABL_TYPE.BUFFER) {
                    result.appendMarkdown(`- buffer *${param.name}* for ${param.bufferType} *${param.likeType}*\n`);
                }
                else if (param.dataType == ABL_TYPE.TEMP_TABLE) {
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

    static methodSnippet(method: AblMethod): vscode.SnippetString {
        if (method.params.length > 0) {
            let isFirst = true;
            let result: vscode.SnippetString = new vscode.SnippetString();
            result.appendText(`${method.name} (\n`);
            method.params.forEach(param => {
                if (!isFirst)
                    result.appendText(',\n')
                isFirst = false;
                if (param.dataType == ABL_TYPE.BUFFER) {
                    result.appendText(`\tbuffer ${param.likeType}`);
                }
                else if (param.dataType == ABL_TYPE.TEMP_TABLE) {
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
            let variables = [...document.variables.filter(v => !((v.dataType == ABL_TYPE.BUFFER)||(v.dataType == ABL_TYPE.TEMP_TABLE)))];
            // local vars
            if (position) {
                let method = document.methodInPosition(position);
                if (method) {
                    let localVariables = method.localVariables.filter(v => !((v.dataType == ABL_TYPE.BUFFER)||(v.dataType == ABL_TYPE.TEMP_TABLE)));
                    variables = variables.filter(item => !localVariables.find(lp => lp.name.toLowerCase() == item.name.toLowerCase()));
                    variables.push(...localVariables);
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
            // remove parameter variables
            let method = document.methodInPosition(position);
            if (method) {
                let localParams = method.params.filter(v => !((v.dataType == ABL_TYPE.BUFFER)||(v.dataType == ABL_TYPE.TEMP_TABLE)));
                items = items.filter(item => !localParams.find(lp => lp.name.toLowerCase() == item.label.toLowerCase()));
            }
        }
        return items;
    }

    static variableDetail(v: AblField): string {
        return `${v.scope} variable ${v.name}`;
    }

    static variableDocumentation(variable: AblField): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (variable.dataType) {
            result.appendMarkdown(`- **${variable.dataType}** type\n`);
        }
        else if (variable.likeType) {
            result.appendMarkdown(`- like **${variable.likeType}**\n`);
        }
        return result;
    }

}

class BufferCompletion extends CodeCompletionBase {

    protected getCompletionItems(document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 1) {
            // global buffers
            let buffers = [...document.variables.filter(v => v.dataType == ABL_TYPE.BUFFER)];
            // local buffers
            if (words.length == 1) {
                let method = document.methodInPosition(position);
                if (method) {
                    let localParams = method.params.filter(v => v.dataType == ABL_TYPE.BUFFER);
                    // remove global buffers with same name as local buffers
                    buffers = buffers.filter(item => !localParams.find(lp => lp.name.toLowerCase() == item.name.toLowerCase()));
                    buffers.push(...localParams);
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
            // remove parameter buffers
            let method = document.methodInPosition(position);
            if (method) {
                let localParams = method.params.filter(v => v.dataType == ABL_TYPE.BUFFER);
                items = items.filter(item => !localParams.find(lp => lp.name.toLowerCase() == item.label.toLowerCase()));
            }
        }
        return items;
    }

    static bufferDetail(v: AblField): string {
        return `${v.scope} buffer ${v.name}`;
    }

    static bufferDocumentation(variable: AblField): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        result.appendMarkdown(`- **buffer**\n`)
        result.appendMarkdown(`- for ${variable.bufferType} *${variable.likeType}*\n`);
        return result;
    }

}

class ParameterCompletion extends CodeCompletionBase {

    protected get maxDeepLevel(): number {
        return 1;
    }

    protected getCompletionItems(document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 1) {
            let params: AblParameter[] = [];
            // local parameters
            let method = document.methodInPosition(position);
            if (method) {
                params.push(...method.params);
            }
            //
            let paramsCompletion = params.map(p => {
                let kind = vscode.CompletionItemKind.Variable;
                if (p.dataType == ABL_TYPE.BUFFER) {
                    kind = vscode.CompletionItemKind.File;
                }
                else if (p.dataType == ABL_TYPE.TEMP_TABLE) {
                    kind = vscode.CompletionItemKind.File;
                }
                let result = new vscode.CompletionItem(p.name, kind);
                result.detail = ParameterCompletion.parameterDetail(p);
                result.documentation = ParameterCompletion.parameterDocumentation(p);
                return result;
            });
            return paramsCompletion;
        }
        return [];
    }

    static parameterDetail(parameter: AblParameter) {
        let detail = `parameter ${parameter.name}`;
        if (parameter.dataType == ABL_TYPE.BUFFER) {
            detail = `buffer ${detail}`;
        }
        else if (parameter.dataType == ABL_TYPE.TEMP_TABLE) {
            detail = `temp-table ${detail}`;
        }
        if (parameter.direction)
            detail = `${parameter.direction} ${detail}`;
        return detail;
    }

    static parameterDocumentation(parameter: AblParameter): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (parameter.dataType == ABL_TYPE.BUFFER) {
            result.appendMarkdown(`- **buffer**\n`)
            result.appendMarkdown(`- for ${parameter.bufferType} *${parameter.likeType}*\n`);
        }
        else if (parameter.dataType == ABL_TYPE.TEMP_TABLE) {
            result.appendMarkdown(`- direction: *${parameter.direction}*\n`);
            result.appendMarkdown(`- **temp-table**\n`)
        }
        else if (parameter.dataType) {
            result.appendMarkdown(`- direction: *${parameter.direction}*\n`);
            result.appendMarkdown(`- **${parameter.dataType}** type\n`);
        }
        else if (parameter.likeType) {
            result.appendMarkdown(`- direction: *${parameter.direction}*\n`);
            result.appendMarkdown(`- like **${parameter.likeType}**\n`);
        }
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
            let tempsCompletion = document.tempTables.map(tt => {
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
                let paramTempTable = method.params.filter(v => v.dataType == ABL_TYPE.TEMP_TABLE);
                items = items.filter(item => !paramTempTable.find(tt => tt.name.toLowerCase() == item.label.toLowerCase()));
            }
        }
        return items;
    }

    static tempTableDetail(v: AblTempTable): string {
        return `temp-table ${v.name}`;
    }

    static tempTableDocumentation(tempTable: AblTempTable): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        result.appendMarkdown(`- **temp-table** type\n`);
        if (tempTable.referenceTable) {
            result.appendMarkdown(`- like *${tempTable.referenceTable}*\n`);
        }
        return result;
    }

    static fieldsCompletion(tempTable:AblTempTable, nameReplacement?:string): vscode.CompletionItem[] {
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

    static fieldDetail(field: AblField): string {
        return `field ${field.name}`;
    }

    static fieldDocumentation(field: AblField): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (field.dataType) {
            result.appendMarkdown(`- **${field.dataType}** type\n`);
        }
        else if (field.likeType) {
            result.appendMarkdown(`- like **${field.likeType}**\n`);
        }
        return result;
    }

    static tempTableSnippets(tempTable:AblTempTable, nameReplacement?:string): vscode.CompletionItem[] {
        let result: vscode.CompletionItem[] = [];
        // All fields completion snippet
        let snippet = new vscode.SnippetString();
        let isFirst: boolean = true;
        let maxSize = 0;
        let allFields: AblField[] = [
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
