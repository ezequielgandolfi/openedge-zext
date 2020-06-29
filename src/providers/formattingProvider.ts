import * as vscode from 'vscode';
import { workspace, WorkspaceConfiguration, FormattingOptions, DocumentFormattingEditProvider, TextDocument, CancellationToken, TextEdit, Range, Position, OnTypeFormattingEditProvider } from 'vscode';
import { ABL_MODE } from '../environment';
import { ExtensionConfig } from '../extensionConfig';

export class ABLFormattingProvider implements DocumentFormattingEditProvider, OnTypeFormattingEditProvider {

    constructor(context: vscode.ExtensionContext) {
		this.initialize(context);
	}

	private initialize(context: vscode.ExtensionContext) {
		context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(ABL_MODE.language, this));
    }
    
	public provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): Thenable<TextEdit[]> {
		if (document.languageId !== ABL_MODE.language) { return; }
		return format(document, null, options);
	}

	public provideOnTypeFormattingEdits(document: TextDocument, position: Position, ch: string, options: FormattingOptions, token: CancellationToken): Thenable<TextEdit[]> {
		//if (!onType) { return; }
		if (document.languageId !== ABL_MODE.language) { return; }
		return format(document, null, options);
    }
}

function format(document: TextDocument, range: Range, options: FormattingOptions): Thenable<TextEdit[]> {
	return new Promise(resolve => {
		// Create an empty list of changes
		let result: TextEdit[] = [];
		// Create a full document range
		if (range === null) {
			var start = new Position(0, 0);
			var end = new Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
			range = new Range(start, end);
		}
		// Format the document with the user specified settings
        //var newText: string = PatternFormat.document(document.getText(), options, document.languageId);
        var newText: string = SpacingFormat.document(document.getText(), options, document.languageId);
		// Push the edit into the result array
		result.push(new TextEdit(range, newText));
		// Return the result of the change
		return resolve(result);
	});
}

class SpacingFormat {
    public static document(source: string, formattingOptions: FormattingOptions, languageId: string): string {
        let oeConfig = ExtensionConfig.getInstance().getConfig();

        // trim right
        if (oeConfig.format && oeConfig.format.trim == 'right') {
            let lines = source.split('\n');
            for (let i = 0; i < lines.length; i++) {
                lines[i] = lines[i].trimRight();
            }
            source = lines.join('\n');
        }

        return source;
    }
}

enum CommentType { SingleLine, MultiLine }

class Spaces {
    public before: number = 0;
    public after: number = 0;

    public constructor(before: number = 0, after: number = 0) {
        this.before = before;
        this.after = after;
    }
}
