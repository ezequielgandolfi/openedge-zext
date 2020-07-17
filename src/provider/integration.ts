import * as vscode from 'vscode';
import { AblDatabase } from '@oe-zext/database';
import { OpenEdgeConfig } from '../extensionConfig';
import { AblExecute } from '../abl-execute';
import { AblSource } from '../abl-source';


/**
 * Provider for integration commands (usually hidden from command palette).
 * Can be used by other VSCode extensions.
 */
export class Integration {

    static attach(context: vscode.ExtensionContext) {
        let instance = new Integration();
        instance.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.saveMap', this.currentFileSaveMap.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.getMap', this.currentFileGetMap.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.currentFile.getSourceCode', this.currentFileGetSourceCode.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.tables', this.tables.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.table', this.table.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.compile', this.compile.bind(this)));
    }

    private currentFileSaveMap(args) {

        // TODO

        // let doc = vscode.window.activeTextEditor.document;
        // let filename = null;
        // if (args) {
        //     if ((isArray(args))&&(args.length>0))
        //         filename = args[0];
        //     else
        //         filename = args;
        // }
        // this.saveMapFile(doc, filename);
        // return filename;
    }

    private saveMapFile(document: vscode.TextDocument, filename?: string) {
        // let doc = getDocumentController().getDocument(document);
        // if (doc) {
        //     let save = (fname:string, showMessage:boolean) => {
        //         let data = doc.getMap();
        //         if (data) {
        //             fs.writeFileSync(fname, JSON.stringify(data));
        //             if (showMessage)
        //                 vscode.window.showInformationMessage('File ' + path.basename(fname) + ' created!');
        //         }
        //         else if (showMessage) {
        //             vscode.window.showErrorMessage('Error mapping file');
        //         }
        //     }
        //     //
        //     if (filename) {
        //         save(filename, false);
        //     }
        //     else {
        //         let opt: vscode.InputBoxOptions = {prompt: 'Save into file', value: doc.document.uri.fsPath + '.oe-map.json'};
        //         vscode.window.showInputBox(opt).then(fname => { if(fname) save(fname, true) });
        //     }
        // }
    }

    private currentFileGetMap() {
        let textDocument = vscode.window.activeTextEditor.document;
        if (textDocument) {
            let document = AblSource.Controller.getInstance().getDocument(textDocument);
            if (document) {
                return IntegrationV1.Generate.map(document);
            }
        }
        return {};
    }

    private currentFileGetSourceCode() {
        let doc = vscode.window.activeTextEditor.document;
        if (doc)
            return new AblSource.Extractor().execute(doc);
        return;
    }

    private tables() {
        return IntegrationV1.Generate.tables();
    }

    private table(tableName) {
        return IntegrationV1.Generate.table(tableName);
    }

    private compile(fileName: string, mergeOeConfig?: OpenEdgeConfig) {
        return new Promise(resolve => {
            vscode.workspace.openTextDocument(fileName).then(textDocument => {
                AblExecute.Compile.getInstance().execute(textDocument, mergeOeConfig, true, [AblExecute.COMPILE_OPTIONS.COMPILE]).then(v => resolve(v));
            });
        });
    }

}

namespace IntegrationV1 {

    interface MapParams {
        name: string;
        asLike: 'as' | 'like';
        dataType: string;
        line: number;
        direction: 'input' | 'output' | 'input-output';
        additional?:string;
    }
    
    interface MapMethod {
        name: string;
        lineAt: number;
        lineEnd: number;
        params: MapParams[];
    }
    
    interface MapVariable {
        name: string;
        asLike: 'as' | 'like';
        dataType: string;
        line: number;
    }
    
    interface MapTempTable {
        label: string;
        fields: MapVariable[];
    }
    
    interface MapInclude {
        fsPath: string;
        name: string;
        map: MapFile;
    }
    
    interface MapFile {
        methods: MapMethod[];
        variables: MapVariable[];
        tempTables: MapTempTable[];
        includes: MapInclude[];
    }
    
    interface MapField {
        label: string;
        detail: string;
        dataType: string;
        format: string;
        mandatory: boolean;
    }
    
    interface MapIndex {
        label: string;
        primary: boolean;
        fields: MapField[];
    }
    
    interface MapTable {
        label: string;
        detail: string;
        fields: MapField[];
        indexes?: MapIndex[];
    }
    

    export class Generate {

        static map(document: AblSource.Document): MapFile {
            let tempTables: MapTempTable[] = document.tempTables.map(tempTable => {
                let line = document.document.lineAt(tempTable.range.start).lineNumber;
                let ttFields: MapVariable[] = [
                    ...tempTable.fields,
                    ...(tempTable.referenceFields || [])
                ].map(field => {
                    return <MapVariable> {
                        name: field.name,
                        asLike: (field.dataType ? 'as' : 'like'),
                        dataType: (field.dataType ? field.dataType : field.likeType),
                        line: line
                    }
                });
                return <MapTempTable>{
                    label: tempTable.name,
                    fields: ttFields
                }
            });



            // return {
            //     methods: this._methods,
            //     variables: this._vars,
            //     tempTables: tempTables,
            //     includes: inc,
            //     external: this.externalDocument
            // };
            return;
        }
    
        static table(tableName: string) {
            return AblDatabase.Controller.getInstance().getTable(tableName);
        }
    
        static tables() {
            return AblDatabase.Controller.getInstance().getCollection().map(item => item.name);
        }

    }

}