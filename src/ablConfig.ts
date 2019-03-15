import { FileSystemWatcher, window, workspace, WorkspaceFolder } from 'vscode';
import { OpenEdgeConfig, loadConfigFile, OPENEDGE_CONFIG_FILENAME } from './openEdgeConfigFile';


let _openEdgeConfig: OpenEdgeConfig = null;
let watcher: FileSystemWatcher = null;
export var genericWorkspaceFolder: WorkspaceFolder = null;

function findConfigFile() {
    return workspace.findFiles(OPENEDGE_CONFIG_FILENAME).then(uris => {
        if (uris.length > 0) {
            genericWorkspaceFolder = workspace.getWorkspaceFolder(uris[0]);
            return uris[0].fsPath;
        }
        return null;
    });
}
function loadAndSetConfigFile(filename: string) {
    if (filename === null) {
        return Promise.resolve({});
    }
    return loadConfigFile(filename).then((config) => {
        _openEdgeConfig = config;
        return getConfig;
    });
}
export function loadOpenEdgeConfig() {
    return new Promise<OpenEdgeConfig | null>((resolve, reject) => {
        if (_openEdgeConfig === null) {
            watcher = workspace.createFileSystemWatcher('**/' + OPENEDGE_CONFIG_FILENAME);
            watcher.onDidChange(uri => loadAndSetConfigFile(uri.fsPath));
            watcher.onDidCreate(uri => loadAndSetConfigFile(uri.fsPath));
            watcher.onDidDelete(uri => loadAndSetConfigFile(uri.fsPath));

            findConfigFile().then(filename => loadAndSetConfigFile(filename)).then(config => resolve(config));
        } else {
            resolve(_openEdgeConfig);
        }
    });
}
export function getConfig() {
    return _openEdgeConfig;
}