# OpenEdge-ZExt README

OpenEdge ABL Extension for Visual Studio Code

> Grammar file from Christophe Camicas (https://github.com/chriscamicas/abl-tmlanguage.git)

## Features

- Check syntax
- Compile
- Run
- Deploy
- Syntax highlighting
- Code snippets
- Auto-complete
- Source navigation

## Requirements

- OpenEdge Progress 11

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
    ]
}
```

- `dlcPath` is optional, and overwrite DLC enviorenment variable
- `dbDictionary` are the logical names of database files for the auto-complete option (command: ABL Read Dictionary Structure)
- `deployment` are actions from commands Alt+F1 (current.r-code) and Alt+F2 (current.source)
- Default values:
    - `proPath`: workspaceRoot
    - `workingDirectory`: folder of active source file

## Known Issues

- Variables inside trigger events (today is considering as global variables)
- Key Mappings are activating for any language (should be ABL only)
- Source mapping ignores strings / comments blocks
    - Can suggest something wrong
    - Sometimes it crashes... it happens...

## Release Notes

### 0.0.17

#### Fixes

- Deployment commands didn't create directories
- Command "Run" was running in batch mode

## Roadmap

### 1.0.0

- Get definitions inside includes
    - Partially working...
    - Bug: check for case insensitive file names...
- List all fields from table / temp-table
- Temp-table definitions
    - Insert "like" condition to temp-tables (insert all fields from original temp-table)
- Map comment blocks to eliminate from processing
    - Change regex expressions to avoid comments
- Snippets
    - Insert all fields from table / temp-table
- Key bind F2 to open help file
    - C:\DLC116\prohelp\lgrfeng.chm
- Compile options
    - debug-list / x-ref / listing / xcode
- Remove right whitespaces / tabs on save
- Save before run commands (check syntax, compile, run)

### Sometime...

- Map classes
    - using
    - auto-complete
    - read definitions / methods

### Maybe...

- Generate swagger file to current source
- Generate test case to current source (or method)
    - Creates a new source file with methods to create test data and run it
- CRUD generator

## Greetings
Inspired by ZaphyrVonGenevese (https://github.com/ZaphyrVonGenevese/vscode-abl) and ChrisCamicas (https://github.com/chriscamicas/vscode-abl) work.

## License
Licensed under the [Apache-2.0](LICENSE) License.