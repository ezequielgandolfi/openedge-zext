import * as vscode from 'vscode';
import { ABL_MODE } from '../environment';
import { DocumentController } from '../documentController';
import { Document } from '../documentModel';

export class Symbol implements vscode.DocumentSymbolProvider {

    static attach(context: vscode.ExtensionContext) {
        let instance = new Symbol();
        instance.registerCommands(context);
	}

	private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(ABL_MODE.language, this));
    }

    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        let doc = DocumentController.getInstance().getDocument(document);
        if (doc) {
            let documentSymbols = this.documentSymbols.bind(this);
            return new Promise(resolve => {
                process.nextTick(() => {
                    if (!token.isCancellationRequested)
                        resolve(documentSymbols(doc));
                    else
                        resolve();
                });
            });
        }
        return;
    }

    private documentSymbols(document: Document): vscode.SymbolInformation[] {
        let methods:vscode.SymbolInformation[] = [];
        let params:vscode.SymbolInformation[] = [];
        document.methods.forEach(method => {
            methods.push(new vscode.SymbolInformation(method.name, vscode.SymbolKind.Method, 'Methods', new vscode.Location(document.document.uri, method.range)));
            // parameters
            // method.params?.forEach(param => {
            //     params.push(new vscode.SymbolInformation(param.name, vscode.SymbolKind.Property, 'Method Parameters', new vscode.Location(document.document.uri, param.position)));
            // });
        });
        return [
            ...methods,
            ...params
        ];
    }
}

