# OpenEdge-ZExt - Visual Studio Code extension for OpenEdge ABL

OpenEdge ABL Extension for Visual Studio Code

## Features

- Auto-complete (tables, fields, methods)
- Source navigation
- Check syntax
- Compile
- Run
- Deploy
- Syntax highlighting
- Code snippets

## What's new

### 0.3.1 / 0.3.2
- Internal changes only

### 0.3.0
- Shortcut do method start line (Ctrl+Up)
- Grammar file adjustment for class type method parameters
- Source navigation to temp-table definition when received as method parameter

### 0.2.2
- Grammar file adjustment
- New commands for integration support

### 0.2.1
- Update auto-complete options after command "Read database structure" without restart VSCode
- Database structure files adjustment to work with multi-root workspace

### 0.2.0
- Multi-root workspace

See [CHANGELOG](CHANGELOG.md) for more information.

## Requirements

- OpenEdge Progress 11

## Usage
- Extension is activated for extensions: .i .p .w .cls

### Starting
- Create a configuration file (see Extension Settings below)
- Execute command "ABL: Read Dictionary Structure" for auto-complete feature
- Enjoy...

### Commands

#### ABL: Read Dictionary Structure
> Create a database auto-complete file

#### ABL: Check Syntax (Shift+F2)
> Check syntax for current file and highlights errors

#### ABL: Compile & Deploy (Alt+F1)
> Compile the current file and deploy the RCode when configured

#### ABL: Deploy Source (Alt+F2)
> Deploy the current file when configured (without compile)

#### ABL: Compile with Options (Alt+F3)
> Compile the current file with additional options (Preprocess, X-Ref, etc)

### Other features

#### Format source code

- Trim: *remove whitespaces from the end of the lines*

## Extension Settings

Create a file named ".openedge-zext.json" in root path of the workspace.
> Download base configuration file [here](resources/examples/.openedge-zext.json).

```JSON
{
    "workingDirectory": "${workspaceFolder}\\Temp",
    "proPath": [
        "c:\\src",
        "${workspaceFolder}"
    ],
    "proPathMode": "overwrite", // append, prepend
    "dlcPath": "c:\\dlc116",
    "parameterFiles": [
        "default.pf"
    ],
    "dbDictionary": [
        "myDatabaseForAutoComplete"
    ],
    "deployment": [
        {
            "taskType": "current.r-code", // current.source
            "path": "c:\\out",
            "postAction": [
                {
                    "actionType": "URL",
                    "command": "http://localhost:8080/postAction"
                }
            ]
        }
    ],
    "format": {
        "trim": "right" // none
    }
}
```

- `dlcPath` is optional, and overwrite DLC enviorenment variable
- `dbDictionary` are the logical names of database files for the auto-complete option (command: ABL Read Dictionary Structure)
- `deployment` are actions from compile/deploy commands (Alt+F1, Alt+F2 and Alt+F3)
- `format` are formatter options
- Default values:
    - `proPath`: workspaceRoot
    - `workingDirectory`: folder of active source file

## Known Issues & Enhancements

Visit [Issues page on GitHub](https://github.com/ezequielgandolfi/openedge-zext/issues) to report any problem or submit an enhancement.

## Greetings
Inspired by ZaphyrVonGenevese (https://github.com/ZaphyrVonGenevese/vscode-abl) and ChrisCamicas (https://github.com/chriscamicas/vscode-abl) work.

## License
Licensed under the [Apache-2.0](LICENSE) License.

> Grammar file from Christophe Camicas (https://github.com/chriscamicas/abl-tmlanguage.git)