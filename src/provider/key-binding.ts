import * as vscode from 'vscode';
import { DocumentController } from '../documentController';

export class KeyBinding {

    static attach(context: vscode.ExtensionContext) {
        let instance = new KeyBinding();
        instance.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('abl.editor.gotoMethodStart', this.editor_gotoMethodStart.bind(this)));
    }

    private editor_gotoMethodStart() {
        let textDocument = vscode.window.activeTextEditor;
        if (textDocument?.selection?.active) {
            let document = DocumentController.getInstance().getDocument(textDocument?.document);
            let position = textDocument.selection.active;
            let method = document?.methods.find(item => item.range.contains(position));
            if (method) {
                textDocument.revealRange(method.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                textDocument.selection = new vscode.Selection(method.range.start, method.range.start);
            }
        }
    }

}