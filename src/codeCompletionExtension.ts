import * as vscode from 'vscode';
import { ABL_MODE } from './environment';
import { DbfController } from './dbfController';
import { DocumentController } from './documentController';
import { StatementUtil } from './statementUtil';
import { ABL_TYPE, AblMethod, AblVariable, AblParameter } from './documentDefinition';
import { Document } from './documentModel';

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
            return new vscode.CompletionList([...this.getCompletion(document, 1,words, textDocument, position)]);
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

}

class TableCompletion implements vscode.CompletionItemProvider {

    private tableCompletion: vscode.CompletionItem[];

    constructor() {
        DbfController.getInstance().onChange(db => this.resetTableCompletion());
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let words = StatementUtil.dotSplitStatement(document, position);
        if (words.length == 2) {

            // TODO

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

// class MethodCompletionOK implements vscode.CompletionItemProvider {

//     public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
//         let words = StatementUtil.dotSplitStatement(document, position);
//         if (words.length == 2) {

//             // TODO

//         }
//         else if (words.length == 1) {
//             return new vscode.CompletionList([...this.getStatementCompletion(document,position)]);
//         }
//         return;
//     }

//     private getStatementCompletion(document: vscode.TextDocument, position?: vscode.Position) {
//         let result = [
//             ...this.getMethodCompletion(document),
//         ];
//         // get external item completion for 1st level includes only...
//         if (position) {
//             DocumentController.getInstance().getDocument(document)?.includes.forEach(item => {
//                 if (item.document) {
//                     let itemResult = this.getStatementCompletion(item.document);
//                     if (itemResult?.length > 0)
//                         result.push(...itemResult);
//                 }
//             });
//         }
//         return result;
//     }

//     private getMethodCompletion(document: vscode.TextDocument) {
//         let methodCompletion = DocumentController.getInstance().getDocument(document)?.methods.map(method => {
//             let result = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
//             result.detail = `${method.scope} ${method.type} ${method.name}`;
//             result.documentation = this.getMethodDocumentation(method);
//             result.insertText = this.getMethodSnippet(method);
//             return result;
//         });
//         return methodCompletion;
//     }

//     private getMethodDocumentation(method: AblMethod): vscode.MarkdownString {
//         if (method.params.length > 0) {
//             let result = new vscode.MarkdownString();
//             method.params.forEach(param => {
//                 if (param.dataType == ABL_TYPE.BUFFER) {
//                     result.appendMarkdown(`- buffer *${param.name}* for ${param.bufferType} *${param.likeType}*\n`);
//                 }
//                 else if (param.dataType == ABL_TYPE.TEMP_TABLE) {
//                     result.appendMarkdown(`- ${param.direction} for temp-table *${param.name}*\n`);
//                 }
//                 else {
//                     result.appendMarkdown(`- ${param.direction} *${param.name}*\n`);
//                 }
//             });
//             return result;
//         }
//         return null;
//     }

//     private getMethodSnippet(method: AblMethod): vscode.SnippetString {
//         if (method.params.length > 0) {
//             let isFirst = true;
//             let result: vscode.SnippetString = new vscode.SnippetString();
//             result.appendText(`${method.name} (\n`);
//             method.params.forEach(param => {
//                 if (!isFirst)
//                     result.appendText(',\n')
//                 isFirst = false;
//                 if (param.dataType == ABL_TYPE.BUFFER) {
//                     result.appendText(`\tbuffer ${param.likeType}`);
//                 }
//                 else if (param.dataType == ABL_TYPE.TEMP_TABLE) {
//                     result.appendText(`\t${param.direction} table ${param.name}`);
//                 }
//                 else {
//                     result.appendText(`\t${param.direction} ${param.name}`);
//                 }
//             });
//             return result.appendText(').');
//         }
//         return null;
//     }

// }

class VariableCompletion extends CodeCompletionBase {

    protected getCompletionItems(document: Document, words: string[], textDocument: vscode.TextDocument, position?: vscode.Position): vscode.CompletionItem[] {
        if (words.length == 1) {
            // global variables
            let variables = [...document.variables];
            // local variables
            if (position) {
                let method = document.methodInPosition(position);
                if (method) {
                    
                    // TODO - remove global variables with same name

                    variables.push(...method.localVariables);
                }
            }
            //
            let variableCompletion = variables.filter(v => !((v.dataType == ABL_TYPE.BUFFER)||(v.dataType == ABL_TYPE.TEMP_TABLE))).map(v => {
                let result = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
                result.detail = VariableCompletion.variableDetail(v);
                result.documentation = VariableCompletion.variableDocumentation(v);
                return result;
            });
            return variableCompletion;
        }
        return [];
    }

    static variableDetail(v: AblVariable): string {
        return `${v.scope} variable ${v.name}`;
    }

    static variableDocumentation(variable: AblVariable): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (variable.dataType) {
            result.appendMarkdown(`- **${variable.dataType}** type`);
        }
        else if (variable.likeType) {
            result.appendMarkdown(`- like **${variable.likeType}**`);
        }
        return result;
    }

}

// class VariableCompletionOK implements vscode.CompletionItemProvider {

//     public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
//         let words = StatementUtil.dotSplitStatement(document, position);
//         if (words.length == 2) {

//             // TODO

//         }
//         else if (words.length == 1) {
//             return new vscode.CompletionList([...this.getStatementCompletion(document,position)]);
//         }
//         return;
//     }

//     private getStatementCompletion(document: vscode.TextDocument, position?: vscode.Position) {
//         let result = [
//             ...this.getVariableCompletion(document, position),
//         ];
//         // get external item completion for 1st level includes only...
//         if (position) {
//             DocumentController.getInstance().getDocument(document)?.includes.forEach(item => {
//                 if (item.document) {
//                     let itemResult = this.getStatementCompletion(item.document);
//                     if (itemResult?.length > 0)
//                         result.push(...itemResult);
//                 }
//             });
//         }
//         return result;
//     }

//     private getVariableCompletion(document: vscode.TextDocument, position?: vscode.Position) {
//         let doc = DocumentController.getInstance().getDocument(document);
//         if (doc) {
//             // global variables
//             let variables = [...doc.variables];
//             // local variables
//             if (position) {
//                 let method = doc.methodInPosition(position);
//                 if (method) {
//                     variables.push(...method.localVariables);
//                 }
//             }
//             //
//             let variableCompletion = variables.filter(v => !((v.dataType == ABL_TYPE.BUFFER)||(v.dataType == ABL_TYPE.TEMP_TABLE))).map(v => {
//                 let result = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
//                 result.detail = VariableCompletion.variableDetail(v);
//                 result.documentation = VariableCompletion.variableDocumentation(v);
//                 return result;
//             });
//             return variableCompletion;
//         }
//         return [];
//     }

//     static variableDetail(v: AblVariable): string {
//         return `${v.scope} variable ${v.name}`;
//     }

//     static variableDocumentation(variable: AblVariable): vscode.MarkdownString {
//         let result = new vscode.MarkdownString();
//         if (variable.dataType) {
//             result.appendMarkdown(`- **${variable.dataType}** type`);
//         }
//         else if (variable.likeType) {
//             result.appendMarkdown(`- like **${variable.likeType}**`);
//         }
//         return result;
//     }

// }

class BufferCompletion implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let words = StatementUtil.dotSplitStatement(document, position);
        if (words.length == 2) {

            // TODO

        }
        else if (words.length == 1) {
            return new vscode.CompletionList([...this.getStatementCompletion(document,position)]);
        }
        return;
    }

    private getStatementCompletion(document: vscode.TextDocument, position?: vscode.Position) {
        let result = [
            ...this.getBufferCompletion(document, position),
        ];
        // get external item completion for 1st level includes only...
        if (position) {
            DocumentController.getInstance().getDocument(document)?.includes.forEach(item => {
                if (item.document) {
                    let itemResult = this.getStatementCompletion(item.document);
                    if (itemResult?.length > 0)
                        result.push(...itemResult);
                }
            });
        }
        return result;
    }

    private getBufferCompletion(document: vscode.TextDocument, position?: vscode.Position) {
        let doc = DocumentController.getInstance().getDocument(document);
        if (doc) {
            // global variables
            let variables = [...doc.variables];
            // local variables
            if (position) {
                let method = doc.methodInPosition(position);
                if (method) {
                    variables.push(...method.localVariables);
                }
            }
            //
            let bufferCompletion = variables.filter(v => v.dataType == ABL_TYPE.BUFFER).map(v => {
                let result = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.File);
                result.detail = BufferCompletion.bufferDetail(v);
                result.documentation = BufferCompletion.bufferDocumentation(v);
                return result;
            });
            return bufferCompletion;
        }
        return [];
    }

    static bufferDetail(v: AblVariable): string {
        return `${v.scope} buffer ${v.name}`;
    }

    static bufferDocumentation(variable: AblVariable): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        result.appendMarkdown(`- **buffer**\n`)
        result.appendMarkdown(`- for ${variable.bufferType} *${variable.likeType}*`);
        return result;
    }

}

class ParameterCompletion implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let words = StatementUtil.dotSplitStatement(document, position);
        if (words.length == 2) {

            // TODO

        }
        else if (words.length == 1) {
            return new vscode.CompletionList([...this.getStatementCompletion(document,position)]);
        }
        return;
    }

    private getStatementCompletion(document: vscode.TextDocument, position?: vscode.Position) {
        let result = [
            ...this.getParameterCompletion(document, position)
        ];
        // get external item completion for 1st level includes only...
        // if (position) {
        //     DocumentController.getInstance().getDocument(document)?.includes.forEach(item => {
        //         if (item.document) {
        //             let itemResult = this.getStatementCompletion(item.document);
        //             if (itemResult?.length > 0)
        //                 result.push(...itemResult);
        //         }
        //     });
        // }
        return result;
    }

    private getParameterCompletion(document: vscode.TextDocument, position?: vscode.Position) {
        if (!position)
            return [];
        let doc = DocumentController.getInstance().getDocument(document);
        if (doc) {
            let params: AblParameter[] = [];
            // local parameters
            let method = doc.methodInPosition(position);
            if (method) {
                params.push(...method.params);
            }
            //
            // TODO - ignore buffer and temp-table ??
            //
            let paramsCompletion = params.map(p => {
                let kind = vscode.CompletionItemKind.Variable;
                let detail = `parameter ${p.name}`;
                if (p.dataType == ABL_TYPE.BUFFER) {
                    kind = vscode.CompletionItemKind.File;
                    detail = `buffer ${detail}`;
                }
                else if (p.dataType == ABL_TYPE.TEMP_TABLE) {
                    kind = vscode.CompletionItemKind.File;
                    detail = `temp-table ${detail}`;
                }
                let result = new vscode.CompletionItem(p.name, kind);
                if (p.direction)
                    detail = `${p.direction} ${detail}`;
                result.detail = detail;
                result.documentation = this.getParameterDocumentation(p);
                return result;
            });
            return paramsCompletion;
        }
        return [];
    }

    private getParameterDocumentation(parameter: AblParameter): vscode.MarkdownString {
        let result = new vscode.MarkdownString();
        if (parameter.dataType == ABL_TYPE.BUFFER) {
            result.appendMarkdown(`- **buffer**\n`)
            result.appendMarkdown(`- for ${parameter.bufferType} *${parameter.likeType}*`);
        }
        else if (parameter.dataType == ABL_TYPE.TEMP_TABLE) {
            result.appendMarkdown(`- direction: *${parameter.direction}*\n`);
            result.appendMarkdown(`- **temp-table**\n`)
        }
        else if (parameter.dataType) {
            result.appendMarkdown(`- direction: *${parameter.direction}*\n`);
            result.appendMarkdown(`- **${parameter.dataType}** type`);
        }
        else if (parameter.likeType) {
            result.appendMarkdown(`- direction: *${parameter.direction}*\n`);
            result.appendMarkdown(`- like **${parameter.likeType}**`);
        }
        return result;
    }

}

class TempTableCompletion implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let words = StatementUtil.dotSplitStatement(document, position);
        if (words.length == 2) {

            // TODO

        }
        else if (words.length == 1) {
            return new vscode.CompletionList([...this.getStatementCompletion(document,position)]);
        }
        return;
    }

    private getStatementCompletion(document: vscode.TextDocument, position?: vscode.Position) {
        let result = [
            ...this.getTempTableCompletion(document),
        ];
        // get external item completion for 1st level includes only...
        if (position) {
            DocumentController.getInstance().getDocument(document)?.includes.forEach(item => {
                if (item.document) {
                    let itemResult = this.getStatementCompletion(item.document);
                    if (itemResult?.length > 0)
                        result.push(...itemResult);
                }
            });
        }
        return result;
    }

    private getTempTableCompletion(document: vscode.TextDocument) {
        // let methodCompletion = DocumentController.getInstance().getDocument(document)?.methods.map(method => {
        //     let result = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
        //     result.detail = `${method.scope} ${method.type} ${method.name}`;
        //     result.documentation = this.getMethodDocumentation(method);
        //     result.insertText = this.getMethodSnippet(method);
        //     return result;
        // });
        // return methodCompletion;
        return [];
    }

    // private getCompletionFields(prefix: string, replacement?: string): vscode.CompletionItem[] {
    //     // Tables
    //     let tb = _tableCollection.items.find((item) => item.label.toLowerCase() == prefix);
    //     if (tb) {
    //         let result = tb['completion'].items;
    //         if (!util.isNullOrUndefined(replacement))
    //             result = replaceSnippetTableName(result, prefix, replacement);
    //         return result;
    //     }
    //     return [];
    // }
}

/*
buffer / temp-table 
variables?
- ignore global completion item, when there is a local completion item

ignore buffer and temp-table completion on parameters
*/