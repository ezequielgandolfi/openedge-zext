import * as vscode from 'vscode';
import { ABL_MODE } from '../environment';

export class Signature implements vscode.SignatureHelpProvider {

    static attach(context: vscode.ExtensionContext) {
        let instance = new Signature();
        instance.registerProviders(context);
    }
    
	private registerProviders(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(ABL_MODE.language, this, '('));
    }

    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.ProviderResult<vscode.SignatureHelp> {
        return null;
    }

}