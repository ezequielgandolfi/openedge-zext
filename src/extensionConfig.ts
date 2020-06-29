import { FileSystemWatcher, workspace, WorkspaceFolder } from 'vscode';
import { isNullOrUndefined, promisify } from 'util';
import { readFile } from 'fs';

const readFileAsync = promisify(readFile);

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

    private _openEdgeConfig: OpenEdgeConfig = null;
    private _watcher: FileSystemWatcher = null;
    private _genericWorkspaceFolder: WorkspaceFolder = null;

    constructor() {
        _extensionConfig = this;
        this.initConfig();
        this.initWatcher();
    }

    static getInstance(): ExtensionConfig {
        return _extensionConfig;
    }

    private findConfigFile(): Thenable<string> {
        return workspace.findFiles(this.OPENEDGE_CONFIG_FILENAME).then(uris => {
            if (uris.length > 0) {
                this._genericWorkspaceFolder = workspace.getWorkspaceFolder(uris[0]);
                return uris[0].fsPath;
            }
            return null;
        });
    }

    private loadAndSetConfigFile(filename?: string) {
        if (isNullOrUndefined(filename)) {
            return;
        }
        this.loadFile(filename).then(config => this._openEdgeConfig = config);
    }

    private initWatcher() {
        this._watcher = workspace.createFileSystemWatcher('**/' + this.OPENEDGE_CONFIG_FILENAME);
        this._watcher.onDidChange(uri => this.loadAndSetConfigFile(uri.fsPath));
        this._watcher.onDidCreate(uri => this.loadAndSetConfigFile(uri.fsPath));
        this._watcher.onDidDelete(uri => this.loadAndSetConfigFile(uri.fsPath));
    }

    private initConfig() {
        this.findConfigFile().then(filename => this.loadAndSetConfigFile(filename));
    }

    private loadFile(filename: string): Thenable<OpenEdgeConfig> {
        if (!filename)
            return Promise.resolve({});
        return readFileAsync(filename, { encoding: 'utf8' }).then(text => {
            return JSON.parse(text);
        });
    }

    getConfig(mergeConfig?: OpenEdgeConfig): OpenEdgeConfig {
        let result = this._openEdgeConfig || {};
        if (isNullOrUndefined(mergeConfig))
            return result;
        else
            return Object.assign(result, mergeConfig);
    }

    getGenericWorkspaceFolder(): WorkspaceFolder {
        return this._genericWorkspaceFolder;
    }
    
}




