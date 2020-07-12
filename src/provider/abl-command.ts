import * as vscode from 'vscode';
import { AblExecute } from '../abl-execute';
import { documentDeploy } from '../deploy';

export class AblCommand {

    static attach(context: vscode.ExtensionContext) {
        let instance = new AblCommand();
        instance.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.checkSyntax', this.currentFileCheckSyntax.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.compile', this.currentFileCompile.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.compileOptions', this.currentFileCompileWithOptions.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.run', this.currentFileRun.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.deploySource', this.currentFileDeploySource.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.dictionary.dumpDefinition', this.dictionaryDumpDefinition.bind(this)));
    }

    private currentFileCheckSyntax() {
        AblExecute.CheckSyntax.getInstance().execute(vscode.window.activeTextEditor.document);
    }

    private currentFileCompile() {
        AblExecute.Compile.getInstance().compile(vscode.window.activeTextEditor.document);
    }

    private currentFileCompileWithOptions() {
        AblExecute.Compile.getInstance().compileWithOptions(vscode.window.activeTextEditor.document);
    }

    private currentFileRun() {
        AblExecute.Run.getInstance().execute(vscode.window.activeTextEditor.document);
    }

    private currentFileDeploySource() {
        documentDeploy(vscode.window.activeTextEditor.document);
    }

    private dictionaryDumpDefinition() {
        AblExecute.DictionaryDump.getInstance().execute();
    }

}