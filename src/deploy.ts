import * as vscode from 'vscode';
import path = require('path');
import { getConfig } from './ablConfig';
import * as fs from 'fs';
import * as http from 'http';
import { DeploymentTask } from './openEdgeConfigFile';
import { mkdir } from './utils';

export enum TASK_TYPE {
	DEPLOY_SOURCE = 'current.source',
	DEPLOY_RCODE = 'current.r-code',
	DEPLOY_LISTING = 'current.listing',
	DEPLOY_XREF = 'current.xref',
	DEPLOY_XREFXML = 'current.xref-xml',
	DEPLOY_STRINGXREF = 'current.string-xref',
	DEPLOY_DEBUGLIST = 'current.debug-list',
	DEPLOY_PREPROCESS = 'current.preprocess',
	DEPLOY_XCODE = 'current.xcode',
	DEPLOY_ALL = 'current.all-compile'
}

export function documentDeploy(document: vscode.TextDocument) {
	let filename = document.uri.fsPath;
	let oeConfig = getConfig();
	if (oeConfig.deployment) {
		let tasks = oeConfig.deployment.filter(item => item.taskType == TASK_TYPE.DEPLOY_SOURCE);
		deploy(filename, path.dirname(filename), tasks);
	}
}

export function rcodeDeploy(filename: string) {
	return fileDeploy(filename, '.r', [TASK_TYPE.DEPLOY_RCODE,TASK_TYPE.DEPLOY_ALL]);
}

export function fileDeploy(filename: string, ext:string, taskTypes: string[]) {
	let oeConfig = getConfig();
	if (oeConfig.deployment) {
		let fname = filename.substring(0, filename.lastIndexOf('.')) + ext;
		fname = [vscode.workspace.rootPath, path.basename(fname)].join('\\');
		let dirname = path.dirname(filename);
		let tasks = oeConfig.deployment.filter(item => taskTypes.find(t => t == item.taskType));
		deploy(fname, dirname, tasks).then(() => {
			// if has deployment task, delete original file
			if (tasks.length > 0)
				fs.unlinkSync(fname);
		});
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
		if (tasks.length > 0)
			vscode.window.showInformationMessage('File ' + path.basename(filename) + ' deployed!');
		resolve();
	});
}
