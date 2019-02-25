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

### 0.1.3
- Source navigation to definition working with local variables/parameters

### 0.1.2
- Auto-complete fields from referenced temp-table
- Broadcast changes to referenced documents
- Request file name to save map file

### 0.1.1
- Fixed the include temp-table auto-complete
- Map file exports all data from includes

### 0.1.0
- New command "ABL: Save Map File" to write a json map file
- Included a few controls to prevent crashing

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

## Known Issues

Visit [Issues page on GitHub](https://github.com/ezequielgandolfi/openedge-zext/issues) to report any problem.

- Variables within trigger events are being referenced as global variables
- Source mapper doesn't map buffer, table-handle, dataset, dataset-handle, worktable, work-file types
- Source mapper doesn't map return parameters
- Source mapper is incompatible with extent variables/parameters/fields
- Source mapper is incompatible with "define variable" statement with additional information (format, serialize-name, label, etc)

## Roadmap

_No promises..._ :-)

- Configuration for "source directory" to work with multiple folders in workspace
- Temp-table definitions
    - Insert "like" condition to temp-tables (insert all fields from original temp-table)
- Key bind to open help file
- Change case (lower, upper, camel)
- More snippets
- Map classes
    - using
    - auto-complete
    - read definitions / methods
- Generate swagger file to current source
- Generate test case to current source (or method)
    - Creates a new source file with methods to create test data and run it
- CRUD generator

## Greetings
Inspired by ZaphyrVonGenevese (https://github.com/ZaphyrVonGenevese/vscode-abl) and ChrisCamicas (https://github.com/chriscamicas/vscode-abl) work.

## License
Licensed under the [Apache-2.0](LICENSE) License.

> Grammar file from Christophe Camicas (https://github.com/chriscamicas/abl-tmlanguage.git)