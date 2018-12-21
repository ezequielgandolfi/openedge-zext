using Progress.Json.ObjectModel.*.

def input param nm-dir-par as char no-undo.

def var aJsonTable as JsonArray no-undo.
def var aJsonField as JsonArray no-undo.
def var aJsonIndex as JsonArray no-undo.

def var oTable as JsonObject no-undo.
def var oField as JsonObject no-undo.
def var oIndex as JsonObject no-undo.

def var isPK as logical no-undo.

aJsonTable = new JsonArray().

for each _file:

    oTable = new JsonObject().
    oTable:add("label", _file._file-name).
    oTable:add("kind", 5). /*Variable*/
    oTable:add("detail", _file._Desc).
    aJsonTable:add(oTable).

    aJsonField = new JsonArray().
    oTable:add("fields", aJsonField).

    for each _field
       where _field._file-recid = recid(_file):
        oField = new JsonObject().
        oField:add("label", _field._field-name).
        oField:add("kind", 4). /*Field*/
        oField:add("detail", _field._Desc).
        oField:add("dataType", _field._data-type).
        oField:add("mandatory", _field._mandatory).
        oField:add("format", _field._format).
        aJsonField:add(oField).
    end.

    aJsonIndex = new JsonArray().
    oTable:add("indexes", aJsonIndex).

    for each _index
        where _index._file-recid = recid(_file):

            assign isPK = (recid(_index) = _file._prime-index).

            oIndex = new JsonObject().
            oIndex:add("label", _index._index-name).
            oIndex:add("kind", 14). /*Snippet*/
            oIndex:add("detail", _index._Desc).
            oIndex:add("unique", _index._unique).
            oIndex:add("primary", isPK).

            aJsonField = new JsonArray().
            for each _index-field
                where _index-field._index-recid = recid(_index),
                first _field
                where recid(_field) = _index-field._field-recid:

                    oField = new JsonObject().
                    oField:add("label", _field._field-name).
                    //oField:add("kind", 17). /*Reference*/
                    //oField:add("detail", _field._Desc).
                    aJsonField:add(oField).
            end.
            oIndex:add("fields", aJsonField).
            aJsonIndex:add(oIndex).
    end.

end.

aJsonTable:writefile(nm-dir-par + ".openedge-zext.db." + ldbname("dictdb")).
