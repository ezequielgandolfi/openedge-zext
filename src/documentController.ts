import * as vscode from "vscode";
import * as utils from './utils';
import * as fs from 'fs';
import { ABL_MODE } from "./environment";
import { SYMBOL_TYPE, ABLVariable, ABLMethod, ABLParameter, ABLInclude, ABLTempTable } from "./definition";
import { ABLHoverProvider } from "./hover";
import { ABLCodeCompletion } from "./codeCompletion";
import { getAllIncludes, getAllMethods, getAllVariables, getAllParameters, getAllTempTables } from "./processDocument";
import { getConfig } from "./ablConfig";

let thisInstance: ABLDocumentController;
export function getDocumentController(): ABLDocumentController {
	return thisInstance;
}
export function initDocumentController(context: vscode.ExtensionContext): ABLDocumentController {
	thisInstance = new ABLDocumentController(context);
	return thisInstance;
}

class ABLDocument {
	private _document: vscode.TextDocument;
	private _symbols: vscode.SymbolInformation[];
	private _vars: ABLVariable[];
	private _methods: ABLMethod[];
	private _params: ABLParameter[];
	private _includes: ABLInclude[];
	private _temps: ABLTempTable[];

	public disposables: vscode.Disposable[] = [];
	public debounceController;

	public externalDocument: vscode.TextDocument[] = [];

	constructor(document: vscode.TextDocument) {
		this._document = document;
		this._symbols = [];
		this._vars = [];
		this._methods = [];
		this._params = [];
		this._includes = [];
		this._temps = [];
	}

	dispose() {
		vscode.Disposable.from(...this.disposables).dispose();
	}

	public get symbols(): vscode.SymbolInformation[] {return this._symbols}
	public get methods(): ABLMethod[] {return this._methods}
	public get includes(): ABLInclude[] {return this._includes}
	public get tempTables(): ABLTempTable[] {return this._temps}
	public get document(): vscode.TextDocument {return this._document}

	public refreshDocument() {
		this._symbols = [];
		this.externalDocument = [];

		// comandos abaixos estão demorando, e pendura as extensoes... verificar...
		try {
			this.refreshIncludes();
			this.refreshMethods();
			this.refreshVariables();
			this.refreshParameters();
			this.refreshTempTables();	
		} catch (error) {
			console.log('ERROR', error);
		}
		
	}

	public refreshIncludes() {
		this._includes = getAllIncludes(this._document);
		this._includes.forEach(item => {
			vscode.workspace.workspaceFolders.forEach(folder => {
				let uri = folder.uri.with({path: [folder.uri.path,item.name].join('/')});
				if (fs.existsSync(uri.fsPath)) {
					if(!this._symbols.find(s => (s.name == item.name) && (s.containerName == SYMBOL_TYPE.INCLUDE) )) {
						let s = new vscode.SymbolInformation(item.name, vscode.SymbolKind.File, SYMBOL_TYPE.INCLUDE, new vscode.Location(uri, new vscode.Position(0, 0)));
						this._symbols.push(s);
					}
					if(!this.externalDocument.find(item => item.uri.fsPath == uri.fsPath)) {
						vscode.workspace.openTextDocument(uri).then(doc => this.externalDocument.push(doc));
					}
				}
			})
		});
	}

	public refreshMethods() {
		this._methods = getAllMethods(this._document);
		this._methods.forEach(item => {
			let s = new vscode.SymbolInformation(item.name, vscode.SymbolKind.Variable, SYMBOL_TYPE.METHOD, new vscode.Location(this._document.uri, new vscode.Position(item.lineAt, 0)));
			this._symbols.push(s);
		});
	}

	public refreshReferences(): Thenable<any> {
		let document = this._document;
		let symbols = this._symbols;

		let line;

		return new Promise(function(resolve,reject) {
			for(let i = 0; i < document.lineCount; i++) {
				line = document.lineAt(i);
				if (!line.isEmptyOrWhitespace) {
					/*
					methodName = utils.getMethodDefinition(line.text);
					if(methodName != '') {
						symbols[methodName] = (new vscode.SymbolInformation(methodName, vscode.SymbolKind.Method, document.uri.fsPath, new vscode.Location(document.uri,  new vscode.Position(i, 0))));
					}
					*/
				}
			}
			resolve();
		});
	}

	public refreshVariables() {
		this._vars = getAllVariables(this._document);
		this._vars.forEach(item => {
			let method = this._methods.find(m => (m.lineAt <= item.line && m.lineEnd >= item.line));
			let nm = item.name;
			let st = SYMBOL_TYPE.GLOBAL_VAR;
			if (method) {
				nm+='@'+method.name;
				st = SYMBOL_TYPE.LOCAL_VAR;
			}
			let s = new vscode.SymbolInformation(nm, vscode.SymbolKind.Variable, st, new vscode.Location(this._document.uri, new vscode.Position(item.line, 0)));
			this._symbols.push(s);
		});
	}

	public refreshParameters() {
		this._params = getAllParameters(this._document);
		this._params.forEach(item => {
			let method = this._methods.find(m => (m.lineAt <= item.line && m.lineEnd >= item.line));
			let nm = item.name;
			let st = SYMBOL_TYPE.GLOBAL_PARAM;
			if (method) {
				nm+='@'+method.name;
				st = SYMBOL_TYPE.LOCAL_PARAM;
			}
			let s = new vscode.SymbolInformation(nm, vscode.SymbolKind.Property, st, new vscode.Location(this._document.uri, new vscode.Position(item.line, 0)));
			this._symbols.push(s);
		});
	}

	public refreshTempTables() {
		this._temps = getAllTempTables(this._document);
	}
}

export class ABLDocumentController {

	private _documents: ABLDocument[] = [];

	constructor(context: vscode.ExtensionContext) {
		this.initialize(context);
	}

	dispose() {
		this._documents.forEach(d => d.dispose());
	}

	private initialize(context: vscode.ExtensionContext) {
		//
		context.subscriptions.push(this);

		let ablSymbol = new ABLSymbolProvider(this);
		context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(ABL_MODE.language, ablSymbol));
		
		let ablDefinition = new ABLDefinitionProvider(this);
		context.subscriptions.push(vscode.languages.registerDefinitionProvider(ABL_MODE.language, ablDefinition));

		/*let ablReference = new ABLReferenceProvider(ablDocumentController);
		subscriptions.push(vscode.languages.registerReferenceProvider(ABL_MODE.language, ablReference));*/

		let ablHover = new ABLHoverProvider(this);
		context.subscriptions.push(vscode.languages.registerHoverProvider(ABL_MODE.language, ablHover));

		let ablCodeCompletion = new ABLCodeCompletion(this);
		context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ABL_MODE.language, ablCodeCompletion, '.'));

		// Current documents
		vscode.workspace.textDocuments.forEach(document => {
			this.insertDocument(document);
		});

		// Document changes
		vscode.workspace.onDidSaveTextDocument(document => { this.updateDocument(document) }, null, context.subscriptions);
		vscode.workspace.onDidOpenTextDocument(document => { this.insertDocument(document) }, null, context.subscriptions);
		vscode.workspace.onDidCloseTextDocument(document => { this.removeDocument(document) }, null, context.subscriptions);
		vscode.workspace.onWillSaveTextDocument(event => { this.prepareToSaveDocument(event.document) }, null, context.subscriptions);
	}

	public insertDocument(document: vscode.TextDocument) {
		if (document.languageId === ABL_MODE.language) {
			if (!this._documents[document.uri.fsPath]) {
				let ablDoc = new ABLDocument(document);
				this._documents[document.uri.fsPath] = ablDoc;

				vscode.workspace.onDidChangeTextDocument(event => {
					if(event.document.uri.fsPath == document.uri.fsPath) {
						this.updateDocument(document, 5000);
					}
				}, this, ablDoc.disposables);
			}
			return this.updateDocument(document);
		}

	}

	public removeDocument(document: vscode.TextDocument) {
		let d: ABLDocument = this._documents[document.uri.fsPath];
		if (d) {
			if(d.debounceController) {
				clearTimeout(d.debounceController);
				d.debounceController = null;
			}
			vscode.Disposable.from(...d.disposables).dispose();
		}
		delete this._documents[document.uri.fsPath];
	}

	public updateDocument(document: vscode.TextDocument, debounceTime?:number): Thenable<any> {
		if (document.languageId === ABL_MODE.language) {
			let ablDoc: ABLDocument = this._documents[document.uri.fsPath];
			let invoke = this.invokeUpdateDocument;
			return new Promise(function(resolve,reject) {
				if (ablDoc) {
					// cancel any pending update request
					if (ablDoc.debounceController) {
						clearTimeout(ablDoc.debounceController);
					}
					// if debouce time is set, creates a timer
					if (debounceTime) {
						ablDoc.debounceController = setTimeout(() => invoke(ablDoc), debounceTime);
					}
					else  {
						invoke(ablDoc);
					}
					// always resolve, even if debounce time is set...
					resolve();
				}
				else 
					reject();
			});
		}
	}

	public prepareToSaveDocument(document: vscode.TextDocument) {
		let oeConfig = getConfig();
		if (oeConfig.editor && oeConfig.editor.trim == 'right') {
			//
		}
	}

	public getDocument(document: vscode.TextDocument): ABLDocument {
		return this._documents[document.uri.fsPath];
	}

	private invokeUpdateDocument(ablDoc: ABLDocument) {
		ablDoc.refreshDocument();
	}

}

export class ABLDefinitionProvider implements vscode.DefinitionProvider {
	private _ablDocumentController: ABLDocumentController;

	constructor(controller: ABLDocumentController) {
		this._ablDocumentController = controller;
	}

	public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Location> {
		// go-to definition
		let selection = utils.getText(document, position);

		let symbol = this._ablDocumentController.getDocument(document).symbols.find(item => item.name.toLowerCase() == selection.statement);
		if (symbol) 
			return Promise.resolve(symbol.location);
		else 
			return;
	}
}

export class ABLReferenceProvider implements vscode.ReferenceProvider {
	private _ablDocumentController: ABLDocumentController;

	constructor(controller: ABLDocumentController) {
		this._ablDocumentController = controller;
	}

	public provideReferences(document: vscode.TextDocument, position: vscode.Position, options: { includeDeclaration: boolean }, token: vscode.CancellationToken): Thenable<vscode.Location[]> {
		// find all references

		//
		//this._ablDocumentController.getDocument(document).symbols

		return;
	}
}

export class ABLSymbolProvider implements vscode.DocumentSymbolProvider {
	private _ablDocumentController: ABLDocumentController;

	constructor(controller: ABLDocumentController) {
		this._ablDocumentController = controller;
	}

	public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
		return Promise.resolve(this._ablDocumentController.getDocument(document).symbols);
	}
}

