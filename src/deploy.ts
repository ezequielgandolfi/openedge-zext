import * as vscode from 'vscode';
import path = require('path');
import { getConfig } from './ablConfig';
import * as fs from 'fs';
import * as http from 'http';
import { DeploymentTask } from './openEdgeConfigFile';
import { mkdir } from './utils';

export function sourceDeploy(filename: string) {
	let oeConfig = getConfig();
	if (oeConfig.deployment) {
		let tasks = oeConfig.deployment.filter(item => item.taskType == 'current.source');
		deploy(filename, path.dirname(filename), tasks);
	}
}

export function rcodeDeploy(filename: string) {
	let oeConfig = getConfig();
	if (oeConfig.deployment) {
		let fname = filename.substring(0, filename.lastIndexOf('.')) + '.r';
		fname = [vscode.workspace.rootPath, path.basename(fname)].join('\\');
		let dirname = path.dirname(filename);
		let tasks = oeConfig.deployment.filter(item => item.taskType == 'current.r-code');
		deploy(fname, dirname, tasks).then(() => fs.unlinkSync(fname));
	}
}

function deploy(filename: string, dirname: string, tasks: DeploymentTask[]): Promise<any> {
	let oeConfig = getConfig();
	return new Promise(function(resolve,reject) {
		tasks.forEach(task => {
			// copy file
			let fname = [dirname, path.basename(filename)].join('\\');
			fname = fname.replace(vscode.workspace.rootPath, task.path);
			let cwd = path.dirname(fname);
			if (!fs.existsSync(cwd))
				mkdir(cwd);
			fs.createReadStream(filename).pipe(fs.createWriteStream(fname));
			// post-action
			if (task.postAction) {
				task.postAction.forEach(action => {
					if (action.actionType == 'URL')
						http.get(action.command, () => {});
				});
			}
		});
		// notification
		vscode.window.showInformationMessage('Source ' + path.basename(filename) + ' deployed!');
		resolve();
	});
}
