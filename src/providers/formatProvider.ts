import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionConfig } from '../extensionConfig';
import { SourceParser } from '../sourceParser';

export class FormatProvider {

    ablKeywordsPattern: string;

    constructor(context: vscode.ExtensionContext) {
        this.initialize(context);
    }

    private initialize(context: vscode.ExtensionContext) {
        this.loadKeywordPattern();

        context.subscriptions.push(vscode.commands.registerCommand('abl.format.upperCase', () => {
            this.formatUpperCase(vscode.window.activeTextEditor);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('abl.format.lowerCase', () => {
            this.formatLowerCase(vscode.window.activeTextEditor);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('abl.format.trimRight', () => {
            this.formatTrimRight(vscode.window.activeTextEditor);
        }));
    }
    
    private formatKeywords(editor: vscode.TextEditor, func: (text:string) => string) {
        let source = new SourceParser().getSourceCode(editor.document);
        let reg = RegExp(this.ablKeywordsPattern, 'gim');

        editor.edit(builder =>  {
            let match = reg.exec(source.sourceWithoutStrings);
            while (match) {
                let range = new vscode.Range(source.document.positionAt(match.index), source.document.positionAt(reg.lastIndex));
                builder.replace(range, func(match[1]));
                match = reg.exec(source.sourceWithoutStrings);	
            }
        });
    }

    private formatUpperCase(editor: vscode.TextEditor) {
        this.formatKeywords(editor, (text) => text.toUpperCase());
    }

    private formatLowerCase(editor: vscode.TextEditor) {
        this.formatKeywords(editor, (text) => text.toLowerCase());
    }

    private formatTrimRight(editor: vscode.TextEditor) {
        let txt = editor.document.getText();
        editor.edit(builder => {
            let range = new vscode.Range(new vscode.Position(0,0), editor.document.positionAt(txt.length));
            txt = txt.split('\n').map(line => line.trimRight()).join('\n');
            builder.replace(range, txt);
        });
    }

    private loadKeywordPattern() {
        let grammarFile = path.join(ExtensionConfig.getInstance().getExtensionPath(), 'grammar/abl.tmLanguage.json');
        fs.readFile(grammarFile, (err,data) => {
            try {
                let jsonData = JSON.parse(data.toString());
                this.ablKeywordsPattern = jsonData?.repository?.keywords?.match || '';
                //
                this.ablKeywordsPattern = this.ablKeywordsPattern.replace('(?i)', '');
            }
            catch {
                this.ablKeywordsPattern = null;
            }
        });
    }
    
}
