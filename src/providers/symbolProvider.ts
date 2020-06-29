import * as vscode from "vscode";
import { ABLDocumentController, getDocumentController } from "../documentController";
import { ABL_MODE } from "../environment";

export class ABLSymbolProvider implements vscode.DocumentSymbolProvider {
	private _ablDocumentController: ABLDocumentController;

	constructor(context: vscode.ExtensionContext) {
		this.initialize(context);
	}

	private initialize(context: vscode.ExtensionContext) {
		this._ablDocumentController = getDocumentController();
		context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(ABL_MODE.language, this));
	}

	public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
		return Promise.resolve(this._ablDocumentController.getDocument(document).symbols);
	}
}

