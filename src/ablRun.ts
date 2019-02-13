import * as vscode from 'vscode';
import path = require('path');
import { outputChannel, hideStatusBar } from './notification';
import { getConfig } from './ablConfig';
import { createProArgs, setupEnvironmentVariables, getProwinBin } from './environment';
import { create } from './outputProcess';
import { saveAndExec } from './utils';

export function execRun(document: vscode.TextDocument, ablConfig: vscode.WorkspaceConfiguration) {
	outputChannel.clear();
	hideStatusBar();
	let filename = document.uri.fsPath;
	let cwd = path.dirname(filename);
	let cmd = getProwinBin();

	let doRun = () => {
		// output information
		outputChannel.appendLine('> OpenEdge executable = ' + cmd);
		outputChannel.appendLine('> Program name = ' + filename);

		let oeConfig = getConfig();
		let env = setupEnvironmentVariables(process.env, oeConfig, vscode.workspace.rootPath);
		let args = createProArgs({
			parameterFiles: oeConfig.parameterFiles,
			configFile: oeConfig.configFile,
			batchMode: false,
			startupProcedure: path.join(__dirname, '../abl-src/run.p'),
			param: filename,
			workspaceRoot: vscode.workspace.rootPath
		});
		cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', vscode.workspace.rootPath).replace('${workspaceFolder}', vscode.workspace.rootPath) : cwd;
		let result = create(cmd, args, { env: env, cwd: cwd }, outputChannel);
		result.then(() => outputChannel.appendLine('> End'));
	}

	saveAndExec(document, doRun);
}
