import * as vscode from 'vscode';
import { HoverProvider, ProviderResult, Hover, TextDocument, Position, CancellationToken } from "vscode";
import * as utils from './utils';
import { ABLDocumentController } from "./documentController";
import { getTableCollection } from "./codeCompletion";
import { ABLFieldDefinition, ABLTableDefinition, ABL_ASLIKE } from './definition';

export class ABLHoverProvider implements HoverProvider {
    private _ablDocumentController: ABLDocumentController;

	constructor(controller: ABLDocumentController) {
		this._ablDocumentController = controller;
    }
    
    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
        let doc = this._ablDocumentController.getDocument(document);
        let selection = utils.getText(document, position);
        if (!selection)
            return;
        let split = selection.statement.split(/[\.\:\s\t]/);
        if (split.length == 0)
            return;
        let words = utils.cleanArray(split);
        if (words.length > 0) {
            if ((words.length == 1)||
                ((words.length > 1)&&(selection.word == words[0]))) {
                // check for table collection
                let tb = getTableCollection().items.find(item => item.label == selection.word);
                if (tb) {
                    let tbd = <ABLTableDefinition>tb;
                    return new Hover([selection.word, '*'+tb.detail+'*', 'PK: ' + tbd.pkList], selection.wordRange);
                }
                // check for temp-tables
                let tt = doc.tempTables.find(item => item.label.toLowerCase() == selection.word);
                if (tt) {
                    return new Hover([selection.word, 'Temp-table *'+tt.label+'*'], selection.wordRange);
                }
                // External Temp-tables
                let extTt;
                doc.externalDocument.forEach(external => {
                    if (!extTt) {
                        let extDoc = this._ablDocumentController.getDocument(external);
                        if ((extDoc)&&(extDoc.processed)) {
                            extTt = extDoc.tempTables.find(item => item.label.toLowerCase() == words[0]);
                            if (extTt) {
                                extTt = new Hover([selection.word, 'Temp-table *'+extTt.label+'*'], selection.wordRange);
                            }
                        }
                    }
                });
                if (extTt)
                    return extTt;
            }
            
            else {
                // check for table.field collection
                let tb = getTableCollection().items.find(item => item.label == words[0]);
                if (tb) {
                    let fdLst = <ABLFieldDefinition[]>tb['fields'];
                    let fd = fdLst.find(item => item.label == words[1]);
                    if (fd)
                        return new Hover([selection.statement, '*'+fd.detail+'*', 'Type: ' + fd.dataType, 'Format: ' + fd.format], selection.statementRange);
                    else
                        return;
                }
                // check for temp-table.field collection
                let tt = doc.tempTables.find(item => item.label.toLowerCase() == words[0]);
                if (tt) {
                    let fd = tt.fields.find(item => item.name.toLowerCase() == words[1]);
                    if (fd) {
                        let dt = fd.dataType;
                        if (fd.asLike == ABL_ASLIKE.LIKE) {
                            dt = '*like* ' + dt;
                        }
                        return new Hover([selection.statement, 'Type: ' + dt], selection.statementRange);
                    }
                    else
                        return;
                }
                // External Temp-tables
                let extTt;
                doc.externalDocument.forEach(external => {
                    if (!extTt) {
                        let extDoc = this._ablDocumentController.getDocument(external);
                        if ((extDoc)&&(extDoc.processed)) {
                            extTt = extDoc.tempTables.find(item => item.label.toLowerCase() == words[0]);
                            if (extTt) {
                                let fd = extTt.fields.find(item => item.name.toLowerCase() == words[1]);
                                if (fd) {
                                    let dt = fd.dataType;
                                    if (fd.asLike == ABL_ASLIKE.LIKE) {
                                        dt = '*like* ' + dt;
                                    }
                                    extTt = new Hover([selection.statement, 'Type: ' + dt], selection.statementRange);
                                    return extTt;
                                }
                            }
                        }
                    }
                });
                if (extTt)
                    return extTt;
            }
            // other symbols
            let symbols = this._ablDocumentController.getDocument(document).symbols;
            let method = this._ablDocumentController.getDocument(document).methods.find(m => (m.lineAt <= position.line && m.lineEnd >= position.line));
            if(method) {
                let nm = selection.statement + '@' + method.name.toLowerCase();
                let localSymbol = symbols.find(item => item.name.toLowerCase() == nm);
                if (localSymbol) {
                    return new Hover([localSymbol.name,localSymbol.containerName], selection.statementRange);
                }
            }
            let nm = selection.statement;
            let globalSymbol = symbols.find(item => item.name.toLowerCase() == nm);
            if (globalSymbol) {
                return new Hover([globalSymbol.name,globalSymbol.containerName], selection.statementRange);
            }
        }
        return;
    }
}