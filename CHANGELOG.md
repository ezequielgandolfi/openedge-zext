# Change Log

## 1.0.1

### Fixes
- Fix: `ABL: Read Dictionary Structure` command working path

## 1.0.0
- Brand new source code (seriously... almost everything...)
- Better code completion details
- Includes file sugestion on typing `{`
- Method signature provider

## 0.6.0

### Breaking Changes
- Removed Formatting provider support. Replaced by individual commands
- Removed output channel. Will be used only on verbose mode (in progress)

### Features
- New commands for source formatting
    - abl.format.lowerCase: `ABL: Format - Keywords - Lower Case` change keywords to lower case
    - abl.format.lowerCase: `ABL: Format - Keywords - Upper Case` change keywords to upper case ([Issue #28](https://github.com/ezequielgandolfi/openedge-zext/issues/28))
    - abl.format.trimRight: `ABL: Format - Trim Right` trim right each line of code

## 0.5.3

### Fixes
- Fix: Status Bar Errors

## 0.5.2

### Fixes
- [Issue #25](https://github.com/ezequielgandolfi/openedge-zext/issues/25) Command Palette Visibility
- [Issue #26](https://github.com/ezequielgandolfi/openedge-zext/issues/26) Status Bar Visibility
- [Issue #27](https://github.com/ezequielgandolfi/openedge-zext/issues/27) Read Dictionaty Structure

## 0.5.1

### Fixes
- [Issue #14](https://github.com/ezequielgandolfi/openedge-zext/issues/14) Deployment for .CLS files
- [Issue #15](https://github.com/ezequielgandolfi/openedge-zext/issues/15) Command Read Dictionary Struture activation
- [Issue #20](https://github.com/ezequielgandolfi/openedge-zext/issues/20) Running programs outside workspace
- [Issue #21](https://github.com/ezequielgandolfi/openedge-zext/issues/21) Buffer snippets adjustment
- [Issue #23](https://github.com/ezequielgandolfi/openedge-zext/issues/23) Compilation status bar
- [Issue #24](https://github.com/ezequielgandolfi/openedge-zext/issues/24) Source parser adjustments

## 0.5.0

### Features
- [Issue #16](https://github.com/ezequielgandolfi/openedge-zext/issues/16) Snippet fields from database for temp-table "like" db table
- [Issue #18](https://github.com/ezequielgandolfi/openedge-zext/issues/18) Mapping for "buffer" type
    - Autocomplete fields
    - Hover feature
    - Go to definition

## 0.4.0

### Features
- New Symbol provider for breadcrumbs
- Improved definition and hover providers
- New parameters for compile command (integration with other extensios)

## 0.3.4

### Fixes
- Adjustment in "Read dictionary structure" for multi-database

## 0.3.1 / 0.3.2 / 0.3.3

### Fixes
- Internal changes only

## 0.3.0

### Fixes
- [Issue #12](https://github.com/ezequielgandolfi/openedge-zext/issues/12) Grammar file adjustment for class type method parameters

### Features
- [Issue #13](https://github.com/ezequielgandolfi/openedge-zext/issues/13) Shortcut do method start line (Ctrl+Up)
- [Issue #11](https://github.com/ezequielgandolfi/openedge-zext/issues/11) Source navigation to temp-table definition when received as method parameter

## 0.2.2

### Fixes
- Grammar file adjustment

### Features
- New commands for integration support
    - abl.currentFile.getMap: get json map for current file
    - abl.tables: get table list (DB structure)
    - abl.table(tableName): get table detail (fields, indexes, etc)

## 0.2.1

### Fixes
- [Issue #4](https://github.com/ezequielgandolfi/openedge-zext/issues/4) Update auto-complete after command "Read database structure" without restart VSCode
- Database structure files adjustment to work with multi-root workspace

## 0.2.0

### Features
- [Issue #5](https://github.com/ezequielgandolfi/openedge-zext/issues/5) Multi-root workspace

## 0.1.3

### Fixes
- [Issue #1](https://github.com/ezequielgandolfi/openedge-zext/issues/1) Source navigation to definition working with local variables/parameters
- [Issue #2](https://github.com/ezequielgandolfi/openedge-zext/issues/2) Correction in database table/field auto-complete

## 0.1.2

### Features
- Auto-complete fields from referenced temp-table
- Broadcast changes to referenced documents
- Request file name to save map file

## 0.1.1

### Features
- Map file exports all data from includes

### Fixes
- Fixed the include temp-table auto-complete

## 0.1.0

### Features
- New command "ABL: Save Map File" to write a json map file
- Included a few controls to prevent crashing

## 0.0.22

### Features
- New source parser
- Auto-complete for internal methods with parameters snippet

## 0.0.21

### Features
- Hover tooltip new behavior
- XCode compile option

## 0.0.20

### Fixes
- Auto-complete was crashing in some situations

### Features
- New command to compile with some flags (Alt+F3)

## 0.0.19

### Fixes
- Fixed table name from "ALL FIELDS" snippet

### Features
- Update README e CHANGELOG
- More code snippets
- Ask to save dirty files before run commands

## 0.0.18

### Fixes
- "Run" command now forces current window to show (or create a new window)
- Fixed the looping problem when trying to run with compile error
- Fixed key bindings to activate only for ABL files

### Features
- "ALL FIELDS" snippet for tables / temp-tables
- Formatter (supports: trim right). Enable options in settings file

## 0.0.17

### Fixes
- Deployment commands didn't create directories
- Command "Run" was running in batch mode
