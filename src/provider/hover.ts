import * as vscode from 'vscode';
import { ABL_MODE } from '../environment';
import { DocumentController } from '../documentController';
import { Document } from '../documentModel';
import { StatementUtil, Statement } from '../statementUtil';
import { DbfController } from '../dbfController';
import { DbType, AblTypeCheck, AblType } from '../type';

declare type ReferenceData = AblType.Variable | AblType.Parameter | AblType.TempTable | AblType.Method;

export class Hover implements vscode.HoverProvider {

    private documentController: DocumentController;
    private dbfController: DbfController;

    static attach(context: vscode.ExtensionContext) {
        let instance = new Hover();
        instance.registerCommands(context);
    }
    
    constructor() {
        this.documentController = DocumentController.getInstance();
        this.dbfController = DbfController.getInstance();
    }

	private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerHoverProvider(ABL_MODE.language, this));
    }
    
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let doc = this.documentController.getDocument(document);
        if (doc)
            return this.analyseHover(doc, position, token);
        return;
    }

    analyseHover(document: Document, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let statement = StatementUtil.statementAtPosition(document.document, position);
        if (!statement)
            return;

        let words = StatementUtil.cleanArray(statement.statement.split(/[\.\:\s\t]/));
        if (words.length > 0) {
            if ((words.length == 1)||((words.length == 2)&&(statement.word == words[0]))) {
                // document variables/params/temp-tables
                let reference = document.searchReference(words[0], position);
                if (reference) {
                    return this.buildFHoverFromReference(document, reference, statement);
                }
                // check for table names
                let table = this.dbfController.getTable(words[0]);
                if (table) {
                    return this.buildHoverFromTable(table, statement);
                }
            }
            else if (words.length == 2) {
                // document variables/params/temp-tables
                let reference = document.searchReference(words[0], position);
                if (reference) {
                    return this.buildFHoverFromReferenceProperty(document, reference, words[1], statement);
                }
                // check for table
                let table = this.dbfController.getTable(words[0]);
                if (table) {
                    return this.buildHoverFromTableField(table, words[1], statement);
                }
            }
        }

        return;
    }

    private buildFHoverFromReference(document: Document, reference: ReferenceData, statement: Statement): vscode.Hover {
        if (AblTypeCheck.isTempTable(reference)) {
            return this.buildTempTableHover(reference, statement);
        }
        else if (AblTypeCheck.isMethod(reference)) {
            return this.buildMethodHover(reference, statement);
        }
        else {
            // generic parameter data
            let variable: AblType.Parameter | AblType.Variable = reference;
            // variable/param as temp-table
            if (reference.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE) {
                let tempTable = document.getTempTable(reference.name);
                if (tempTable) {
                    return this.buildTempTableHover(tempTable, statement, variable);
                }
            }
            // variable/param as buffer
            else if (reference.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                if (reference.bufferType == AblType.BUFFER_REFERENCE.TABLE) {
                    let table = this.dbfController.getTable(reference.likeType);
                    if (table) {
                        return this.buildHoverFromTable(table, statement, variable);
                    }
                }
                else if (reference.bufferType == AblType.BUFFER_REFERENCE.TEMP_TABLE) {
                    let tempTable = document.getTempTable(reference.likeType);
                    if (tempTable) {
                        return this.buildTempTableHover(tempTable, statement, variable);
                    }
                }
            }
            // variable
            else {
                return this.buildVariableHover(reference, statement);
            }
        }
        return;
    }

    private buildFHoverFromReferenceProperty(document: Document, reference: ReferenceData, name: string, statement: Statement): vscode.Hover {
        let property: DbType.Field | AblType.Field;
        let refData: AblType.TempTable | DbType.Table;
        if (AblTypeCheck.isTempTable(reference)) {
            refData = document.getTempTable(reference.name);
            property = document.getAllFields(refData).find(item => item.name.toLowerCase() == name.toLowerCase());
        }
        else if (!AblTypeCheck.isMethod(reference)) {
            // variable/param as temp-table
            if (reference.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE) {
                refData = document.getTempTable(reference.name);
                property = document.getAllFields(refData).find(item => item.name.toLowerCase() == name.toLowerCase());
            }
            // variable/param as buffer
            else if (reference.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                if (reference.bufferType == AblType.BUFFER_REFERENCE.TABLE) {
                    refData = this.dbfController.getTable(reference.likeType);
                    property = (<DbType.Table>refData)?.fields?.find(item => item.name.toLowerCase() == name.toLowerCase());
                }
                else if (reference.bufferType == AblType.BUFFER_REFERENCE.TEMP_TABLE) {
                    refData = document.getTempTable(reference.likeType);
                    property = document.getAllFields(refData).find(item => item.name.toLowerCase() == name.toLowerCase());
                }
            }
        }
        if (property) {
            if (AblTypeCheck.isTempTable(refData)) {
                // temp-table field
                let field: AblType.Field = property;
                let result = [];
                result.push(`field **${field.name}**\n`);
                if (AblTypeCheck.isVariable(reference) && reference.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                    result.push(`- Buffer *${reference.name}*\n`);
                }
                result.push(`- Temp-table *${refData.name}*\n`);
                if (field.dataType) {
                    result.push(`- Type: *${field.dataType}*\n`);
                }
                else if (field.likeType) {
                    result.push(`- Like: *${field.likeType}*\n`);
                }
                return new vscode.Hover(result, statement.statementRange);
            }
            else {
                // table (buffer) field
                let field: DbType.Field = <DbType.Field>property;
                let result = [];
                result.push(`field **${field.name}**\n`);
                result.push(`*${field.description}*\n`);
                if (AblTypeCheck.isVariable(reference) && reference.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                    result.push(`- Buffer *${reference.name}*\n`);
                }
                result.push(`- Table *${refData.name}*\n`);
                if (field.isPK)
                    result.push(`- **Primary Key**\n`);
                else if (field.isKey)
                    result.push(`- **Used in index**\n`);
                if (field.mandatory)
                    result.push(`- **Mandatory**\n`);
                result.push(`- Label: *'${field.description}'*\n`);
                result.push(`- Type: *${field.type}*\n`);
                result.push(`- Format *${field.format}*\n`);
                return new vscode.Hover(result, statement.statementRange);
            }
        }
        return;
    }

    private buildHoverFromTable(table: DbType.Table, statement: Statement, variable?: AblType.Variable | AblType.Parameter): vscode.Hover {
        let result = [];
        let pkList = table.indexes.find(item => item.isPK)?.fields?.join(', ');
        if (variable?.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
            result.push(`${variable.scope} buffer **${variable.name}**\n`);
            result.push(`for table **${table.name}**`);
        }
        else {
            result.push(`table **${table.name}**`);
        }
        result.push(`*${table.description}*`);
        if (pkList) {
            result.push(`PK: *${pkList}*`);
        }
        return new vscode.Hover(result, statement.wordRange);
    }

    private buildHoverFromTableField(table: DbType.Table, name: string, statement: Statement): vscode.Hover {
        // table field
        let field = table.fields.find(item => item.name.toLowerCase() == name.toLowerCase());
        if (field) {
            let result = [];
            result.push(`field **${field.name}**\n`);
            result.push(`*${field.description}*\n`);
            result.push(`- Table *${table.name}*\n`);
            if (field.isPK)
                result.push(`- **Primary Key**\n`);
            else if (field.isKey)
                result.push(`- **Used in index**\n`);
            if (field.mandatory)
                result.push(`- **Mandatory**\n`);
            result.push(`- Label: *'${field.description}'*\n`);
            result.push(`- Type: *${field.type}*\n`);
            result.push(`- Format *${field.format}*\n`);
            return new vscode.Hover(result, statement.statementRange);
        }
        return;
    }

    private buildTempTableHover(tempTable: AblType.TempTable, statement: Statement, variable?: AblType.Variable | AblType.Parameter): vscode.Hover {
        let result = [];
        if (variable?.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
            let detail = `${variable.scope} buffer **${variable.name}**\n`; 
            if (AblTypeCheck.isParameter(variable) && variable.direction)
                detail = `${variable.direction} ${detail}`;
            result.push(`${detail}\n`);
            result.push(`for temp-table **${tempTable.name}**\n`);
        } 
        else {
            let detail = `temp-table **${tempTable.name}**\n`; 
            if (AblTypeCheck.isParameter(variable)) {
                detail = `${variable.scope} ${detail}`;
                if (variable.direction)
                    detail = `${variable.direction} ${detail}`;
            }
            result.push(`${detail}\n`);
        }
        // if (tempTable.referenceTable)
        //     result.push(`like *${tempTable.referenceTable}*`);
        return new vscode.Hover(result, statement.wordRange);
    }

    private buildMethodHover(method: AblType.Method, statement: Statement): vscode.Hover {
        let result = new vscode.MarkdownString();
        result.appendMarkdown(`${method.visibility} ${method.type} **${method.name}**\n`);
        if (method.params?.length > 0) {
            result.appendMarkdown('\n---\nParameters:\n');
            method.params.forEach(param => {
                if (param.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                    result.appendMarkdown(`- buffer *${param.name}* for ${param.bufferType} *${param.likeType}*\n`);
                }
                else if (param.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE) {
                    result.appendMarkdown(`- ${param.direction} for temp-table *${param.name}*\n`);
                }
                else {
                    result.appendMarkdown(`- ${param.direction} *${param.name}*\n`);
                }
            });
        }

        return new vscode.Hover(result, statement.wordRange);
    }

    private buildVariableHover(variable: AblType.Variable | AblType.Parameter, statement: Statement): vscode.Hover {
        let result = [];
        let detail = `${variable.scope} variable **${variable.name}**\n`;
        if (AblTypeCheck.isParameter(variable) && variable.direction)
            detail = `${variable.direction} ${detail}`;
        result.push(`${detail}\n`);
        if (variable.dataType) {
            result.push(`- Type: *${variable.dataType}*\n`);
        }
        else if (variable.likeType) {
            result.push(`- Like: *${variable.likeType}*\n`);
        }
        return new vscode.Hover(result, statement.wordRange);
    }

    //#region OLD
    /*
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
    */
    //#endregion

}