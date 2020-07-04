import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { isArray } from 'util';
import { documentDeploy } from './deploy';
import { getDocumentController } from './legacyDocumentController';
import { ABLCheckSyntax, ABLCompile, ABLRun, ABLDictDump } from './ablCommand';

export class ABLCommandExtension {

    static attach(context: vscode.ExtensionContext) {
        let instance = new ABLCommandExtension();
        instance.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.checkSyntax', this.currentFileCheckSyntax.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.compile', this.currentFileCompile.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.compileOptions', this.currentFileCompileWithOptions.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.run', this.currentFileRun.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.deploySource', this.currentFileDeploySource.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.saveMap', this.currentFileSaveMap.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.dictionary.dumpDefinition', this.dictionaryDumpDefinition.bind(this)));
    }

    private currentFileCheckSyntax() {
        ABLCheckSyntax.getInstance().execute(vscode.window.activeTextEditor.document);
    }

    private currentFileCompile() {
        ABLCompile.getInstance().compile(vscode.window.activeTextEditor.document);
    }

    private currentFileCompileWithOptions() {
        ABLCompile.getInstance().compileWithOptions(vscode.window.activeTextEditor.document);
    }

    private currentFileRun() {
        ABLRun.getInstance().execute(vscode.window.activeTextEditor.document);
    }

    private currentFileDeploySource() {
        documentDeploy(vscode.window.activeTextEditor.document);
    }

    private currentFileSaveMap(args) {
        let doc = vscode.window.activeTextEditor.document;
        let filename = null;
        if (args) {
            if ((isArray(args))&&(args.length>0))
                filename = args[0];
            else
                filename = args;
        }
        this.saveMapFile(doc, filename);
        return filename;
    }

    private dictionaryDumpDefinition() {
        ABLDictDump.getInstance().execute();
    }

    private saveMapFile(document: vscode.TextDocument, filename?: string) {
        let doc = getDocumentController().getDocument(document);
        if (doc) {
            let save = (fname:string, showMessage:boolean) => {
                let data = doc.getMap();
                if (data) {
                    fs.writeFileSync(fname, JSON.stringify(data));
                    if (showMessage)
                        vscode.window.showInformationMessage('File ' + path.basename(fname) + ' created!');
                }
                else if (showMessage) {
                    vscode.window.showErrorMessage('Error mapping file');
                }
            }
            //
            if (filename) {
                save(filename, false);
            }
            else {
                let opt: vscode.InputBoxOptions = {prompt: 'Save into file', value: doc.document.uri.fsPath + '.oe-map.json'};
                vscode.window.showInputBox(opt).then(fname => { if(fname) save(fname, true) });
            }
        }
    }
    
}