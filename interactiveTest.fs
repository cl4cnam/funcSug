.print '.....> TEST'
.print ''
.print {seq 4 67 89}
.var clickButton
.var edit
.print (&pluss 3 4 9)
#(&inputText edit)
#.print (&awaitHumanText)
(&getClick theButton clickButton)
.print '.....> MID'
:await clickButton beep
.print '.....> MID2'
#.print .await edit
.print :randomIntBetween 0 31
(&displayMessage 'Hello!')
#(&awaitClickBeep theButton)
.print (&awaitHumanText)
.print '.....> END'
