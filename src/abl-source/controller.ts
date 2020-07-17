import * as vscode from 'vscode';
import * as fs from 'fs';
import { AblSchema } from '@oe-zext/types';
import { Document } from './document';

let _instance: Controller;

export class Controller {

    private context: vscode.ExtensionContext;
    private documents: Document[] = [];
    private onChangeEmitter: vscode.EventEmitter<Document> = new vscode.EventEmitter();

    static attach(context: vscode.ExtensionContext) {
        _instance = new Controller();
        _instance.context = context;
        process.nextTick(() => _instance.initialize());
        return _instance;
    }

    // remover o getInstance.... o controller vai passar a instancia para os documents
    static getInstance(): Controller {
        return _instance;
    }

    dispose() {
        this.documents.forEach(d => d.dispose());
    }

    get onChange() {
        return this.onChangeEmitter.event;
    }

    private initialize() {
        // Current documents
        vscode.workspace.textDocuments.forEach(document => {
            this.insertDocument(document);
        });
        // Document changes
        vscode.workspace.onDidOpenTextDocument(document => { this.insertDocument(document) }, this, this.context.subscriptions);
        vscode.workspace.onDidSaveTextDocument(document => { this.updateDocument(document) }, this, this.context.subscriptions);
        vscode.workspace.onDidCloseTextDocument(document => { this.removeDocument(document) }, this, this.context.subscriptions);
    }

    private getDocumentIndex(document: vscode.TextDocument): string {
        return document.uri.fsPath;
    }

    private insertDocument(document: vscode.TextDocument) {
        if (document.languageId === AblSchema.languageId) {
            let idx = this.getDocumentIndex(document);
            if (!this.documents[idx]) {
                let doc = new Document(this, document);
                this.documents[idx] = doc;
                this.updateDocument(document);
            }
        }
    }

    private updateDocument(document: vscode.TextDocument) {
        if (document.languageId === AblSchema.languageId) {
            let idx = this.getDocumentIndex(document);
            let doc = this.documents[idx];
            if (doc) {
                doc.update();
            }
        }
    }

    private removeDocument(document: vscode.TextDocument) {
        if (document.languageId === AblSchema.languageId) {
            let idx = this.getDocumentIndex(document);
            if (this.documents[idx]) {
                let doc = this.documents[idx];
                doc.dispose();
                delete this.documents[idx];
            }
        }
    }

    pushDocumentChange(document: Document) {
        // TODO - check for propagation loop

        // refresh current document symbols
        // if ((document?.document?.uri) && (vscode.window.activeTextEditor.document?.uri == document.document.uri)) {
        //     process.nextTick(() => vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.document.uri));
        // }
        //
        this.onChangeEmitter.fire(document);
    }

    getDocument(uri: vscode.Uri): Document;
    getDocument(document: vscode.TextDocument): Document;
    getDocument(param: vscode.Uri | vscode.TextDocument): Document {
        if (param instanceof vscode.Uri) {
            return this.documents[param.fsPath];
        }
        else {
            return this.documents[this.getDocumentIndex(param)];
        }
    }

    openDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
        let doc = vscode.workspace.textDocuments.find(document => document.uri.fsPath == uri.fsPath);
        if (doc)
            return Promise.resolve(doc);
        return new Promise(resolve => vscode.workspace.openTextDocument(uri).then(doc => resolve(doc)));
    }

    getUri(relativePath:string): Promise<vscode.Uri> {
        return new Promise(resolve => {
            let result = null;
            vscode.workspace.workspaceFolders.find(wf => {
                let uri = wf.uri.with({path: [wf.uri.path,relativePath].join('/')});
                if (fs.existsSync(uri.fsPath)) {
                    result = uri;
                    return true;
                }
                return false;
            });
            resolve(result);
        });
    }
}
