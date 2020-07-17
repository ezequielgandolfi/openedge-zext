import * as vscode from 'vscode';
import { AblDatabase } from '@oe-zext/database';
import { Provider } from './provider';
import { hideStatusBar, initDiagnostic, updateStatusBar, initStatusBar } from './notification';
import { ExtensionConfig } from './extensionConfig';
import { ABL_MODE } from './environment';
import { AblExecute } from './abl-execute';
import { AblSource } from './abl-source';

const DBF_PATTERN = '**/.openedge-zext.db.*';
const DBF_DBNAME_REGEX = /\.openedge-zext\.db\.(\w+)$/i;

export function activate(context: vscode.ExtensionContext): void {
    new ExtensionConfig(context);

    initControllers(context);
    
    initOnSaveWatcher(context);
    initOnCloseWatcher(context);
    initOnChangeActiveTextWatcher(context);

    attachExtensions(context);
    initDiagnostic(context);
    initStatusBar(context);
}

function deactivate() {
}

function initControllers(context: vscode.ExtensionContext) {
    context.subscriptions.push(AblDatabase.Controller.attach(DBF_PATTERN, DBF_DBNAME_REGEX));
    context.subscriptions.push(AblSource.Controller.attach(context));
}

function initOnSaveWatcher(context: vscode.ExtensionContext) {

    // TODO -------------------------------------------------------

    vscode.workspace.onDidSaveTextDocument(document => hideStatusBar(document.uri.fsPath));

    let ablConfig = vscode.workspace.getConfiguration(ABL_MODE.language);
    if (ablConfig.get('checkSyntaxOnSave') === 'file') {
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.languageId !== ABL_MODE.language) {
                return;
            }
            AblExecute.CheckSyntax.getInstance().execute(document);
        }, null, context.subscriptions);
    }
}

function initOnCloseWatcher(context: vscode.ExtensionContext) {

    // TODO -------------------------------------------------------

    vscode.workspace.onDidCloseTextDocument(document => hideStatusBar(document.uri.fsPath));
}

function initOnChangeActiveTextWatcher(context: vscode.ExtensionContext) {

    // TODO -------------------------------------------------------

    vscode.window.onDidChangeActiveTextEditor(editor => updateStatusBar());
}

function attachExtensions(context: vscode.ExtensionContext) {
    Provider.AblCommand.attach(context);
    Provider.CodeCompletion.attach(context);
    Provider.Definition.attach(context);
    Provider.Format.attach(context);
    Provider.Hover.attach(context);
    Provider.KeyBinding.attach(context);
    Provider.Symbol.attach(context);

    // TODO -------------------------------------------------------

    // testing
    Provider.Signature.attach(context);

    // in progress
    Provider.Integration.attach(context);

    // backlog
    Provider.Terminal.attach(context);
    
}
