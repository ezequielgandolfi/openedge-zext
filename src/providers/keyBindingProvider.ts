import * as vscode from 'vscode';
import { getDocumentController } from '../documentController';

export class KeyBindingProvider {
	constructor(context: vscode.ExtensionContext) {
		this.initialize(context);
	}

	private initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(vscode.commands.registerCommand('abl.editor.gotoMethodStart', () => {
			this.editor_gotoMethodStart();
		}));
	}

	private editor_gotoMethodStart() {
		this.activeTextRevealRange(vscode.TextEditorRevealType.AtTop);
	}

	private activeTextRevealRange(reveal: vscode.TextEditorRevealType) {
		let txt = vscode.window.activeTextEditor;
		let ablDoc = getDocumentController().getDocument(txt.document);

		if (txt.selection.active) {
			let pos = txt.selection.active;
			let mtd = ablDoc.methods.find(item => { return (item.lineAt <= pos.line) && (item.lineEnd >= pos.line) });
			if (mtd) {
				let range = new vscode.Range(new vscode.Position(mtd.lineAt, 0), new vscode.Position(mtd.lineEnd, 0));
				txt.revealRange(range, reveal);
				txt.selection = new vscode.Selection(mtd.lineAt, 0, mtd.lineAt, 0);
			}
		}
	}
}