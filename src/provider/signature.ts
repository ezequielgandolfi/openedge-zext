import * as vscode from 'vscode';
import { StatementUtil } from '../statement-util';
import { AblType, AblSchema } from '@oe-zext/types';
import { AblSource } from '@oe-zext/source';

export class Signature implements vscode.SignatureHelpProvider {

    private documentController: AblSource.Controller;

    static attach(context: vscode.ExtensionContext) {
        let instance = new Signature();
        instance.registerProviders(context);
    }

    constructor() {
        this.documentController = AblSource.Controller.getInstance();
    }
    
	private registerProviders(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(AblSchema.languageId, this, '('));
    }

    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.ProviderResult<vscode.SignatureHelp> {
        let doc = this.documentController.getDocument(document);
        if (doc)
            return this.analyseSignature(doc, position, token);
        return;
    }

    analyseSignature(document: AblSource.Document, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SignatureHelp> {
        let methodSignature = StatementUtil.nestedMethodName(document.document, position);
        if (!methodSignature)
            return;
        let method = document.getMethod(methodSignature.name);
        if (method?.params?.length > 0) {
            let params = [];
            let paramInfo: vscode.ParameterInformation[] = method.params?.map(param => {
                let doc = `${param.name}`;
                if (param.dataType == AblType.ATTRIBUTE_TYPE.BUFFER) {
                    doc = `buffer ${doc}: ${param.likeType}`;
                }
                else if (param.dataType == AblType.ATTRIBUTE_TYPE.TEMP_TABLE) {
                    doc = `table ${doc}`;
                }
                else {
                    if (param.dataType) {
                        doc += `: ${param.dataType}`;
                    }
                    else {
                        doc += `: like ${param.likeType}`;
                    }
                }
                switch (param.direction) {
                    case AblType.PARAM_DIRECTION.IN:
                        doc = `input ${doc}`;
                        break;
                    case AblType.PARAM_DIRECTION.OUT:
                        doc = `output ${doc}`;
                        break;
                    case AblType.PARAM_DIRECTION.INOUT:
                        doc = `input-output ${doc}`;
                        break;
                    case AblType.PARAM_DIRECTION.RETURN:
                        doc = `return ${doc}`;
                        break;
                }
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