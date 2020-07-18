import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionConfig } from '../extensionConfig';
import { AblSource } from '@oe-zext/source';

export class Format {

    ablKeywordsPattern: string;

    static attach(context: vscode.ExtensionContext) {
        let instance = new Format();
        instance.registerCommands(context);
    }
    
    constructor() {
        this.loadKeywordPattern();
    }

	private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('abl.format.upperCase', this.formatUpperCase.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.format.lowerCase', this.formatLowerCase.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('abl.format.trimRight', this.formatTrimRight.bind(this)));
    }

    private formatUpperCase() {
        this.applyUpperCaseKeywords(vscode.window.activeTextEditor);
    }

    private formatLowerCase() {
        this.applyLowerCaseKeywords(vscode.window.activeTextEditor);
    }

    private formatTrimRight() {
        this.applyTrimRight(vscode.window.activeTextEditor);
    }

    private applyKeywordsFunction(editor: vscode.TextEditor, func: (text:string) => string) {
        let source = new AblSource.Extractor().execute(editor.document);
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

    private applyUpperCaseKeywords(editor: vscode.TextEditor) {
        this.applyKeywordsFunction(editor, (text) => text.toUpperCase());
    }

    private applyLowerCaseKeywords(editor: vscode.TextEditor) {
        this.applyKeywordsFunction(editor, (text) => text.toLowerCase());
    }

    private applyTrimRight(editor: vscode.TextEditor) {
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
