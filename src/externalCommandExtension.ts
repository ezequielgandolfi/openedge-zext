import * as vscode from 'vscode';
import { getDocumentController } from './documentController';
import { SourceParser } from './sourceParser';
import { getTableCollection } from './codeCompletionExtension';
import { OpenEdgeConfig } from './extensionConfig';
import { ABLCompile, COMPILE_OPTIONS } from './ablCommand';

/**
 * Provider for invisible commands.
 * Can be used by other VSCode extensions.
 */
export class ExternalCommandExtension {

    static attach(context: vscode.ExtensionContext) {
        let instance = new ExternalCommandExtension();
        instance.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.getMap', this.currentFileGetMap.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.getSourceCode', this.currentFileGetSourceCode.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.tables', this.tables.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.table', this.table.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.compile', this.compile.bind(this)));
    }

    private currentFileGetMap() {
        let doc = vscode.window.activeTextEditor.document;
        if (doc)
            return getDocumentController().getDocument(doc).getMap();
        else
            return {};
    }

    private currentFileGetSourceCode() {
        let doc = vscode.window.activeTextEditor.document;
        if (doc)
            return new SourceParser().getSourceCode(doc);
        else
            return;
    }

    private tables() {
        return getTableCollection().items.map(item => item.label);
    }

    private table(tableName) {
        return getTableCollection().items.find(item => item.label == tableName);
    }

    private compile(fileName: string, mergeOeConfig?: OpenEdgeConfig) {
        return new Promise(resolve => {
            vscode.workspace.openTextDocument(fileName).then(doc => {
                new ABLCompile().execute(doc, mergeOeConfig, true, [COMPILE_OPTIONS.COMPILE]).then(v => resolve(v));
            });
        });
    }
    
}