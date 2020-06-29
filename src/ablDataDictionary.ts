import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');

import { createProArgs, getProBin, setupEnvironmentVariables } from './environment';
import { create } from './outputProcess';
import { outputChannel } from './notification';
import { ExtensionConfig } from './extensionConfig';

function genericPath(): string {
    if (vscode.window.activeTextEditor) {
        let folder = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
        if (folder)
            return folder.uri.fsPath;
    }
    let _genericWorkspaceFolder = ExtensionConfig.getInstance().getGenericWorkspaceFolder();
    if (_genericWorkspaceFolder) 
        return _genericWorkspaceFolder.uri.fsPath;
    return vscode.workspace.rootPath;
}

export function readDataDictionary(ablConfig: vscode.WorkspaceConfiguration) {
	let cmd = getProBin();

	let oeConfig = ExtensionConfig.getInstance().getConfig();
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
