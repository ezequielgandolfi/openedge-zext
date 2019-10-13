import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');

import { getProwinBin, createProArgs, getProBin, setupEnvironmentVariables } from './environment';
import { getConfig, genericWorkspaceFolder } from './ablConfig';
import { create } from './outputProcess';
import { outputChannel } from './notification';

function genericPath(): string {
    if (vscode.window.activeTextEditor)
        return vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri).uri.fsPath;
    if (genericWorkspaceFolder) 
        return genericWorkspaceFolder.uri.fsPath;
    return vscode.workspace.rootPath;
}

export function openDataDictionary() {
    let cwd = genericPath();
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
    let env = setupEnvironmentVariables(process.env, oeConfig, genericPath());
    let dbs = (oeConfig.dbDictionary ? oeConfig.dbDictionary.join(',') : '');
	let args = createProArgs({
        parameterFiles: oeConfig.parameterFiles,
        configFile: oeConfig.configFile,
		batchMode: true,
		startupProcedure: path.join(__dirname, '../abl-src/dict-dump.p'),
		param: dbs,
		workspaceRoot: genericPath()
    });
    let cwd = genericPath();
    cwd = oeConfig.workingDirectory ? oeConfig.workingDirectory.replace('${workspaceRoot}', genericPath()).replace('${workspaceFolder}', genericPath()) : cwd;
    vscode.window.showInformationMessage('Updating data dicionary...');
	create(cmd, args, { env: env, cwd: cwd }, outputChannel).then((res) => {
        vscode.window.showInformationMessage('Data dicionary ' + (res.success ? 'updated' : 'failed'));
    });
}
