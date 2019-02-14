DEFINE VARIABLE ch_prog AS CHARACTER NO-UNDO.
DEFINE VARIABLE ch_mess AS CHARACTER NO-UNDO.
DEFINE VARIABLE i       AS INTEGER   NO-UNDO.
DEFINE VARIABLE vsabl_deployPath AS CHARACTER NO-UNDO.
DEFINE VARIABLE vsabl_compileOptions AS CHARACTER NO-UNDO.
DEFINE VARIABLE lg_deployRCode AS LOG NO-UNDO.

/* Extracts the parameters */
ASSIGN ch_prog              = replace(ENTRY(1, SESSION:PARAMETER), "~\", "/")
       vsabl_deployPath     = replace(ENTRY(2, SESSION:PARAMETER), "~\", "/")
       vsabl_compileOptions = replace(entry(3, session:PARAMETER), "|", ",").

RUN VALUE( REPLACE( PROGRAM-NAME( 1 ), "compile.p", "pre-launch.p") ).

def var nm-dir-aux as char no-undo.
assign nm-dir-aux = replace(OS-GETENV("VSABL_WORKSPACE"), "~\", "/").
if r-index(nm-dir-aux, "/") < length(nm-dir-aux)
then assign nm-dir-aux = nm-dir-aux + "/".

if vsabl_deployPath = ""
then assign vsabl_deployPath = nm-dir-aux
            lg_deployRCode   = false.
else assign lg_deployRCode = true.

if r-index(vsabl_deployPath, "/") < length(vsabl_deployPath)
then assign vsabl_deployPath = vsabl_deployPath + "/".

run compileFile(input vsabl_deployPath, input vsabl_compileOptions, input lg_deployRCode).

PUT UNFORMATTED "SUCCESS: Program compiled" SKIP.

/* End of program */
RUN VALUE( REPLACE( PROGRAM-NAME( 1 ), "compile.p", "post-launch.p") ).

QUIT.

procedure compileFile:
  def input param vsabl_deployItem as char no-undo.
  def input param vsabl_options    as char no-undo.
  def input param lg_deploy_par    as log  no-undo.

  def var baseName as char no-undo.
  assign baseName = substring(ch_prog, r-index(ch_prog, "/") + 1).

  /* Compile and save RCode */
  if lg_deploy_par
  or vsabl_options <> ""
  then run mkDir(vsabl_deployItem).

  if  lg_deploy_par
  AND lookup("COMPILE", vsabl_options) > 0
  then COMPILE VALUE( ch_prog ) SAVE INTO value(vsabl_deployItem) NO-ERROR.

  /* Additional options */
  if  LOOKUP("LISTING", vsabl_options) > 0
  and COMPILER:NUM-MESSAGES = 0
  then COMPILE VALUE( ch_prog ) LISTING value(vsabl_deployItem + baseName + ".listing") NO-ERROR.

  if  LOOKUP("XREF", vsabl_options) > 0
  and COMPILER:NUM-MESSAGES = 0
  then COMPILE VALUE( ch_prog ) XREF value(vsabl_deployItem + baseName + ".xref") NO-ERROR.

  if  LOOKUP("XREF-XML", vsabl_options) > 0
  and COMPILER:NUM-MESSAGES = 0
  then COMPILE VALUE( ch_prog ) XREF value(vsabl_deployItem + baseName + ".xref-xml") NO-ERROR.

  if  LOOKUP("STRING-XREF", vsabl_options) > 0
  and COMPILER:NUM-MESSAGES = 0
  then COMPILE VALUE( ch_prog ) STRING-XREF value(vsabl_deployItem + baseName + ".string-xref") NO-ERROR.

  if  LOOKUP("DEBUG-LIST", vsabl_options) > 0
  and COMPILER:NUM-MESSAGES = 0
  then COMPILE VALUE( ch_prog ) DEBUG-LIST value(vsabl_deployItem + baseName + ".debug-list") NO-ERROR.

  if  LOOKUP("PREPROCESS", vsabl_options) > 0
  and COMPILER:NUM-MESSAGES = 0
  then COMPILE VALUE( ch_prog ) PREPROCESS value(vsabl_deployItem + baseName + ".preprocess") NO-ERROR.

  /*if  LOOKUP("XCODE", vsabl_options) > 0
  and COMPILER:NUM-MESSAGES = 0
  then COMPILE VALUE( ch_prog ) XREF value(vsabl_deployItem + baseName + ".xref") NO-ERROR.*/

  /* If there are compilation messages */
  IF COMPILER:NUM-MESSAGES > 0 THEN DO:

    ASSIGN ch_mess = "".

    /* For each messages */
    DO i = 1 TO COMPILER:NUM-MESSAGES:

      /* Generate an error line */
      ASSIGN ch_mess =
        SUBSTITUTE( "&1 File:'&2' Row:&3 Col:&4 Error:&5 Message:&6",
          IF COMPILER:WARNING = TRUE THEN "WARNING" ELSE "ERROR",
          COMPILER:GET-FILE-NAME  ( i ),
          COMPILER:GET-ROW        ( i ),
          COMPILER:GET-COLUMN     ( i ),
          COMPILER:GET-NUMBER     ( i ),
          COMPILER:GET-MESSAGE    ( i )
        )
      .

      /* display the message to the standard output */
      PUT UNFORMATTED ch_mess SKIP.
    END.
    QUIT.
  END.
end procedure.

procedure mkDir:
    define input param nmDiretorio as character no-undo.
    
    define variable nmDiretorioAnterior as character no-undo.
    define variable nmDiretorioSemBarra as character no-undo.
    
    assign nmDiretorio = replace(nmDiretorio, "~\", "~/")
           nmDiretorioSemBarra = substring(nmDiretorio, 1, length(nmDiretorio) - 1)
           file-info:file-name = nmDiretorioSemBarra.
           
    if index(nmDiretorioSemBarra, "~/") = 0
    then leave.
           
    if file-info:full-pathname = ?
    then do:
        assign nmDiretorioAnterior = substring(nmDiretorio, 1, r-index(nmDiretorioSemBarra, "~/")).
        
        run mkDir(input nmDiretorioAnterior).
        
        os-create-dir value(nmDiretorio).
    end.
    
end procedure.
