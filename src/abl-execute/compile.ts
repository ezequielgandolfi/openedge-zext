import * as vscode from 'vscode';
import path = require('path');
import { showStatusBar, STATUS_COLOR, errorDiagnosticCollection, warningDiagnosticCollection } from '../notification';
import { xcode } from '../utils';
import { ExtensionConfig, OpenEdgeConfig } from '../extensionConfig';
import { TASK_TYPE, fileDeploy, rcodeDeploy } from '../deploy';
import { BaseExecutor } from './base-executor';

export enum COMPILE_OPTIONS {
    COMPILE = 'COMPILE',
    LISTING = 'LISTING',
    XREF = 'XREF',
    XREFXML = 'XREF-XML',
    STRINGXREF = 'STRING-XREF',
    DEBUGLIST = 'DEBUG-LIST',
    PREPROCESS = 'PREPROCESS',
    XCODE = 'XCODE'
};

export class Compile extends BaseExecutor {

    constructor() {
        super();
        this.errorDiagnostic = errorDiagnosticCollection;
        this.warningDiagnostic = warningDiagnosticCollection;
    }

    static getInstance() {
        return new Compile();
    }

    compile(document: vscode.TextDocument, silent?: boolean): Promise<boolean> {
        return this.execute(document, null, silent, [COMPILE_OPTIONS.COMPILE]);
    }

    compileWithOptions(document: vscode.TextDocument): Promise<boolean> {
        let options = Object.keys(COMPILE_OPTIONS).map(k => {return COMPILE_OPTIONS[k]});
        let pick: Promise<COMPILE_OPTIONS[]> = new Promise(resolve => resolve(vscode.window.showQuickPick(options, {placeHolder: 'Compile option', canPickMany: true})));
        return pick.then(opts => {
            if (opts)
                return this.execute(document, null, false, opts);
            return Promise.resolve(null);
        })
    }

    execute(document: vscode.TextDocument, mergeOeConfig?: OpenEdgeConfig, silent?: boolean, compileOptions?: COMPILE_OPTIONS[]): Promise<boolean> {
        if (!silent) {
            showStatusBar(document.uri.fsPath, 'Compiling...', STATUS_COLOR.INFO);
        }
        let oeConfig = ExtensionConfig.getInstance().getConfig(mergeOeConfig);
        let wf = vscode.workspace.getWorkspaceFolder(document.uri);
        let wsPath = wf ? wf.uri.fsPath : path.dirname(document.uri.fsPath);
        // PARAMS
        // 1 = filename
        // 2 = output path
        // 3 = compile options (pipe separated)
        let params = [document.uri.fsPath];
        if ((oeConfig.deployment)&&(oeConfig.deployment.find(item => (item.taskType == TASK_TYPE.DEPLOY_RCODE)||(item.taskType == TASK_TYPE.DEPLOY_ALL))))
            params.push(wsPath);
        else
            params.push(''); // output path (.R) only if has post actions
        params.push(Object.keys(compileOptions).map(k => {return compileOptions[k]}).join('|'));
        //
        return this.executeCommand(document, 'compile.p', params, mergeOeConfig, silent)
            .then(result => {
                if (result) {
                    this.postActions(document, silent, compileOptions)
                }
                return result;
            })
            .then(result => {
                if (!silent) {
                    if (result)
                        showStatusBar(document.uri.fsPath, 'Compiled', STATUS_COLOR.SUCCESS);
                    else
                        showStatusBar(document.uri.fsPath, 'Syntax error', STATUS_COLOR.ERROR);
                }
                return result;
            });
    }

    private postActions(document: vscode.TextDocument, silent?: boolean, compileOptions?: COMPILE_OPTIONS[]) {
        // post actions don't execute on silent mode && inside workspace folder
        let wf = vscode.workspace.getWorkspaceFolder(document.uri);
        if (silent || !wf) {
            return;
        }
        compileOptions.forEach(opt => {
            switch(opt) {
                case COMPILE_OPTIONS.COMPILE:
                    rcodeDeploy(wf, document.uri.fsPath);
                    break;
                case COMPILE_OPTIONS.LISTING:
                    fileDeploy(wf, document.uri.fsPath+'.listing', '.listing', [TASK_TYPE.DEPLOY_LISTING,TASK_TYPE.DEPLOY_ALL]);
                    break;
                case COMPILE_OPTIONS.XREF:
                    fileDeploy(wf, document.uri.fsPath+'.xref', '.xref', [TASK_TYPE.DEPLOY_XREF,TASK_TYPE.DEPLOY_ALL]);
                    break;
                case COMPILE_OPTIONS.XREFXML:
                    fileDeploy(wf, document.uri.fsPath+'.xref-xml', '.xref-xml', [TASK_TYPE.DEPLOY_XREFXML,TASK_TYPE.DEPLOY_ALL]);
                    break;
                case COMPILE_OPTIONS.STRINGXREF:
                    fileDeploy(wf, document.uri.fsPath+'.string-xref', '.string-xref', [TASK_TYPE.DEPLOY_STRINGXREF,TASK_TYPE.DEPLOY_ALL]);
                    break;
                case COMPILE_OPTIONS.DEBUGLIST:
                    fileDeploy(wf, document.uri.fsPath+'.debug-list', '.debug-list', [TASK_TYPE.DEPLOY_DEBUGLIST,TASK_TYPE.DEPLOY_ALL]);
                    break;
                case COMPILE_OPTIONS.PREPROCESS:
                    fileDeploy(wf, document.uri.fsPath+'.preprocess', '.preprocess', [TASK_TYPE.DEPLOY_PREPROCESS,TASK_TYPE.DEPLOY_ALL]);
                    break;
                case COMPILE_OPTIONS.XCODE:
                    xcode(wf, document.uri.fsPath+'.xcode').then(ok => {
                        if (ok)
                            fileDeploy(wf, document.uri.fsPath+'.xcode', '.xcode', [TASK_TYPE.DEPLOY_XCODE,TASK_TYPE.DEPLOY_ALL]);
                    });
                    break;
            }
        });
    }

}
