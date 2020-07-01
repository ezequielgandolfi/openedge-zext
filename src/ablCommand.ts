import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import { outputChannel, showStatusBar, STATUS_COLOR, errorDiagnosticCollection, warningDiagnosticCollection, hideStatusBar } from './notification';
import { getProBin, createProArgs, setupEnvironmentVariables, ABL_MODE, getProwinBin } from './environment';
import { ICheckResult } from './definition';
import { saveAndExec, xcode } from './utils';
import { ExtensionConfig, OpenEdgeConfig } from './extensionConfig';
import { TASK_TYPE, fileDeploy, rcodeDeploy } from './deploy';

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

export class ABLCommandExecutor {

    protected errorDiagnostic: vscode.DiagnosticCollection;
    protected warningDiagnostic: vscode.DiagnosticCollection;
    
    private mapSeverity(ablSeverity: string): vscode.DiagnosticSeverity {
        switch (ablSeverity) {
            case 'error': return vscode.DiagnosticSeverity.Error;
            case 'warning': return vscode.DiagnosticSeverity.Warning;
            // case 'info': return vscode.DiagnosticSeverity.Information;
        }
        // default
        return vscode.DiagnosticSeverity.Error;
    }

    private mapResult(err, stdout, stderr): ICheckResult[] {
        try {
            if (err && (<any>err).code === 'ENOENT') {
                return [];
            }
            let useStdErr = false;
            if (err && stderr && !useStdErr) {
                outputChannel.appendLine(stderr);
                return [];
            }
            let lines = stdout.toString().split('\r\n').filter(line => line.length > 0);
            if (lines.length === 1 && lines[0].startsWith('SUCCESS')) {
                return [];
            }
            let results: ICheckResult[] = [];

            // &1 File:'&2' Row:&3 Col:&4 Error:&5 Message:&6
            let re = /(ERROR|WARNING) File:'(.*)' Row:(\d+) Col:(\d+) Error:(.*) Message:(.*)/;
            lines.forEach(line => {
                let matches = line.match(re);
                if (matches) {
                    let checkResult = {
                        file: matches[2],
                        line: parseInt(matches[3]),
                        column: parseInt(matches[4]),
                        msg: `${matches[5]}: ${matches[6]}`,
                        severity: matches[1].toLowerCase()
                    };
                    results.push(checkResult);
                }
                else
                    throw line;
            });
            return results;
        } 
        catch (e) {
            console.log(e);
            throw e;
        }
    }

    protected getBinary() {
        return getProBin();
    }

    protected isBatch() {
        return true;
    }

    protected executeCommand(document: vscode.TextDocument, procedure: string, params:string[], mergeOeConfig?: OpenEdgeConfig, silent?: boolean): Promise<boolean> {
        if (document.languageId !== ABL_MODE.language) {
            return;
        }

        let uri = document.uri;
        let wf = vscode.workspace.getWorkspaceFolder(uri);
        if (!wf)
            wf = ExtensionConfig.getInstance().getGenericWorkspaceFolder();
        let doCommand = (): Promise<boolean> => {
            if (!silent)
                this.setDiagnostic(document, []);
            let result = this.runProcess(procedure, params.join(','), mergeOeConfig, wf.uri.fsPath);
            return result.then(errors => {
                if (!silent)
                    this.setDiagnostic(document, errors);
                if (errors.length > 0)
                    return false;
                return true;
            }).catch(e => {
                vscode.window.showInformationMessage(e);
                return false;
            });
        }
    
        return saveAndExec(document, doCommand);	
    }

    protected executeStandaloneCommand(procedure: string, params:string[], mergeOeConfig?: OpenEdgeConfig, silent?: boolean): Promise<boolean> {
        let tempPath = process.env['TEMP'];
        let config = ExtensionConfig.getInstance().getConfig(mergeOeConfig);
        if (config.workingDirectory) {
            tempPath = config.workingDirectory;
        }
        let doCommand = (): Promise<boolean> => {
            let result = this.runProcess(procedure, params.join(','), mergeOeConfig, tempPath);
            return result.then(errors => {
                return true;
            }).catch(e => {
                vscode.window.showInformationMessage(e);
                return false;
            });
        }
        return doCommand();
    }

    protected setDiagnostic(document: vscode.TextDocument, errors: ICheckResult[]) {
        if (this.errorDiagnostic)
            this.errorDiagnostic.clear();
        if (this.warningDiagnostic)
            this.warningDiagnostic.clear();

        let diagnosticMap: Map<string, Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>> = new Map();

        errors.forEach(error => {
            let canonicalFile = vscode.Uri.file(error.file).toString();
            let startColumn = 0;
            let endColumn = 1;
            if (error.line > 0) {
                if (document && document.uri.toString() === canonicalFile) {
                    let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, document.lineAt(error.line - 1).range.end.character + 1);
                    let text = document.getText(range);
                    let [_, leading, trailing] = /^(\s*).*(\s*)$/.exec(text);
                    startColumn = startColumn + leading.length;
                    endColumn = text.length - trailing.length;
                }
                let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, endColumn);
                let severity = this.mapSeverity(error.severity);
                let diagnostic = new vscode.Diagnostic(range, error.msg, severity);
                let diagnostics = diagnosticMap.get(canonicalFile);
                if (!diagnostics) {
                    diagnostics = new Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>();
                }
                if (!diagnostics[severity]) {
                    diagnostics[severity] = [];
                }
                diagnostics[severity].push(diagnostic);
                diagnosticMap.set(canonicalFile, diagnostics);
            }
        });
        diagnosticMap.forEach((diagMap, file) => {
            if (this.errorDiagnostic)
                this.errorDiagnostic.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Error]);
            if (this.warningDiagnostic)
                this.warningDiagnostic.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Warning]);
        });
    }

    protected runProcess(procedure: string, param: string, mergeOeConfig: OpenEdgeConfig, workspaceRoot: string): Promise<ICheckResult[]> {
        let cmd = this.getBinary();
        
        let oeConfig = ExtensionConfig.getInstance().getConfig(mergeOeConfig);
        let env = setupEnvironmentVariables(process.env, oeConfig, workspaceRoot);
        let args = createProArgs({
            parameterFiles: oeConfig.parameterFiles,
            configFile: oeConfig.configFile,
            batchMode: this.isBatch(),
            startupProcedure: path.join(ExtensionConfig.getInstance().getExtensionPath(), `abl-src/${procedure}`),
            param: param,
            workspaceRoot: workspaceRoot
        });
        let cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', workspaceRoot).replace('${workspaceFolder}', workspaceRoot) : workspaceRoot;
        let mapResult = this.mapResult.bind(this);
        return new Promise<ICheckResult[]>((resolve, reject) => {
            cp.execFile(cmd, args, { env: env, cwd: cwd }, (err, stdout, stderr) => {
                try {
                    resolve(mapResult(err, stdout, stderr));
                }
                catch(e) {
                    reject(e);
                }
            });
        });
    }

}

export class ABLCheckSyntax extends ABLCommandExecutor {

    constructor() {
        super();
        this.errorDiagnostic = errorDiagnosticCollection;
        this.warningDiagnostic = warningDiagnosticCollection;
    }

    static getInstance() {
        return new ABLCheckSyntax();
    }

    execute(document: vscode.TextDocument, mergeOeConfig?: OpenEdgeConfig, silent?: boolean): Promise<boolean> {
        if (!silent) {
            showStatusBar(document.uri.fsPath, 'Checking syntax', STATUS_COLOR.INFO);
        }
        return this.executeCommand(document, 'check-syntax.p', [document.uri.fsPath], mergeOeConfig, silent).then(result => {
            if (!silent) {
                if (result)
                    showStatusBar(document.uri.fsPath, 'Syntax OK', STATUS_COLOR.SUCCESS);
                else
                    showStatusBar(document.uri.fsPath, 'Syntax error', STATUS_COLOR.ERROR);
            }
            return result;
        });
    }

}

export class ABLCompile extends ABLCommandExecutor {

    constructor() {
        super();
        this.errorDiagnostic = errorDiagnosticCollection;
        this.warningDiagnostic = warningDiagnosticCollection;
    }

    static getInstance() {
        return new ABLCompile();
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

export class ABLRun extends ABLCommandExecutor {

    constructor() {
        super();
        this.errorDiagnostic = errorDiagnosticCollection;
        this.warningDiagnostic = warningDiagnosticCollection;
    }

    static getInstance() {
        return new ABLRun();
    }

    protected getBinary() {
        return getProwinBin();
    }

    protected isBatch() {
        return false;
    }

    execute(document: vscode.TextDocument, mergeOeConfig?: OpenEdgeConfig, silent?: boolean): Promise<boolean> {
        if (!silent) {
            showStatusBar(document.uri.fsPath, 'Running', STATUS_COLOR.INFO);
        }
        return this.executeCommand(document, 'run.p', [document.uri.fsPath], mergeOeConfig, silent).then(result => {
            if (!silent) {
                if (result)
                    hideStatusBar(document.uri.fsPath);
                else
                    showStatusBar(document.uri.fsPath, 'Syntax error', STATUS_COLOR.ERROR);
            }
            return result;
        });
    }

}

export class ABLDictDump extends ABLCommandExecutor {

    static getInstance() {
        return new ABLDictDump();
    }

    execute(): Promise<boolean> {
        vscode.window.showInformationMessage('Updating dictionary...');
        let dbs = ExtensionConfig.getInstance().getConfig().dbDictionary;
        return this.executeStandaloneCommand('dict-dump.p', dbs).then(result => {
            vscode.window.showInformationMessage('Data dictionary ' + (result ? 'updated' : 'failed'));
            return result;
        });
    }

}