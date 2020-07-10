import * as vscode from 'vscode';

/**
 * Provider for integration commands (hidden from command palette).
 * Can be used by other VSCode extensions.
 */
export class Integration {

    static attach(context: vscode.ExtensionContext) {
        let instance = new Integration();
        instance.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        // context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.getMap', this.currentFileGetMap.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.getSourceCode', this.currentFileGetSourceCode.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.tables', this.tables.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.table', this.table.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.compile', this.compile.bind(this)));
    }

}