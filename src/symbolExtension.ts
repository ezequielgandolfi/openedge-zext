import * as vscode from "vscode";
import { LegacyABLDocumentController, getDocumentController } from "./legacyDocumentController";
import { ABL_MODE } from "./environment";

export class SymbolExtension implements vscode.DocumentSymbolProvider {
    private _ablDocumentController: LegacyABLDocumentController;

    static attach(context: vscode.ExtensionContext) {
        let instance = new SymbolExtension();
        instance._ablDocumentController = getDocumentController();
        instance.registerCommands(context);
	}

	private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(ABL_MODE.language, this));
    }

    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        return Promise.resolve(this._ablDocumentController.getDocument(document).symbols);
    }
}

