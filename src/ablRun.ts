import * as vscode from 'vscode';
import path = require('path');
import { outputChannel, hideStatusBar } from './notification';
import { createProArgs, setupEnvironmentVariables, getProwinBin } from './environment';
import { create } from './outputProcess';
import { saveAndExec } from './utils';
import { isNullOrUndefined } from 'util';
import { ExtensionConfig } from './extensionConfig';

export function execRun(document: vscode.TextDocument, ablConfig: vscode.WorkspaceConfiguration) {
    outputChannel.clear();
    hideStatusBar(document.uri.fsPath);
	let filename = document.uri.fsPath;
	let workspace = vscode.workspace.getWorkspaceFolder(document.uri);
	let cwd = path.dirname(filename);
    let cmd = getProwinBin();
    
    let wsPath;
    if (!isNullOrUndefined(workspace))
        wsPath = workspace.uri.fsPath;
    else
        wsPath = path.dirname(filename);

	let doRun = (): Promise<any> => {
		// output information
		outputChannel.appendLine('> OpenEdge executable = ' + cmd);
        outputChannel.appendLine('> Program name = ' + filename);
        outputChannel.appendLine('> Workspace root = ' + wsPath);

		let oeConfig = ExtensionConfig.getInstance().getConfig();
		let env = setupEnvironmentVariables(process.env, oeConfig, wsPath);
		let args = createProArgs({
			parameterFiles: oeConfig.parameterFiles,
			configFile: oeConfig.configFile,
			batchMode: false,
			startupProcedure: path.join(__dirname, '../abl-src/run.p'),
			param: filename,
			workspaceRoot: wsPath
		});
		cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', wsPath).replace('${workspaceFolder}', wsPath) : cwd;
		let result = create(cmd, args, { env: env, cwd: cwd }, outputChannel);
		result.then(() => outputChannel.appendLine('> End'));
		return result;
	}

	return saveAndExec(document, doRun);
}
