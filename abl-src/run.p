def var ch_prog as char no-undo.
def var wh_new as widget-handle no-undo.

/* Extracts the parameters */
ASSIGN ch_prog = ENTRY( 1, SESSION:PARAMETER ).

RUN VALUE( REPLACE( PROGRAM-NAME( 1 ), "run.p", "pre-launch.p") ).

/* create new window (if necessary) */
if current-window = ?
then do:
    CREATE WINDOW wh_new
        ASSIGN
            HIDDEN             = YES
            TITLE              = 'OpenEdge ZExt':U
            COLUMN             = 11
            ROW                = 8.53
            HEIGHT             = 22.53
            WIDTH              = 80
            MAX-HEIGHT         = 22.53
            MAX-WIDTH          = 80
            VIRTUAL-HEIGHT     = 22.53
            VIRTUAL-WIDTH      = 80
            MAX-BUTTON         = NO
            RESIZE             = NO
            SCROLL-BARS        = NO
            STATUS-AREA        = YES
            BGCOLOR            = ?
            FGCOLOR            = ?
            THREE-D            = YES
            MESSAGE-AREA       = YES
            SENSITIVE          = YES.
    ASSIGN CURRENT-WINDOW = wh_new.

    IF  VALID-HANDLE(wh_new) THEN DO:
        ASSIGN wh_new:HIDDEN = NO.
    END.
end.
else ASSIGN CURRENT-WINDOW:HIDDEN = NO.

/* RUN */
do on error undo,leave on stop undo,leave:
    RUN VALUE( ch_prog ).
end.

RUN VALUE( REPLACE( PROGRAM-NAME( 1 ), "run.p", "post-launch.p") ).
