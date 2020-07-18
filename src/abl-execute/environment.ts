import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionConfig, OpenEdgeConfig } from '../extension-config';

export interface ProArgsOptions {
    startupProcedure: string;
    param?: string;
    parameterFiles?: string[];
    configFile?: string,
    databaseNames?: string[];
    batchMode?: boolean;
    temporaryDirectory?: string;
    workspaceRoot?: string;
}

export class AblEnvironment {

    static getInstance() {
        return new AblEnvironment();
    }

    get dlcPath() {
        let path = ExtensionConfig.getInstance().getConfig()?.dlcPath;
        return path ? path : process.env['DLC'];
    }

    get binPath() {
        return path.join(this.dlcPath, 'bin');
    }
    
    getBinaryPath(name: string) {
        return path.join(this.binPath, name);
    }
    
    get progressBin() {
        return this.getBinaryPath('_progres');
    }
    
    get xcodeBin() {
        return this.getBinaryPath('xcode.exe');
    }
    
    get prowinBin() {
        let prowin = this.getBinaryPath('prowin.exe');
        if (!fs.existsSync(prowin))
            prowin = this.getBinaryPath('prowin32.exe');
        return prowin;
    }

    createProArgs(options: ProArgsOptions): string[] {
        let pfArgs = [];
        if (options.parameterFiles) {
            // pfArgs = openEdgeConfig.parameterFiles.filter(pf => pf.trim().length > 0).map(pf => { return '-pf ' + pf; });
            pfArgs = options.parameterFiles.filter(pf => pf.trim().length > 0).reduce((r, a) => r.concat('-pf', a), []);
            for (let i = 0; i < pfArgs.length; i++) {
                pfArgs[i] = pfArgs[i].replace('${workspaceRoot}', options.workspaceRoot);
            }
        }
        let args = [
            '-T' // Redirect temp
        ];
        if (options.temporaryDirectory) {
            args.push(options.temporaryDirectory);
        } else {
            args.push(process.env['TEMP']);
        }
        args = args.concat(pfArgs);
        if (options.batchMode) {
            args.push('-b');
        }
        if (options.configFile) {
            args.push('-basekey', 'ini', '-ininame', options.configFile);
        }
        if (options.startupProcedure) {
            args.push('-p', options.startupProcedure);
        }
        if (options.param) {
            args.push('-param', options.param);
        }
    
        return args;
    }
    
    setupEnvironmentVariables(env: any, openEdgeConfig: OpenEdgeConfig, workspaceRoot: string): any {
        if (openEdgeConfig) {
            if (!openEdgeConfig.proPath || !(openEdgeConfig.proPath instanceof Array) || openEdgeConfig.proPath.length === 0) {
                openEdgeConfig.proPath = ['${workspaceRoot}'];
            }
            openEdgeConfig.proPath.push(path.join(ExtensionConfig.getInstance().getExtensionPath(), 'abl-src'));
            let paths = openEdgeConfig.proPath.map(p => {
                p = p.replace('${workspaceRoot}', workspaceRoot);
                p = p.replace('${workspaceFolder}', workspaceRoot);
                p = path.posix.normalize(p);
                return p;
            });
            // let paths = openEdgeConfig.proPath || [];
            env.VSABL_PROPATH = paths.join(',');
    
            if (openEdgeConfig.proPathMode) {
                env.VSABL_PROPATH_MODE = openEdgeConfig.proPathMode;
            } else {
                env.VSABL_PROPATH_MODE = 'append';
            }
        }
        env.VSABL_SRC = path.join(ExtensionConfig.getInstance().getExtensionPath(), 'abl-src');
        env.VSABL_WORKSPACE = workspaceRoot;
        return env;
    }
    
    expandPathVariables(path: string, env: any, variables: {[key: string]: string}): string {
        // format VSCode ${env:VAR}
        // path = path.replace(/\${env:([^}]+)}/g, (_, n) => {
        //     return env[n];
        // });
    
        // format DOS %VAR%
        path = path.replace(/%([^%]+)%/g, (_, n) => {
            return env[n];
        });
    
        // VSCode specific var ${workspaceFolder}
        path = path.replace(/\${([^}]+)}/g, (_, n) => {
            return variables[n];
        });
        return path;
    }
}
