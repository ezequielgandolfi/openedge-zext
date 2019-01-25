import { ABL_MODE } from './environment';
import * as vscode from 'vscode';

export let outputChannel = vscode.window.createOutputChannel('OpenEdge');
let statusBarEntry: vscode.StatusBarItem;

export let errorDiagnosticCollection: vscode.DiagnosticCollection;
export let warningDiagnosticCollection: vscode.DiagnosticCollection;

export enum STATUS_COLOR {
    INFO = 'yellow',
    SUCCESS = 'lime',
    ERROR = 'violet'
}

/*export function showHideStatus() {
	if (!statusBarEntry) {
		return;
	}
	if (!vscode.window.activeTextEditor) {
		statusBarEntry.hide();
		return;
	}
	if (vscode.languages.match(ABL_MODE, vscode.window.activeTextEditor.document)) {
		statusBarEntry.show();
		return;
	}
	statusBarEntry.hide();
}*/

export function hideStatusBar() {
	if (statusBarEntry) {
		statusBarEntry.dispose();
	}
}

export function showStatusBar(message: string, status?: STATUS_COLOR, command?: string) {
    hideStatusBar();
	statusBarEntry = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
	statusBarEntry.text = message;
    statusBarEntry.command = command;
    statusBarEntry.color = status;
	//statusBarEntry.tooltip = tooltip;
	statusBarEntry.show();
}

export function initDiagnostic(context: vscode.ExtensionContext) {
	errorDiagnosticCollection = vscode.languages.createDiagnosticCollection('abl-error');
	context.subscriptions.push(errorDiagnosticCollection);
	warningDiagnosticCollection = vscode.languages.createDiagnosticCollection('abl-warning');
	context.subscriptions.push(warningDiagnosticCollection);
}
