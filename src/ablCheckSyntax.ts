import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import { outputChannel, showStatusBar, STATUS_COLOR, errorDiagnosticCollection, warningDiagnosticCollection, hideStatusBar } from './notification';
import { getProBin, createProArgs, setupEnvironmentVariables, ABL_MODE } from './environment';
import { ICheckResult } from './definition';
import { saveAndExec } from './utils';
import { isNullOrUndefined } from 'util';
import { ExtensionConfig } from './extensionConfig';

export function execCheckSyntax(document: vscode.TextDocument, ablConfig: vscode.WorkspaceConfiguration) {

	function mapSeverityToVSCodeSeverity(sev: string) {
		switch (sev) {
			case 'error': return vscode.DiagnosticSeverity.Error;
			case 'warning': return vscode.DiagnosticSeverity.Warning;
			default: return vscode.DiagnosticSeverity.Error;
		}
	}

	if (document.languageId !== ABL_MODE.language) {
		return;
	}
	hideStatusBar(document.uri.fsPath);

	let uri = document.uri;
	let wf = vscode.workspace.getWorkspaceFolder(uri);
	let doCheckSyntax = (): Promise<any> => {
		let result = checkSyntax(wf, uri.fsPath, ablConfig);
		result.then(errors => {
			errorDiagnosticCollection.clear();
			warningDiagnosticCollection.clear();

			let diagnosticMap: Map<string, Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>> = new Map();

			errors.forEach(error => {
				let canonicalFile = vscode.Uri.file(error.file).toString();
				let startColumn = 0;
				let endColumn = 1;
				if (error.line === 0) {
					vscode.window.showErrorMessage(error.msg);
				}
				else {
					if (document && document.uri.toString() === canonicalFile) {
						let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, document.lineAt(error.line - 1).range.end.character + 1);
						let text = document.getText(range);
						let [_, leading, trailing] = /^(\s*).*(\s*)$/.exec(text);
						startColumn = startColumn + leading.length;
						endColumn = text.length - trailing.length;
					}
					let range = new vscode.Range(error.line - 1, startColumn, error.line - 1, endColumn);
					let severity = mapSeverityToVSCodeSeverity(error.severity);
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
				errorDiagnosticCollection.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Error]);
				warningDiagnosticCollection.set(vscode.Uri.parse(file), diagMap[vscode.DiagnosticSeverity.Warning]);
			});
		}).catch(err => {
			vscode.window.showInformationMessage('Error: ' + err);
		});
		return result;
	}

	return saveAndExec(document, doCheckSyntax);
}

function checkSyntax(workspace: vscode.WorkspaceFolder, filename: string, ablConfig: vscode.WorkspaceConfiguration): Promise<ICheckResult[]> {
	outputChannel.clear();
	showStatusBar(filename, 'Checking syntax', STATUS_COLOR.INFO);

	let cwd = path.dirname(filename);
    let cmd = getProBin();
    
    let wsPath;
    if (!isNullOrUndefined(workspace))
        wsPath = workspace.uri.fsPath;
    else
        wsPath = path.dirname(filename);

	let oeConfig = ExtensionConfig.getInstance().getConfig();
	let env = setupEnvironmentVariables(process.env, oeConfig, wsPath);
	let args = createProArgs({
		parameterFiles: oeConfig.parameterFiles,
		configFile: oeConfig.configFile,
		batchMode: true,
		startupProcedure: path.join(__dirname, '../abl-src/check-syntax.p'),
		param: filename,
		workspaceRoot: wsPath
	});
	cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', wsPath).replace('${workspaceFolder}', wsPath) : cwd;
	return new Promise<ICheckResult[]>((resolve, reject) => {
		cp.execFile(cmd, args, { env: env, cwd: cwd }, (err, stdout, stderr) => {
			try {
				if (err && (<any>err).code === 'ENOENT') {
					// Since the tool is run on save which can be frequent
					// we avoid sending explicit notification if tool is missing
					console.log(`Cannot find ${cmd}`);
					return resolve([]);
				}
				let useStdErr = false; // todo voir si utile
				if (err && stderr && !useStdErr) {
					outputChannel.appendLine(['Error while running tool:', cmd, ...args].join(' '));
					outputChannel.appendLine(stderr);
					return resolve([]);
				}
				let lines = stdout.toString().split('\r\n').filter(line => line.length > 0);
				if (lines.length === 1 && lines[0].startsWith('SUCCESS')) {
					resolve([]);
					return;
				}
				let results: ICheckResult[] = [];

				// Format = &1 File:'&2' Row:&3 Col:&4 Error:&5 Message:&6
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
						// console.log(`${JSON.stringify(checkResult)}`);
						results.push(checkResult);
					} else {
						reject(stdout);
					}
				});
				resolve(results);
			} catch (e) {
				reject(e);
			}
		});
	}).then(results => {
		if (results.length === 0)
			showStatusBar(filename, 'Syntax OK', STATUS_COLOR.SUCCESS);
		else
			showStatusBar(filename, 'Syntax error', STATUS_COLOR.ERROR);
		return results;
	});
}
