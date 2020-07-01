# OpenEdge-ZExt - Visual Studio Code extension for OpenEdge ABL

OpenEdge ABL Extension for Visual Studio Code

## Features

- Auto-complete (tables, fields, methods)
- Source navigation
- Check syntax
- Compile
- Run
- Deploy
- Source formatting
- Syntax highlighting
- Code snippets

### Auto-complete
> *Supports database table/fields, temp-tables, buffers, methods*
![autocomplete](resources/readme/autocomplete.gif)

### Source navigation
> *Navigate throught includes, declarations*
![navigation](resources/readme/navigation.gif)

### Check syntax, Compile, Deploy, Run
- Check syntax `Shift+F2`
- Compile (and deploy) `Alt+F1`
- Compile (and deploy) with options `Alt+F3`
- Deploy without compile `Alt+F2`
- Compile and run `F2`
> *Deployment options are located in configuration file*

### Source formatting
- Available commands:
    - `ABL: Format - Keywords - Upper Case`
    - `ABL: Format - Keywords - Lower Case`
    - `ABL: Format - Trim Right`


## What's new

### 0.6.0
- New commands for source formatting
    - ABL: Format - Keywords - Upper Case
    - ABL: Format - Keywords - Lower Case
    - ABL: Format - Trim Right

### 0.5.3
- Fix: Status Bar Errors

### 0.5.2
- Fix: Command Palette Visibility
- Fix: Status Bar Visibility
- Fix: Read Dictionaty Structure

### 0.5.1
- Fix: Deployment for .CLS files
- Fix: Command Read Dictionary Struture activation
- Fix: Running programs outside workspace
- Fix: Buffer snippets adjustment
- Fix: Compilation status bar
- Fix: Source parser adjustments

### 0.5.0
- Snippet fields from database for temp-table "like" db table
- Mapping for "buffer" type
    - Autocomplete fields
    - Hover feature
    - Go to definition

### 0.4.0
- New Symbol provider for breadcrumbs
- Improved definition and hover providers

### 0.3.4
- Adjustment in "Read dictionary structure" for multi-database

### 0.3.0
- Shortcut do method start line (Ctrl+Up)
- Grammar file adjustment for class type method parameters
- Source navigation to temp-table definition when received as method parameter

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
    ]
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

> Grammar file based on Christophe Camicas' (https://github.com/chriscamicas/abl-tmlanguage.git)
