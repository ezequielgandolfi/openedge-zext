import * as vscode from 'vscode';
import * as fs from 'fs';
import * as util from 'util';
import { DbType } from './types';


let _instance: DbfController;

/**
 * Controls database definition data
 */
export class DbfController {

    private readonly DBF_PATTERN = '**/.openedge-zext.db.*';
    private readonly DBF_DBNAME_REGEX = /\.openedge-zext\.db\.(\w+)$/i;
    private readonly readFileAsync = util.promisify(fs.readFile);

    private onChangeEmitter: vscode.EventEmitter<string> = new vscode.EventEmitter();
    private watcher: vscode.FileSystemWatcher = null;
    private dbfCollection: DbType.DbFile[] = [];

    static getInstance(): DbfController {
        if (!_instance)
            _instance = new DbfController();
        return _instance;
    }

    constructor() {
        this.startWatcher();
        process.nextTick(() => this.initDbFiles());
    }

    dispose() {
        this.stopWatcher();
    }

    get onChange() {
        return this.onChangeEmitter.event;
    }

    getCollection(database?:string) {
        if (database)
            return this.dbfCollection.filter(item => item.database == database);
        return this.dbfCollection;
    }

    getTable(name: string): DbType.Table {
        name = name.toLowerCase();
        return this.dbfCollection.find(item => item.name.toLowerCase() == name);
    }

    private startWatcher() {
        this.watcher = vscode.workspace.createFileSystemWatcher(this.DBF_PATTERN);
        this.watcher.onDidChange(uri => this.loadDbFile(uri.fsPath));
        this.watcher.onDidDelete(uri => this.unloadDbFile(uri.fsPath));
    }

    private stopWatcher() {
        this.watcher.dispose();
        this.watcher = null;
    }

    private initDbFiles() {
        vscode.workspace.findFiles(this.DBF_PATTERN).then(files => files.forEach(file => this.loadDbFile(file.fsPath)));
    }

    private loadDbFile(filename: string) {
        if (filename) {
            this.unloadDbFile(filename);
            this.readFileAsync(filename, { encoding: 'utf8' }).then(text => {
                try {
                    let data:any[] = JSON.parse(text);
                    let dbName = this.getDbName(filename);
                    this.dbfCollection.push(...this.mapDbFile(dbName,data));
                    this.onChangeEmitter.fire(dbName);
                }
                catch {
                    console.log(`Can't load database file ${filename}`);
                }
            });
        }
    }

    private unloadDbFile(filename: string) {
        if (filename) {
            let dbName = this.getDbName(filename);
            this.dbfCollection = this.dbfCollection.filter(item => item.database != dbName);
            this.onChangeEmitter.fire(dbName);
        }
    }

    private mapDbFile(dbName:string,list:any[]): DbType.DbFile[] {
        return list.map(item => {
            let dbfile: DbType.DbFile = {
                database: dbName,
                name: item.label,
                description: item.detail,
                fields: [],
                indexes: []
            };
            dbfile.indexes = [...item.indexes.map(index => {
                return <DbType.Index>{
                    name: index.label,
                    isPK: index.primary,
                    isUnique: index.unique,
                    fields: index.fields.map(f => f.label)
                }
            })];
            dbfile.fields = [...item.fields.map(field => {
                return <DbType.Field>{
                    name: field.label,
                    description: field.detail,
                    type: field.dataType,
                    mandatory: field.mandatory,
                    format: field.format,
                    isPK: !!dbfile.indexes.filter(i => i.isPK).find(i => i.fields.includes(field.label)),
                    isKey: !!dbfile.indexes.find(i => i.fields.includes(field.label))
                }
            })];
            return dbfile;
        });
    }

    private getDbName(filename:string): string {
        let match = filename.match(this.DBF_DBNAME_REGEX);
        if (match)
            return match[1].toLowerCase();
        return filename.toLowerCase();
    }

}
