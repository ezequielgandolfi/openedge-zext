import * as vscode from 'vscode';
import { ABL_MODE } from '../environment';
import { DocumentController } from '../documentController';
import { Document } from '../documentModel';
import { StatementUtil } from '../statementUtil';
import { AblType } from '../type';

export class Signature implements vscode.SignatureHelpProvider {

    private documentController: DocumentController;

    static attach(context: vscode.ExtensionContext) {
        let instance = new Signature();
        instance.registerProviders(context);
    }

    constructor() {
        this.documentController = DocumentController.getInstance();
    }
    
	private registerProviders(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(ABL_MODE.language, this, '('));
    }

    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.ProviderResult<vscode.SignatureHelp> {
        let doc = this.documentController.getDocument(document);
        if (doc)
            return this.analyseSignature(doc, position, token);
        return;
    }

    analyseSignature(document: Document, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SignatureHelp> {
        let methodSignature = StatementUtil.nestedMethodName(document.document, position);
        if (!methodSignature)
            return;
        let method = document.getMethod(methodSignature.name);
        if (method?.params?.length > 0) {
            let params = [];
            let paramInfo: vscode.ParameterInformation[] = method.params?.map(param => {
                let doc = '';
                if (param.direction)
                    doc += `${param.direction} `;
                doc += `${param.name} `;
                doc += `${param.dataType || param.likeType}`;
                // if (param.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                //     doc += `parameter ${param.dataType} for `;
                //     if (param.bufferType == AblType.BUFFER_REFERENCE.TABLE) {

                //     }
                // }
                // else if (param.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE) {

                // }
                // else {

                // }
                params.push(doc);
                return new vscode.ParameterInformation(doc);
            });
            let result = new vscode.SignatureHelp();
            let signature = new vscode.SignatureInformation(method.name);
            signature.label += `(${params.join(', ')})`;
            signature.parameters = paramInfo;
            result.signatures = [signature];
            result.activeSignature = 0;
            result.activeParameter = methodSignature.activeParameter;
            return result;
        }
        return;
    }  

}