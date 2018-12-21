import * as vscode from 'vscode';
import path = require('path');
import { outputChannel } from './notification';
import { getConfig } from './ablConfig';
import { getProBin, createProArgs, setupEnvironmentVariables } from './ablPath';
import { create } from './outputProcess';

export function run(filename: string, ablConfig: vscode.WorkspaceConfiguration): Promise<any> {
	outputChannel.clear();
	let cwd = path.dirname(filename);
	let cmd = getProBin();

	let oeConfig = getConfig();
	let env = setupEnvironmentVariables(process.env, oeConfig, vscode.workspace.rootPath);
	let args = createProArgs({
		parameterFiles: oeConfig.parameterFiles,
		configFile: oeConfig.configFile,
		batchMode: true,
		startupProcedure: path.join(__dirname, '../abl-src/run.p'),
		param: filename,
		workspaceRoot: vscode.workspace.rootPath
	});
	cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', vscode.workspace.rootPath).replace('${workspaceFolder}', vscode.workspace.rootPath) : cwd;
	return create(cmd, args, { env: env, cwd: cwd }, outputChannel);
}
