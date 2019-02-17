import * as vscode from "vscode";
import * as utils from './utils';
import * as fs from 'fs';
import { ABL_MODE } from "./environment";
import { SYMBOL_TYPE, ABLVariable, ABLMethod, ABLParameter, ABLInclude, ABLTempTable } from "./definition";
import { ABLHoverProvider } from "./hover";
import { ABLCodeCompletion } from "./codeCompletion";
import { getAllIncludes, getAllMethods, getAllVariables, getAllParameters, getAllTempTables } from "./processDocument";
import { SourceCode, SourceParser } from "./sourceParser";

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

	private _processed: boolean;

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
		this._processed = false;
	}

	dispose() {
		vscode.Disposable.from(...this.disposables).dispose();
	}

	public get symbols(): vscode.SymbolInformation[] {return this._symbols}
	public get methods(): ABLMethod[] {return this._methods}
	public get includes(): ABLInclude[] {return this._includes}
	public get tempTables(): ABLTempTable[] {return this._temps}
	public get document(): vscode.TextDocument {return this._document}
	public get processed(): boolean {return this._processed}

	public refreshDocument(): Promise<ABLDocument> {
		this._processed = false;
		this._symbols = [];
		this.externalDocument = [];

		let refreshIncludes = this.refreshIncludes.bind(this);
		let refreshMethods = this.refreshMethods.bind(this);
		let refreshVariables = this.refreshVariables.bind(this);
		let refreshParameters = this.refreshParameters.bind(this);
		let refreshTempTables = this.refreshTempTables.bind(this);
		let self = this;

		let sourceCode = new SourceParser().getSourceCode(this._document);

		let result = new Promise<ABLDocument>(function(resolve,reject) {
			refreshIncludes(sourceCode);
			refreshMethods(sourceCode);
			refreshVariables(sourceCode);
			refreshParameters(sourceCode);
			refreshTempTables(sourceCode);
			resolve(self);
		});
		
		// refresh temp-table "like" from other temp-tables (check if external document has been processed)
		// create procedure snippets with parameters

		// finaliza processo
		let finish = () => {this._processed = true};
		result.then(() => finish());
		return result;
	}

	private refreshIncludes(sourceCode: SourceCode) {
		this._includes = getAllIncludes(sourceCode);
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

	private refreshMethods(sourceCode: SourceCode) {
		this._methods = getAllMethods(sourceCode);
		this._methods.forEach(item => {
			let s = new vscode.SymbolInformation(item.name, vscode.SymbolKind.Variable, SYMBOL_TYPE.METHOD, new vscode.Location(this._document.uri, new vscode.Position(item.lineAt, 0)));
			this._symbols.push(s);
		});
	}

	/*private refreshReferences(sourceCode: SourceCode): Thenable<any> {
		let document = this._document;
		let symbols = this._symbols;

		let line;

		return new Promise(function(resolve,reject) {
			for(let i = 0; i < document.lineCount; i++) {
				line = document.lineAt(i);
				if (!line.isEmptyOrWhitespace) {
					
					methodName = utils.getMethodDefinition(line.text);
					if(methodName != '') {
						symbols[methodName] = (new vscode.SymbolInformation(methodName, vscode.SymbolKind.Method, document.uri.fsPath, new vscode.Location(document.uri,  new vscode.Position(i, 0))));
					}
					
				}
			}
			resolve();
		});
	}*/

	private refreshVariables(sourceCode: SourceCode) {
		this._vars = getAllVariables(sourceCode);
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

	private refreshParameters(sourceCode: SourceCode) {
		this._params = getAllParameters(sourceCode);
		this._params.forEach(item => {
			let method = this._methods.find(m => (m.lineAt <= item.line && m.lineEnd >= item.line));
			let nm = item.name;
			let st = SYMBOL_TYPE.GLOBAL_PARAM;
			if (method) {
				nm+='@'+method.name;
				st = SYMBOL_TYPE.LOCAL_PARAM;
				method.params.push(item);
			}
			let s = new vscode.SymbolInformation(nm, vscode.SymbolKind.Property, st, new vscode.Location(this._document.uri, new vscode.Position(item.line, 0)));
			this._symbols.push(s);
		});
	}

	private refreshTempTables(sourceCode: SourceCode) {
		this._temps = getAllTempTables(sourceCode);
		this._temps.forEach(item => {
			let s = new vscode.SymbolInformation(item.label, vscode.SymbolKind.Variable, SYMBOL_TYPE.TEMPTABLE, new vscode.Location(this._document.uri, new vscode.Position(item.line, 0)));
			this._symbols.push(s);
		});
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
		//
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
		let doc = this._ablDocumentController.getDocument(document);

		let symbol;
		// search full statement
		symbol = doc.symbols.find(item => item.name.toLowerCase() == selection.statement);
		if (symbol) 
			return Promise.resolve(symbol.location);
		// search word statement
		symbol = doc.symbols.find(item => item.name.toLowerCase() == selection.word);
		if (symbol) 
			return Promise.resolve(symbol.location);
		// search external documents
		doc.externalDocument.forEach(ext => {
			if (symbol)
				return;
			let extDoc = this._ablDocumentController.getDocument(ext);
			// search full statement
			symbol = extDoc.symbols.find(item => item.name.toLowerCase() == selection.statement);
			// search word statement
			if (!symbol)
				symbol = extDoc.symbols.find(item => item.name.toLowerCase() == selection.word);
		});
		if (symbol)
			return Promise.resolve(symbol.location);
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

