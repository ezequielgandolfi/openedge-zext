import * as vscode from 'vscode';
import * as utils from './utils';
import { LegacyABLDocumentController, getDocumentController } from "./legacyDocumentController";
import { getTableCollection } from "./legacyCodeCompletionExtension";
import { ABLFieldDefinition, ABLTableDefinition, SYMBOL_TYPE, ABLTempTable, ABLVariable, ABLMethod, ABLParameter } from './definition';
import { ABL_MODE } from './environment';
import { isNullOrUndefined } from 'util';

export class HoverExtension implements vscode.HoverProvider {
    private _ablDocumentController: LegacyABLDocumentController;

    static attach(context: vscode.ExtensionContext) {
        let instance = new HoverExtension();
        instance._ablDocumentController = getDocumentController();
        instance.registerCommands(context);
	}

	private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerHoverProvider(ABL_MODE.language, this));
    }
    
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
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
                    return new vscode.Hover([selection.word, '*'+tb.detail+'*', 'PK: ' + tbd.pkList], selection.wordRange);
                }
            }
            else {
                // translate buffer var/param
                words[0] = (doc.searchBuffer(words[0], position) || words[0]);
                // check for table.field collection
                let tb = getTableCollection().items.find(item => item.label == words[0]);
                if (tb) {
                    let fdLst = <ABLFieldDefinition[]>tb['fields'];
                    let fd = fdLst.find(item => item.label == words[1]);
                    if (fd)
                        return new vscode.Hover([selection.statement, '*'+fd.detail+'*', 'Type: ' + fd.dataType, 'Format: ' + fd.format], selection.statementRange);
                    else
                        return;
                }
            }
        }

        let symbol = doc.searchSymbol(words, selection.word, position, true);
        if (!isNullOrUndefined(symbol)) {
            if (symbol.type == SYMBOL_TYPE.TEMPTABLE) {
                let tt = <ABLTempTable>(symbol.value);
                return new vscode.Hover([selection.word, 'Temp-table *'+tt.label+'*'], selection.wordRange);
            }
            if (symbol.type == SYMBOL_TYPE.TEMPTABLE_FIELD) {
                let tt = <ABLTempTable>(symbol.origin);
                let tf = <ABLVariable>(symbol.value);
                return new vscode.Hover([selection.word, 'Field *'+tf.name+'*','from temp-table *'+tt.label+'*'], selection.wordRange);
            }
            if (symbol.type == SYMBOL_TYPE.METHOD) {
                let mt = <ABLMethod>(symbol.value);
                return new vscode.Hover([selection.word, 'Method *'+mt.name+'*'], selection.wordRange);
            }
            if (symbol.type == SYMBOL_TYPE.GLOBAL_VAR) {
                let gv = <ABLVariable>(symbol.value);
                if (gv.dataType == 'buffer')
                    return new vscode.Hover([selection.word, 'Global buffer *'+gv.name+'*','for table *'+gv.additional+'*'], selection.wordRange);
                else
                    return new vscode.Hover([selection.word, 'Global variable *'+gv.name+'*'], selection.wordRange);
            }
            if (symbol.type == SYMBOL_TYPE.LOCAL_PARAM) {
                let mt = <ABLMethod>(symbol.origin);
                let lp = <ABLParameter>(symbol.value);
                if (lp.dataType == 'temp-table')
                    return new vscode.Hover([selection.word, 'Local temp-table parameter *'+lp.name+'*','from method *'+mt.name+'*'], selection.wordRange);
                else if (lp.dataType == 'buffer')
                    return new vscode.Hover([selection.word, 'Local buffer parameter *'+lp.name+'*','for table *'+lp.additional+'*','from method *'+mt.name+'*'], selection.wordRange);
                else
                    return new vscode.Hover([selection.word, 'Local parameter *'+lp.name+'*','from method *'+mt.name+'*'], selection.wordRange);
            }
            if (symbol.type == SYMBOL_TYPE.LOCAL_VAR) {
                let mt = <ABLMethod>(symbol.origin);
                let lv = <ABLVariable>(symbol.value);
                if (lv.dataType == 'buffer')
                    return new vscode.Hover([selection.word, 'Local buffer *'+lv.name+'*','for table *'+lv.additional+'*','from method *'+mt.name+'*'], selection.wordRange);
                else
                    return new vscode.Hover([selection.word, 'Local variable *'+lv.name+'*','from method *'+mt.name+'*'], selection.wordRange);
            }
        }

        return;
    }
}