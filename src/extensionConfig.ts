import * as vscode from 'vscode';
import * as fs from 'fs';
import { isNullOrUndefined, promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

let _extensionConfig: ExtensionConfig;

export interface PostActionTask {
    actionType: 'URL' | '';
    command?: string;
}
export interface DeploymentTask {
    taskType: 'current.all-compile' | 'current.r-code' | 'current.source' | 'current.listing' | 'current.xref' | 'current.xref-xml' | 'current.string-xml' | 'current.debug-list' | 'current.preprocess';
    path: string;
    postAction?: PostActionTask[];
}
export interface OpenEdgeFormatOptions {
    trim?: 'none' | 'right';
}
export interface OpenEdgeConfig {
    proPath?: string[];
    proPathMode?: 'append' | 'overwrite' | 'prepend';
    parameterFiles?: string[];
    configFile?: string;
    workingDirectory?: string;
    dlcPath?: string;
    dbDictionary?: string[];
    deployment?: DeploymentTask[];
    format?: OpenEdgeFormatOptions;
}

export class ExtensionConfig {

    readonly OPENEDGE_CONFIG_FILENAME = '.openedge-zext.json';
    readonly THIS_EXTENSION = 'ezequielgandolfi.openedge-zext';

    private _context: vscode.ExtensionContext;
    private _openEdgeConfig: OpenEdgeConfig = null;
    private _watcher: vscode.FileSystemWatcher = null;
    private _genericWorkspaceFolder: vscode.WorkspaceFolder = null;

    constructor(context: vscode.ExtensionContext) {
        _extensionConfig = this;
        this._context = context;
        this.initConfig();
        this.initWatcher();
    }

    static getInstance(): ExtensionConfig {
        return _extensionConfig;
    }

    private findConfigFile(): Thenable<vscode.Uri> {
        return vscode.workspace.findFiles(this.OPENEDGE_CONFIG_FILENAME).then(uris => {
            if (uris.length > 0) {
                return uris[0];
            }
            return null;
        });
    }

    private loadAndSetConfigFile(uri?: vscode.Uri) {
        if (isNullOrUndefined(uri)) {
            return;
        }
        this.loadFile(uri.fsPath).then(config => {
            this._openEdgeConfig = config;
            if (!this._genericWorkspaceFolder)
                this._genericWorkspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        });
    }

    private initWatcher() {
        this._watcher = vscode.workspace.createFileSystemWatcher('**/' + this.OPENEDGE_CONFIG_FILENAME);
        this._watcher.onDidChange(uri => this.loadAndSetConfigFile(uri));
        this._watcher.onDidCreate(uri => this.loadAndSetConfigFile(uri));
        this._watcher.onDidDelete(uri => this.loadAndSetConfigFile(uri));
    }

    private initConfig() {
        this.findConfigFile().then(uri => this.loadAndSetConfigFile(uri));
    }

    private loadFile(filename: string): Thenable<OpenEdgeConfig> {
        if (!filename)
            return Promise.resolve({});
        return readFileAsync(filename, { encoding: 'utf8' }).then(text => {
            return JSON.parse(text);
        });
    }

    getContext() {
        return this._context;
    }

    getConfig(mergeConfig?: OpenEdgeConfig): OpenEdgeConfig {
        let result = this._openEdgeConfig || {};
        if (isNullOrUndefined(mergeConfig))
            return result;
        else
            // deep copy from config
            return Object.assign({}, JSON.parse(JSON.stringify(result)), mergeConfig);
    }

    getGenericWorkspaceFolder(): vscode.WorkspaceFolder {
        return this._genericWorkspaceFolder;
    }

    getExtensionPath() {
        return vscode.extensions.getExtension(this.THIS_EXTENSION).extensionPath;
    }
    
}




