import * as vscode from 'vscode';
import path = require('path');
import { outputChannel } from './notification';
import { getConfig } from './ablConfig';
import { createProArgs, setupEnvironmentVariables, getProwinBin } from './environment';
import { create } from './outputProcess';

export function execRun(filename: string, ablConfig: vscode.WorkspaceConfiguration): Promise<any> {
	outputChannel.clear();
	let cwd = path.dirname(filename);
	let cmd = getProwinBin();
	
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
	return result;
}
