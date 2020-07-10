import * as vscode from 'vscode';
import { ABL_MODE } from '../environment';

export class Definition implements vscode.DefinitionProvider {

    static attach(context: vscode.ExtensionContext) {
        let instance = new Definition();
        instance.registerCommands(context);
	}

	private registerCommands(context: vscode.ExtensionContext) {
        // context.subscriptions.push(vscode.languages.registerDefinitionProvider(ABL_MODE.language, this));
    }

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Location> {
        return;
    }
}
