# OpenEdge-ZExt - Visual Studio Code extension for OpenEdge ABL

OpenEdge ABL Extension for Visual Studio Code

## Features

- Check syntax
- Compile
- Run
- Deploy
- Syntax highlighting
- Code snippets
- Auto-complete
- Source navigation

## What's new

### 0.0.22
- New source parser
- Auto-complete for internal methods with parameters snippet

### 0.0.21
- Hover tooltip new behavior
- XCode compile option

### 0.0.20
- New command to compile with additional options (Alt+F3)

### 0.0.19
- More code snippets
- Ask to save dirty files before run commands

### 0.0.18
- "ALL FIELDS" snippet for tables / temp-tables
- Formatter (supports: trim right). Enable options in settings file

See [CHANGELOG](CHANGELOG) for more information.

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

- Variables within trigger events are being referenced as global variables
- Source mapper doesn't map buffer, table-handle, dataset, dataset-handle, worktable, work-file types
- Source mapper doesn't map return parameters
- Source mapper is incompatible with extent variables/parameters/fields
- Source mapper is incompatible with "define variable" statement with additional information (format, serialize-name, label, etc)

## Roadmap

_No promises..._ :-)

### 1.0.0

- Configuration for "source directory" to work with multiple folders in workspace
- Temp-table definitions
    - Insert "like" condition to temp-tables (insert all fields from original temp-table)
- Key bind to open help file
- Change case (lower, upper, camel)
- More snippets

### 1.1.0

- Map classes
    - using
    - auto-complete
    - read definitions / methods

### 1.2.0

- Generate swagger file to current source
- Generate test case to current source (or method)
    - Creates a new source file with methods to create test data and run it
- CRUD generator

## Greetings
Inspired by ZaphyrVonGenevese (https://github.com/ZaphyrVonGenevese/vscode-abl) and ChrisCamicas (https://github.com/chriscamicas/vscode-abl) work.

## License
Licensed under the [Apache-2.0](LICENSE) License.

> Grammar file from Christophe Camicas (https://github.com/chriscamicas/abl-tmlanguage.git)