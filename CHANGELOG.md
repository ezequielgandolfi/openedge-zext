# Change Log

## 0.1.3

### Fixes
- [Issue #1](https://github.com/ezequielgandolfi/openedge-zext/issues/1) Source navigation to definition working with local variables/parameters

## 0.1.2

### Improvements
- Auto-complete fields from referenced temp-table
- Broadcast changes to referenced documents
- Request file name to save map file

## 0.1.1

### Improvements
- Map file exports all data from includes

### Fixes
- Fixed the include temp-table auto-complete

## 0.1.0

### Improvements
- New command "ABL: Save Map File" to write a json map file
- Included a few controls to prevent crashing

## 0.0.22

### Improvements
- New source parser
- Auto-complete for internal methods with parameters snippet

## 0.0.21

### Improvements
- Hover tooltip new behavior
- XCode compile option

## 0.0.20

### Fixes
- Auto-complete was crashing in some situations

### Improvements
- New command to compile with some flags (Alt+F3)

## 0.0.19

### Fixes
- Fixed table name from "ALL FIELDS" snippet

### Improvements
- Update README e CHANGELOG
- More code snippets
- Ask to save dirty files before run commands

## 0.0.18

### Fixes
- "Run" command now forces current window to show (or create a new window)
- Fixed the looping problem when trying to run with compile error
- Fixed key bindings to activate only for ABL files

### Improvements
- "ALL FIELDS" snippet for tables / temp-tables
- Formatter (supports: trim right). Enable options in settings file

## 0.0.17

### Fixes
- Deployment commands didn't create directories
- Command "Run" was running in batch mode
