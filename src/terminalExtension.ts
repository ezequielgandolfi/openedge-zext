import * as vscode from 'vscode';

export class TerminalExtension {

    static attach(context: vscode.ExtensionContext) {
        let instance = new TerminalExtension();
        instance.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand('abl.terminal.open', () => { this.terminalOpen() }));
    }

    private terminalOpen() {
        OpenEdgeTerminal.createTeminal();
    }

}


class OpenEdgeTerminal {

    private terminal: vscode.Pseudoterminal;
    private writeEmitter = new vscode.EventEmitter<string>();
    private lineCommand: string = '';

    private readonly COLOR_WHITE = 0;
    private readonly COLOR_BLACK = 30;
    private readonly COLOR_RED = 31;
    private readonly COLOR_GREEN = 32;
    private readonly COLOR_YELLOW = 33;
    private readonly COLOR_BLUE = 34;
    private readonly COLOR_MAGENTA = 35;
    private readonly COLOR_CYAN = 36;

    private readonly CMD_HELP = 'help';
    private readonly CMD_COMPILE = 'compile';
    private readonly CMD_DEPLOY = 'deploy';
    private readonly CMD_TEST = 'test';

    // private readonly COLOR_BG_RED = 41;

    static createTeminal() {
        let instance = new OpenEdgeTerminal();
        instance.lineCommand = '';
		instance.terminal = {
		  onDidWrite: instance.writeEmitter.event,
		  open: () => instance.insertTerminalHeader(),
          close: () => { instance.terminal = null },
          handleInput: instance.handleInputData.bind(instance)
        };
        vscode.window.createTerminal({ name: 'OpenEdge Terminal', pty: instance.terminal }).show();
    }

    private handleInputData(data: string) {
        if (data === '\r') {
            if (this.lineCommand.length > 0) {
                this.insertNewLine();
                this.processCommandLine(this.lineCommand);
            }
            this.insertNewCommandInput();
            this.lineCommand = '';
        }
        else if (data == String.fromCharCode(127)) {
            if (this.lineCommand.length > 0) {
                this.lineCommand = this.lineCommand.substring(0, this.lineCommand.length-1);
                this.writeEmitter.fire('\b \b');
            }
        }
        else {
            if (/^[\w\d\s\t\?\!\<\>\.\-\+\,\*\@\/\\]{1}$/i.test(data)) {
                this.writeEmitter.fire(data);
                this.lineCommand += data;
            }
        }
    }

    private processCommandLine(line: string) {
        let args = line.split(' ');
        let cmd = args.shift().toLowerCase();
        switch(cmd) {
            case this.CMD_HELP:
                this.processHelp();
                break;
            // case this.CMD_DEPLOY:
            //     this.processDeploy(args);
            //     break;
            // case this.CMD_TEST:
            //     this.processTest();
            //     break;
            default:
                this.writeColor(this.COLOR_RED);
                this.writeEmitter.fire(`Unknown command: ${cmd}. Type 'help' to available commands`);
        }
    }

    private processHelp() {
        this.writeColor(this.COLOR_CYAN);
        this.writeEmitter.fire('Commands:');
        this.insertNewLine();
        //
        //
        // this.writeEmitter.fire('\ttest - Test message');
        // this.insertNewLine();
        // this.writeEmitter.fire('\tcompile - Compile and deploy the .R');
        // this.insertNewLine();
        // this.writeEmitter.fire('\tdeploy - Deploy the source file');
        // this.insertNewLine();
    }

    // private processDeploy(args: string[]) {
    //     if (args.length > 0) {
    //         let filename = args[0];
    //         this.writeColor(this.COLOR_CYAN);
    //         this.writeEmitter.fire(`Deploy ${filename}... #SQN`);
    //     }
    //     else {
    //         this.writeColor(this.COLOR_MAGENTA);
    //         this.writeEmitter.fire('Missing argument. Usage:');
    //         this.insertNewLine();
    //         this.writeEmitter.fire(`\t${this.CMD_DEPLOY} path/filename.ext`);
    //     }
    // }

    // private processTest() {
    //     this.writeColor(this.COLOR_CYAN);
    //     this.writeEmitter.fire('Sending test message command...');
    //     this.insertNewLine();
    //     //
    //     vscode.commands.executeCommand('abl.alert', 'Test message');
    //     //
    //     this.writeEmitter.fire('Done!');
    //     this.insertNewLine();
    // }

    private insertTerminalHeader() {
        this.writeColor(this.COLOR_GREEN);
        this.writeEmitter.fire('OpenEdge Terminal');
        this.insertNewCommandInput();
    }

    private insertNewLine() {
        this.writeEmitter.fire('\r\n');
    }

    private insertNewCommandInput() {
        this.insertNewLine();
        this.writeColor(this.COLOR_WHITE);
        this.writeEmitter.fire('> ');
    }

    private write(text) {
        this.writeEmitter.fire(text);
    }

    private writeLine(text) {
        this.write(text);
        this.insertNewLine();
    }
    
    private writeColor(value) {
        this.writeEmitter.fire(`\x1b[${value}m`);
    }

}
