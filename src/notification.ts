import { ABL_MODE } from './environment';
import * as vscode from 'vscode';
import { isNullOrUndefined } from 'util';

export let outputChannel = vscode.window.createOutputChannel('OpenEdge');
let statusMessages: {fsPath:string,text?:string,color?:any,active?:boolean}[] = [];
let statusBarEntry: vscode.StatusBarItem;

export let errorDiagnosticCollection: vscode.DiagnosticCollection;
export let warningDiagnosticCollection: vscode.DiagnosticCollection;

export enum STATUS_COLOR {
    INFO = 'yellow',
    SUCCESS = 'lime',
    ERROR = 'violet'
}

export function updateStatusBar() {
    updateDocumentStatusBar(vscode.window.activeTextEditor.document.uri.fsPath);
}

function updateDocumentStatusBar(fsPath: string) {
    statusBarEntry.hide();

    let msg = statusMessages.find(item => item.fsPath == fsPath);
    if (!isNullOrUndefined(msg) && msg.active) {
        statusBarEntry.text = msg.text;
        statusBarEntry.color = msg.color;
        statusBarEntry.show();
    }
}

export function hideStatusBar(fsPath: string) {
    let idx = statusMessages.findIndex(item => item.fsPath == fsPath);
	if (idx >= 0) {
        statusMessages.splice(idx, 1);
        updateStatusBar();
	}
}

export function showStatusBar(fsPath: string, message: string, status?: STATUS_COLOR) {
    // hideStatusBar();
    // let statusBarEntry: vscode.StatusBarItem;
	// statusBarEntry = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
	// statusBarEntry.text = message;
    // statusBarEntry.command = command;
    // statusBarEntry.color = status;
	// //statusBarEntry.tooltip = tooltip;
    // statusBarEntry.show();
    
    let msg = statusMessages.find(item => item.fsPath == fsPath);
    if (isNullOrUndefined(msg)) {
        msg = { fsPath: fsPath };
        statusMessages.push(msg);
    }
    msg.text = message;
    msg.color = status;
    msg.active = true;
    updateStatusBar();
}

export function initDiagnostic(context: vscode.ExtensionContext) {
	errorDiagnosticCollection = vscode.languages.createDiagnosticCollection('abl-error');
	context.subscriptions.push(errorDiagnosticCollection);
	warningDiagnosticCollection = vscode.languages.createDiagnosticCollection('abl-warning');
	context.subscriptions.push(warningDiagnosticCollection);
}

export function initStatusBar(context: vscode.ExtensionContext) {
    statusBarEntry = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
    context.subscriptions.push(statusBarEntry);
}
