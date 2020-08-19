import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AblDatabase } from '@oe-zext/database';
import { OpenEdgeConfig } from '../extension-config';
import { AblExecute } from '../abl-execute';
import { AblSource } from '@oe-zext/source';
import { AblType } from '@oe-zext/types';
import { isArray } from 'util';


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

    private saveMapFile(textDocument: vscode.TextDocument, filename?: string) {
        let document =  AblSource.Controller.getInstance().getDocument(textDocument);
        if (document) {
            let save = (fname:string, showMessage:boolean) => {
                let data = IntegrationV1.Generate.map(document);
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
                let opt: vscode.InputBoxOptions = {prompt: 'Save into file', value: document.document.uri.fsPath + '.oe-map.json'};
                vscode.window.showInputBox(opt).then(fname => { if(fname) save(fname, true) });
            }
        }
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
        map?: MapFile;
    }
    
    interface MapFile {
        methods?: MapMethod[];
        variables?: MapVariable[];
        tempTables?: MapTempTable[];
        includes?: MapInclude[];
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
            let _tempTables: MapTempTable[] = document.tempTables.map(tempTable => {
                let ttFields: MapVariable[] = [
                    ...tempTable.fields,
                    ...(tempTable.referenceFields || [])
                ].map(field => {
                    return <MapVariable> {
                        name: field.name,
                        asLike: (field.dataType ? 'as' : 'like'),
                        dataType: (field.dataType ? field.dataType : field.likeType),
                        line: tempTable.range.start.line
                    }
                });
                return <MapTempTable>{
                    label: tempTable.name,
                    fields: ttFields
                }
            });

            let _methods: MapMethod[] = document.methods.map(method => {
                return {
                    name: method.name,
                    lineAt: method.range.start.line,
                    lineEnd: method.range.end.line,
                    params: method.params.map(param => {
                        let additional;
                        if (param.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                            additional = param.likeType;
                        }
                        else {
                            additional = param.additional;
                        }
                        return <MapParams>{
                            name: param.name,
                            asLike: (param.dataType ? 'as' : 'like'),
                            dataType: param.dataType || param.likeType,
                            direction: param.direction,
                            line: param.position.line,
                            additional: additional
                        }
                    })
                }
            });

            let _includes: MapInclude[] = document.includes.filter(include => !!include.uri).map(include => {
                let includeMap;
                let includeDocument = AblSource.Controller.getInstance().getDocument(include.uri);
                if (includeDocument) {
                    includeMap = Generate.map(includeDocument);
                }
                return {
                    fsPath: include.uri?.fsPath,
                    name: include.name,
                    map: includeMap
                }
            })



            return {
                methods: _methods,
                // variables: this._vars,
                tempTables: _tempTables,
                includes: _includes,
                // external: this.externalDocument
            };
        }
    
        static table(tableName: string) {
            return AblDatabase.Controller.getInstance().getTable(tableName);
        }
    
        static tables() {
            return AblDatabase.Controller.getInstance().getCollection().map(item => item.name);
        }

    }

}