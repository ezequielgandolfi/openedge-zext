import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import { outputChannel } from '../notification';
import { AblEnvironment } from './environment';
import { ExtensionConfig, OpenEdgeConfig } from '../extension-config';
import { CheckResult } from './model';
import { AblSchema } from '@oe-zext/types';

export class BaseExecutor {

    protected errorDiagnostic: vscode.DiagnosticCollection;
    protected warningDiagnostic: vscode.DiagnosticCollection;
    protected ablEnvironment = AblEnvironment.getInstance();
    
    private mapSeverity(ablSeverity: string): vscode.DiagnosticSeverity {
        switch (ablSeverity) {
            case 'error': return vscode.DiagnosticSeverity.Error;
            case 'warning': return vscode.DiagnosticSeverity.Warning;
            // case 'info': return vscode.DiagnosticSeverity.Information;
        }
        // default
        return vscode.DiagnosticSeverity.Error;
    }

    private mapResult(err, stdout, stderr): CheckResult[] {
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
            let results: CheckResult[] = [];

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
        return this.ablEnvironment.progressBin;
    }

    protected isBatch() {
        return true;
    }

    protected executeCommand(document: vscode.TextDocument, procedure: string, params:string[], mergeOeConfig?: OpenEdgeConfig, silent?: boolean): Promise<boolean> {
        if (document.languageId !== AblSchema.languageId) {
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
    
        return this.saveAndExec(document, doCommand);	
    }

    protected executeStandaloneCommand(procedure: string, params:string[], mergeOeConfig?: OpenEdgeConfig, silent?: boolean): Promise<boolean> {
        let wf: vscode.WorkspaceFolder;
        if (vscode.window.activeTextEditor) {
            wf = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
        }
        if (!wf) {
            wf = ExtensionConfig.getInstance().getGenericWorkspaceFolder();
        }
        let doCommand = (): Promise<boolean> => {
            let result = this.runProcess(procedure, params.join(','), mergeOeConfig, wf.uri.fsPath);
            return result.then(errors => {
                return true;
            }).catch(e => {
                vscode.window.showInformationMessage(e);
                return false;
            });
        }
        return doCommand();
    }

    protected setDiagnostic(document: vscode.TextDocument, errors: CheckResult[]) {
        if (this.errorDiagnostic)
            this.errorDiagnostic.clear();
        if (this.warningDiagnostic)
            this.warningDiagnostic.clear();

        let diagnosticMap: Map<string, Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>> = new Map();
        let wf = vscode.workspace.getWorkspaceFolder(document.uri);

        errors.forEach(error => {
            let fileUri = vscode.Uri.file(error.file);
            let filePath = fileUri.path;
            let fileWf = vscode.workspace.getWorkspaceFolder(fileUri);
            if (!fileWf) {
                // includes
                filePath = vscode.Uri.joinPath(wf.uri, error.file).path;
            }
            let startColumn = 0;
            let endColumn = 1;
            if (error.line > 0) {
                if (document && document.uri.path == filePath) {
                    let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, document.lineAt(error.line - 1).range.end.character + 1);
                    let text = document.getText(range);
                    let [_, leading, trailing] = /^(\s*).*(\s*)$/.exec(text);
                    startColumn = startColumn + leading.length;
                    endColumn = text.length - trailing.length;
                }
                let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, endColumn);
                let severity = this.mapSeverity(error.severity);
                let diagnostic = new vscode.Diagnostic(range, error.msg, severity);
                let diagnostics = diagnosticMap.get(filePath);
                if (!diagnostics) {
                    diagnostics = new Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>();
                }
                if (!diagnostics[severity]) {
                    diagnostics[severity] = [];
                }
                diagnostics[severity].push(diagnostic);
                diagnosticMap.set(filePath, diagnostics);
            }
        });
        diagnosticMap.forEach((diagMap, file) => {
            if (this.errorDiagnostic)
                this.errorDiagnostic.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Error]);
            if (this.warningDiagnostic)
                this.warningDiagnostic.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Warning]);
        });
    }

    protected runProcess(procedure: string, param: string, mergeOeConfig: OpenEdgeConfig, workspaceRoot: string): Promise<CheckResult[]> {
        let cmd = this.getBinary();
        
        let oeConfig = ExtensionConfig.getInstance().getConfig(mergeOeConfig);
        let env = this.ablEnvironment.setupEnvironmentVariables(process.env, oeConfig, workspaceRoot);
        let args = this.ablEnvironment.createProArgs({
            parameterFiles: oeConfig.parameterFiles,
            configFile: oeConfig.configFile,
            batchMode: this.isBatch(),
            startupProcedure: path.join(ExtensionConfig.getInstance().getExtensionPath(), `abl-src/${procedure}`),
            param: param,
            workspaceRoot: workspaceRoot
        });
        let cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', workspaceRoot).replace('${workspaceFolder}', workspaceRoot) : workspaceRoot;
        let mapResult = this.mapResult.bind(this);
        return new Promise<CheckResult[]>((resolve, reject) => {
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

    protected saveAndExec(document: vscode.TextDocument, action: () => Promise<boolean>): Promise<boolean> {
        if (document.isDirty) {
            return new Promise(function(resolve,reject) {
                vscode.window.showInformationMessage('Current file has unsaved changes!', ...['Save', 'Cancel']).then(result => {
                    if (result == 'Save') 
                        document.save().then(saved => { if (saved) { action().then(v => resolve(v)); }});
                    else
                        resolve(false);
                });
            });
        }
        else
            return action().then(value => { return value });
    }

}
