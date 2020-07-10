import * as vscode from 'vscode';

export class AblCommand {

    static attach(context: vscode.ExtensionContext) {
        let instance = new AblCommand();
        instance.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        // context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.checkSyntax', this.currentFileCheckSyntax.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.compile', this.currentFileCompile.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.compileOptions', this.currentFileCompileWithOptions.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.run', this.currentFileRun.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.deploySource', this.currentFileDeploySource.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.saveMap', this.currentFileSaveMap.bind(this)));
        // context.subscriptions.push(vscode.commands.registerCommand('abl.dictionary.dumpDefinition', this.dictionaryDumpDefinition.bind(this)));
    }

}