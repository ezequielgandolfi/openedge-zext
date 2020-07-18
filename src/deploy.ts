import * as vscode from 'vscode';
import path = require('path');
import * as fs from 'fs';
import * as http from 'http';
import { ExtensionConfig, DeploymentTask } from './extensionConfig';
import { AblExecute } from './abl-execute';

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
    let workspace = vscode.workspace.getWorkspaceFolder(document.uri);
    let oeConfig = ExtensionConfig.getInstance().getConfig();
    if (oeConfig.deployment) {
        let tasks = oeConfig.deployment.filter(item => item.taskType == TASK_TYPE.DEPLOY_SOURCE);
        deploy(workspace, filename, path.dirname(filename), tasks);
    }
}

export function rcodeDeploy(workspace: vscode.WorkspaceFolder, filename: string) {
    return fileDeploy(workspace, filename, '.r', [TASK_TYPE.DEPLOY_RCODE,TASK_TYPE.DEPLOY_ALL]);
}

export function fileDeploy(workspace: vscode.WorkspaceFolder, filename: string, ext:string, taskTypes: string[]) {
    let oeConfig = ExtensionConfig.getInstance().getConfig();
    if (oeConfig.deployment && workspace) {
        let fname = filename.substring(0, filename.lastIndexOf('.')) + ext;
        fname = [workspace.uri.fsPath, path.basename(fname)].join('\\');
        let dirname = path.dirname(filename);
        //  check if file exists on workspace path, or inside .CLS path (abl classes)
        if (!fs.existsSync(fname))
            fname = [dirname,path.basename(fname)].join('\\');
        let tasks = oeConfig.deployment.filter(item => taskTypes.find(t => t == item.taskType));
        deploy(workspace, fname, dirname, tasks).then(() => {
            // if has deployment task, delete original file
            if (tasks.length > 0)
                fs.unlinkSync(fname);
        });
    }
}

function deploy(workspace: vscode.WorkspaceFolder, filename: string, dirname: string, tasks: DeploymentTask[]): Promise<any> {
    // check if file exists
    if (!fs.existsSync(filename)) {
        vscode.window.showErrorMessage(`File ${path.basename(filename)} not found`);
        return Promise.resolve();
    }

    let oeConfig = ExtensionConfig.getInstance().getConfig();
    return new Promise(function(resolve,reject) {
        tasks.forEach(task => {
            // copy file
            let fname = [dirname, path.basename(filename)].join('\\');
            fname = fname.replace(workspace.uri.fsPath, task.path);
            let cwd = path.dirname(fname);
            if (!fs.existsSync(cwd))
                AblExecute.Process.mkdir(cwd);
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
