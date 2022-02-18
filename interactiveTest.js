'use strict'

const ls_externalAction = `
	const l_button = document.getElementById('theButton')
	l_button.addEventListener('click', function(evt) {
		output('You win ' + args[0] + ' ' + args[1] + '!')
	})
`

const ls_prog = `
	{seq
		.var clickButton
		.var a
		{par :set a 34 :set a 56}
		.print '======> START'
		{ext ($a eggs) "` + ls_externalAction + `" clickButton}
		.print '======> MID'
		.print .await clickButton
		.print '======> END'
	}
`

execProg(ls_prog)
