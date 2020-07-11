import * as vscode from 'vscode';
import { ABL_MODE } from '../environment';
import { StatementUtil, Statement } from '../statementUtil';
import { DocumentController } from '../documentController';
import { Document } from '../documentModel';
import { AblType, AblTypeCheck } from '../type';

export class Definition implements vscode.DefinitionProvider {

    private documentController: DocumentController;

    static attach(context: vscode.ExtensionContext) {
        let instance = new Definition();
        instance.registerCommands(context);
    }
    
    constructor() {
        this.documentController = DocumentController.getInstance();
    }

	private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerDefinitionProvider(ABL_MODE.language, this));
    }

    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Location> {
        // go-to definition
        let statement = StatementUtil.statementAtPosition(document, position);
        let doc = this.documentController.getDocument(document);
        if (doc) {
            return this.a(doc, position);
        }
        return;
    }

    private a(document: Document, position: vscode.Position): Thenable<vscode.Location> {
        let statement = StatementUtil.statementAtPosition(document.document, position);
        if (!statement)
            return;

        let words = StatementUtil.cleanArray(statement.statement.split(/[\.\:\s\t]/));
        if (words.length > 0) {
            let reference = document.searchReference(statement.word, position);
            if (reference) {
                if (AblTypeCheck.isVariable(reference) && reference.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE) {
                    reference = document.getTempTable(reference.name);
                    if (AblTypeCheck.isTempTable(reference)) {
                        return Promise.resolve(new vscode.Location(reference.uri, reference.range));
                    }
                }
                else if (AblTypeCheck.isParameter(reference) && reference.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE) {
                    reference = document.getTempTable(reference.name);
                    if (AblTypeCheck.isTempTable(reference)) {
                        return Promise.resolve(new vscode.Location(reference.uri, reference.range));
                    }
                }
                if (AblTypeCheck.hasPosition(reference)) {
                    return Promise.resolve(new vscode.Location(reference.uri, reference.position));
                }
                else if (AblTypeCheck.hasRange(reference)) {
                    return Promise.resolve(new vscode.Location(reference.uri, reference.range));
                }
            }
            else {
                let result: vscode.TextDocument;
                let incName = statement.statement.trim().toLowerCase().replace('\\', '/');
                document.includes.filter(include => !!include.document).find(include => {
                    if (include.name == incName) {
                        result = include.document;
                        return true;
                    }
                    return false;
                });
                if (result)
                    return Promise.resolve(new vscode.Location(result.uri, new vscode.Position(0,0)));
            }
        }
        return;
    }
}
