import * as vscode from 'vscode';
import { ABL_MODE } from './environment';
import { CompletionProvider } from './completion';

export class CodeCompletionExtension {

    static attach(context: vscode.ExtensionContext) {
        let instance = new CodeCompletionExtension();
        instance.registerProviders(context);
    }
    
	private registerProviders(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.Buffer(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.Method(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.Table(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.TempTable(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.Variable(), '.'));
    }
    
}
