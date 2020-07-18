import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import cp = require('child_process');
import { AblEnvironment } from './environment';

export class Process {

    static xcode(workspace: vscode.WorkspaceFolder, filename: string): Promise<boolean> {
        let baseName = path.basename(filename);
        let tmpDir = workspace.uri.fsPath;
        // temp xcode dir
        tmpDir = [tmpDir,'.xc'+Math.floor(Math.random()*100000).toString()].join('\\');
        // temp xcode output
        let outDir = [tmpDir, 'out'].join('\\');
        // mkdir (outDir is inside tmpDir)
        Process.mkdir(outDir);
        // copy file to temp dir
        let oldFilename = [workspace.uri.fsPath, baseName].join('\\');
        let newFilename = [tmpDir, baseName].join('\\');
        fs.copyFileSync(oldFilename, newFilename);
        // exec xcode
        let cwd = path.dirname(newFilename);
        let cmd = AblEnvironment.getInstance().xcodeBin;
    
        let args = [
            '-d',
            outDir,
            baseName
        ];
        return new Promise<boolean>(resolve => {
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

    static mkdir(path: string) {
        let dirs = path.split('\\');
        for (let i = 0; i < dirs.length; i++) {
            let dir = dirs.filter((v,idx) => { return (idx <= i) }).join('\\');
            if (dir.replace('\\','') == '') 
                continue;
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir);
        }
    }

}
