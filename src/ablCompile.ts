import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import { outputChannel, showStatusBar, STATUS_COLOR } from './notification';
import { getConfig } from './ablConfig';
import { getProBin, createProArgs, setupEnvironmentVariables, getProwinBin } from './ablPath';
import { rcodeDeploy } from './deploy';

export interface ICheckResult {
	file: string;
	line: number;
	column: number;
	msg: string;
	severity: string;
}

export function compile(filename: string, ablConfig: vscode.WorkspaceConfiguration): Promise<ICheckResult[]> {
	outputChannel.clear();
	showStatusBar('Compiling...', STATUS_COLOR.INFO);

	let cwd = path.dirname(filename);
	let cmd = getProwinBin();
	let par = [filename];

	let oeConfig = getConfig();
	// output path (.R) only if has post actions
	if ((oeConfig.deployment)&&(oeConfig.deployment.find(item => item.taskType == 'current.r-code')))
		par.push(vscode.workspace.rootPath);
	else
		par.push('');
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
			rcodeDeploy(filename);
		}
		else
		showStatusBar('Syntax error', STATUS_COLOR.ERROR);
		return results;
	});
}
