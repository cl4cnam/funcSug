'use strict'

const lesTests = [


{code:`
	{seq
		.print '======> START'
		.var a .var b
		{par :set a 20 :set a 30}
		{par :set b 4 :set b 5}
		.print :+ .get a .get b
		.print '======> END'
	}
`, result: `
	======> START
	24
	25
	34
	35
	======> END
`,},
{code:`
	{if (par true false)
		.print 'un'
		.print 'deux'
	}
`, result: `
	un
	deux
`,},
{code:`
	{if true
		.print 'un'
		.print 'deux'
	}
`, result: `
	un
`,},


]






{
	const oldLog = console.log
	let res = ''
	console.log = function(...args) {
		res += args + '\n'
	}
	
	for (const progTestIndex in lesTests) {
		const progTest = lesTests[progTestIndex]
		res = ''
		execProg(progTest.code)
		if (res.trim()===progTest.result.replaceAll('\n\t','\n').trim()) {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' : OK')
		} else {
			oldLog('test ' + (parseInt(progTestIndex)+1))
			oldLog(res.trim())
			oldLog(progTest.result.replaceAll('\n\t','\n').trim())
			break
		}
	}
	
	console.log = oldLog
}
