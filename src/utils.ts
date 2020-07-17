import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import cp = require('child_process');
import { getXcodeBin } from './environment';

export function cleanArray(arr: string[]): string[] {
    if (!arr)
        return [];
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == '') {
            arr.splice(i, 1);
            i--;
        }
    }
    return arr;
}

export function padRight(text: string, size: number): string {
    while (text.length < size)
        text+=' ';
    return text;
}

export function removeInvalidRightChar(text: string): string {
    let regexValidWordEnd: RegExp = new RegExp(/[\w\d]$/);
    while(!regexValidWordEnd.test(text)) 
        text = text.substring(0, text.length-1);
    return text;
}

export function mkdir(path: string) {
    let dirs = path.split('\\');
    for (let i = 0; i < dirs.length; i++) {
        let dir = dirs.filter((v,idx) => { return (idx <= i) }).join('\\');
        if (dir.replace('\\','') == '') 
            continue;
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);
    }
}

export function saveAndExec(document: vscode.TextDocument, action: () => Promise<boolean>): Promise<boolean> {
    if (document.isDirty) {
        return new Promise(function(resolve,reject) {
            vscode.window.showInformationMessage('Current file has unsaved changes!', ...['Save', 'Cancel']).then(result => {
                if (result == 'Save') 
                    document.save().then(saved => { if (saved) { action().then(v => resolve(v)); }});
                else
                    resolve(false);
            });
        });
    }
    else
        return action().then(value => { return value });
}

export function xcode(workspace: vscode.WorkspaceFolder, filename: string): Promise<boolean> {
    let baseName = path.basename(filename);
    let tmpDir = workspace.uri.fsPath;
    // temp xcode dir
    tmpDir = [tmpDir,'.xc'+Math.floor(Math.random()*100000).toString()].join('\\');
    // temp xcode output
    let outDir = [tmpDir, 'out'].join('\\');
    // mkdir (outDir is inside tmpDir)
    mkdir(outDir);
    // copy file to temp dir
    let oldFilename = [workspace.uri.fsPath, baseName].join('\\');
    let newFilename = [tmpDir, baseName].join('\\');
    fs.copyFileSync(oldFilename, newFilename);
    // exec xcode
    let cwd = path.dirname(newFilename);
    let cmd = getXcodeBin();

    let args = [
        '-d',
        outDir,
        baseName
    ];
    return new Promise<boolean>((resolve, reject) => {
        cp.execFile(cmd, args, { cwd: cwd }, (err, stdout, stderr) => {
            // copy xcoded file to overwrite original file
            fs.copyFileSync([outDir,baseName].join('\\'), oldFilename);
            // remove files/dorectories
            fs.unlinkSync([outDir,baseName].join('\\'));
            fs.unlinkSync(newFilename);
            fs.rmdirSync(outDir);
            fs.rmdirSync(tmpDir);
            //
            if (err) 
                resolve(false);
            else
                resolve(true);
        });
    });
}

export function currentFolder(): vscode.WorkspaceFolder {
    return vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
}

export function replaceSnippetTableName(list: vscode.CompletionItem[], tableName: string, replacement: string): vscode.CompletionItem[] {
    let result = [...list];
    return result.map(item => {
        if (item.kind == vscode.CompletionItemKind.Snippet) {
            item = Object.assign(new vscode.CompletionItem(item.label),item);
            let regex = new RegExp('^(?:[\\W]*)('+tableName+')(?![\\w]+)', 'gim');
            let ss = '';
            if (item.insertText instanceof vscode.SnippetString)
                ss = item.insertText.value;
            else
                ss = item.insertText;
            item.insertText = new vscode.SnippetString(ss.replace(regex, replacement));
        }
        return item;
    });
}