import * as vscode from 'vscode';

export class File implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        // only triggers on include notation
        if (context.triggerCharacter != '{')
            return [];
        return this.getFileList(token);
    }

    private getFileList(token: vscode.CancellationToken) {
        return vscode.workspace.findFiles('**/*.i', null, null, token).then(values => values.map(item => {
            return new vscode.CompletionItem(vscode.workspace.asRelativePath(item.path), vscode.CompletionItemKind.Reference);
        }));
    }

}
