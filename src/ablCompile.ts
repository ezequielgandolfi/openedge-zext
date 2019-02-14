import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import { outputChannel, showStatusBar, STATUS_COLOR, errorDiagnosticCollection, warningDiagnosticCollection, hideStatusBar } from './notification';
import { getConfig } from './ablConfig';
import { getProBin, createProArgs, setupEnvironmentVariables, getProwinBin, ABL_MODE } from './environment';
import { rcodeDeploy, fileDeploy, TASK_TYPE } from './deploy';
import { ICheckResult } from './definition';
import { saveAndExec } from './utils';

export enum COMPILE_OPTIONS {
	COMPILE = 'COMPILE',
	LISTING = 'LISTING',
	XREF = 'XREF',
	XREFXML = 'XREF-XML',
	STRINGXREF = 'STRING-XREF',
	DEBUGLIST = 'DEBUG-LIST',
	PREPROCESS = 'PREPROCESS' /*,
	XCODE = 'XCODE'*/
};

export function execCompile(document: vscode.TextDocument, ablConfig: vscode.WorkspaceConfiguration, options:COMPILE_OPTIONS[]) {

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
	hideStatusBar();

	let uri = document.uri;
	let doCompile = () => { 
		compile(uri.fsPath, ablConfig, options).then(errors => {
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
	}

	saveAndExec(document, doCompile);
}

function compile(filename: string, ablConfig: vscode.WorkspaceConfiguration, options:COMPILE_OPTIONS[]): Promise<ICheckResult[]> {
	outputChannel.clear();
	if (options.length == 0)
		return;

	showStatusBar('Compiling...', STATUS_COLOR.INFO);

	let cwd = path.dirname(filename);
	let cmd = getProwinBin();
	let par = [filename];

	let oeConfig = getConfig();
	// output path (.R) only if has post actions
	if ((oeConfig.deployment)&&(oeConfig.deployment.find(item => (item.taskType == TASK_TYPE.DEPLOY_RCODE)||(item.taskType == TASK_TYPE.DEPLOY_ALL))))
		par.push(vscode.workspace.rootPath);
	else
		par.push('');
	// compile options
	par.push(Object.keys(options).map(k => {return options[k]}).join('|'));
	let env = setupEnvironmentVariables(process.env, oeConfig, vscode.workspace.rootPath);
	let args = createProArgs({
		parameterFiles: oeConfig.parameterFiles,
		configFile: oeConfig.configFile,
		batchMode: true,
		startupProcedure: path.join(__dirname, '../abl-src/compile.p'),
		param: par.join(','),
		workspaceRoot: vscode.workspace.rootPath
	});
	cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', vscode.workspace.rootPath).replace('${workspaceFolder}', vscode.workspace.rootPath) : cwd;
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
				if (lines.length > 0 && lines[0].startsWith('SUCCESS')) {
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
		if (results.length === 0) {
			showStatusBar('Compiled', STATUS_COLOR.SUCCESS);
			options.forEach(opt => {
				switch(opt) {
					case COMPILE_OPTIONS.COMPILE:
						rcodeDeploy(filename);
						break;
					case COMPILE_OPTIONS.LISTING:
						fileDeploy(filename+'.listing', '.listing', [TASK_TYPE.DEPLOY_LISTING,TASK_TYPE.DEPLOY_ALL]);
						break;
					case COMPILE_OPTIONS.XREF:
						fileDeploy(filename+'.xref', '.xref', [TASK_TYPE.DEPLOY_XREF,TASK_TYPE.DEPLOY_ALL]);
						break;
					case COMPILE_OPTIONS.XREFXML:
						fileDeploy(filename+'.xref-xml', '.xref-xml', [TASK_TYPE.DEPLOY_XREFXML,TASK_TYPE.DEPLOY_ALL]);
						break;
					case COMPILE_OPTIONS.STRINGXREF:
						fileDeploy(filename+'.string-xref', '.string-xref', [TASK_TYPE.DEPLOY_STRINGXREF,TASK_TYPE.DEPLOY_ALL]);
						break;
					case COMPILE_OPTIONS.DEBUGLIST:
						fileDeploy(filename+'.debug-list', '.debug-list', [TASK_TYPE.DEPLOY_DEBUGLIST,TASK_TYPE.DEPLOY_ALL]);
						break;
					case COMPILE_OPTIONS.PREPROCESS:
						fileDeploy(filename+'.preprocess', '.preprocess', [TASK_TYPE.DEPLOY_PREPROCESS,TASK_TYPE.DEPLOY_ALL]);
						break;
					/*case COMPILE_OPTIONS.XCODE:
						fileDeploy(filename+'.xref', '.xref', ['current.r-code',TASK_TYPE.DEPLOY_ALL]);
						break;*/
				}
			});
		}
		else {
			showStatusBar('Syntax error', STATUS_COLOR.ERROR);
		}
		return results;
	});
}
