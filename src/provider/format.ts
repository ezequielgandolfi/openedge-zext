import * as vscode from 'vscode';

export class Format {

    static attach(context: vscode.ExtensionContext) {
        let instance = new Format();
        instance.registerCommands(context);
	}

	private registerCommands(context: vscode.ExtensionContext) {
        // context.subscriptions.push(vscode.commands.registerCommand('abl.format.upperCase', this.formatUpperCase.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.format.lowerCase', this.formatLowerCase.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.format.trimRight', this.formatTrimRight.bind(this)));
    }

}
