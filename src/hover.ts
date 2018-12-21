import * as vscode from 'vscode';
import { HoverProvider, ProviderResult, Hover, TextDocument, Position, CancellationToken } from "vscode";
import * as utils from './utils';
import { ABLDocumentController } from "./documentController";
import { getTableCollection } from "./codeCompletion";
import { ABLFieldDefinition, ABLTableDefinition, SYMBOL_TYPE } from './definition';

export class ABLHoverProvider implements HoverProvider {
    private _ablDocumentController: ABLDocumentController;

	constructor(controller: ABLDocumentController) {
		this._ablDocumentController = controller;
    }
    
    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
        let selection = utils.getText(document, position);
        let words = utils.cleanArray(selection.statement.split(/[\.\:\s\t]/));
        if (words.length > 0) {
            // check for table collection
            let tb = getTableCollection().items.find(item => item.label == selection.word);
            if (tb) {
                let tbd = <ABLTableDefinition>tb;
                return new Hover([selection.word, '*'+tb.detail+'*', 'PK: ' + tbd.pkList], selection.wordRange);
            }
            // check for table.field collection
            if (words.length > 1) {
                tb = getTableCollection().items.find(item => item.label == words[0]);
                if (tb) {
                    let fdLst = <ABLFieldDefinition[]>tb['fields'];
                    let fd = fdLst.find(item => item.label == words[1]);
                    if (fd)
                        return new Hover([selection.statement, '*'+fd.detail+'*', 'Type: ' + fd.dataType, 'Format: ' + fd.format], selection.statementRange);
                    else
                        return;
                }
            }
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