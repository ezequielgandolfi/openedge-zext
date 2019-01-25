import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');

import { getProwinBin, createProArgs, getProBin, setupEnvironmentVariables } from './environment';
import { getConfig } from './ablConfig';
import { create } from './outputProcess';
import { outputChannel } from './notification';

export function openDataDictionary() {
    let cwd = vscode.workspace.rootPath;
    let env = process.env;
    let cmd = getProwinBin();

    // TODO : reuse the openedgeconfig file and pf files defined
    let args = createProArgs({
        startupProcedure: '_dict.p'
    });
    cp.spawn(cmd, args, { env: env, cwd: cwd, detached: true });
}

export function readDataDictionary(ablConfig: vscode.WorkspaceConfiguration) {
	let cmd = getProBin();

	let oeConfig = getConfig();
    let env = setupEnvironmentVariables(process.env, oeConfig, vscode.workspace.rootPath);
    let dbs = (oeConfig.dbDictionary ? oeConfig.dbDictionary.join(',') : '');
	let args = createProArgs({
        parameterFiles: oeConfig.parameterFiles,
        configFile: oeConfig.configFile,
		batchMode: true,
		startupProcedure: path.join(__dirname, '../abl-src/dict-dump.p'),
		param: dbs,
		workspaceRoot: vscode.workspace.rootPath
    });
    let cwd = vscode.workspace.rootPath;
	cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', vscode.workspace.rootPath).replace('${workspaceFolder}', vscode.workspace.rootPath) : cwd;
	create(cmd, args, { env: env, cwd: cwd }, outputChannel).then((res) => {
        vscode.window.showInformationMessage('Data dicionary ' + (res.success ? 'updated' : 'failed'));
    });
}
