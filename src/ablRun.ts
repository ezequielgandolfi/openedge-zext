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
	let workspace = vscode.workspace.getWorkspaceFolder(document.uri);
	let cwd = path.dirname(filename);
	let cmd = getProwinBin();

	let doRun = (): Promise<any> => {
		// output information
		outputChannel.appendLine('> OpenEdge executable = ' + cmd);
		outputChannel.appendLine('> Program name = ' + filename);

		let oeConfig = getConfig();
		let env = setupEnvironmentVariables(process.env, oeConfig, workspace.uri.fsPath);
		let args = createProArgs({
			parameterFiles: oeConfig.parameterFiles,
			configFile: oeConfig.configFile,
			batchMode: false,
			startupProcedure: path.join(__dirname, '../abl-src/run.p'),
			param: filename,
			workspaceRoot: workspace.uri.fsPath
		});
		cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', workspace.uri.fsPath).replace('${workspaceFolder}', workspace.uri.fsPath) : cwd;
		let result = create(cmd, args, { env: env, cwd: cwd }, outputChannel);
		result.then(() => outputChannel.appendLine('> End'));
		return result;
	}

	return saveAndExec(document, doRun);
}
