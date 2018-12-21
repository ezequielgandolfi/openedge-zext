DEFINE VARIABLE ch_prog AS CHARACTER NO-UNDO.

/* Extracts the parameters */
ASSIGN ch_prog = ENTRY( 1, SESSION:PARAMETER ).

RUN VALUE( REPLACE( PROGRAM-NAME( 1 ), "run.p", "pre-launch.p") ).

/* RUN */
RUN VALUE( ch_prog ).

RUN VALUE( REPLACE( PROGRAM-NAME( 1 ), "run.p", "post-launch.p") ).
