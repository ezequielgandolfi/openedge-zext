import * as vscode from 'vscode';
import { ABL_MODE } from '../environment';
import { CompletionProvider } from '../completion';

export class CodeCompletion {

    static attach(context: vscode.ExtensionContext) {
        let instance = new CodeCompletion();
        instance.registerProviders(context);
    }
    
	private registerProviders(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.Buffer(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.Method(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.TempTable(), '.'));
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.Variable(), '.'));

        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.Table(), '.'));

        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, new CompletionProvider.File(), '{'));
    }
    
}
