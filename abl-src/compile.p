DEFINE VARIABLE ch_prog AS CHARACTER NO-UNDO.
DEFINE VARIABLE ch_mess AS CHARACTER NO-UNDO.
DEFINE VARIABLE i       AS INTEGER   NO-UNDO.
DEFINE VARIABLE vsabl_deployPath AS CHARACTER NO-UNDO.

/* Extracts the parameters */
ASSIGN ch_prog = ENTRY( 1, SESSION:PARAMETER ).
       vsabl_deployPath = replace(ENTRY( 2, SESSION:PARAMETER ), "~\", "/").

RUN VALUE( REPLACE( PROGRAM-NAME( 1 ), "compile.p", "pre-launch.p") ).

def var nm-dir-aux as char no-undo.
assign nm-dir-aux = replace(OS-GETENV("VSABL_WORKSPACE"), "~\", "/").
if r-index(nm-dir-aux, "/") < length(nm-dir-aux)
then assign nm-dir-aux = nm-dir-aux + "/".

if vsabl_deployPath <> ""
then run compileFile(input vsabl_deployPath).
else run compileFile("").

PUT UNFORMATTED "SUCCESS: Program compiled" SKIP.

/* End of program */
RUN VALUE( REPLACE( PROGRAM-NAME( 1 ), "compile.p", "post-launch.p") ).

QUIT.

procedure compileFile:
  def input param vsabl_deployItem as char no-undo.

  if vsabl_deployItem <> ""
  then do:
    if r-index(vsabl_deployItem, "/") < length(vsabl_deployItem)
    then assign vsabl_deployItem = vsabl_deployItem + "/".

    //assign vsabl_deployItem = vsabl_deployItem + replace(substring(ch_prog, length(nm-dir-aux) + 1), "~\", "/").
  end.

  /* Compile without saving */
  if vsabl_deployItem <> ""
  then do:
    run mkDir(vsabl_deployItem).
    COMPILE VALUE( ch_prog ) SAVE INTO value(vsabl_deployItem) NO-ERROR.
  end.
  else COMPILE VALUE( ch_prog ) NO-ERROR.

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
