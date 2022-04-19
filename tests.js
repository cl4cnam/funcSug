'use strict'

const lesTests = [



{line: new Error().lineNumber, code:`
	{seq
		.print '======> START'
		.print 'true'
		.print :+ 'true' 1
		.print :- :+ 4 5 1
		.print :+ :+ 'tru' 'e' 1
		.print :+ '5*4=' :* 5 4
		.print :< 5 4
		.print '======> MID'
		.var a .var b
		{par :set a 20 :set a 30}
		{par :set b 4 :set b 5}
		.print :- $a $b
		.print '======> END'
	}
`, result: `
	======> START
	true
	2
	8
	true1
	5*4=20
	false
	======> MID
	16
	15
	26
	25
	======> END
`,},

{line: new Error().lineNumber, code:`
	{seq
		.print '======> START'
		.print :and true false
		.print :or true false
		.print .not true
		.print '======> END'
	}
`, result: `
	======> START
	false
	true
	false
	======> END
`,},

{line: new Error().lineNumber, code:`
	{if (par true false)
		.print 'un'
	else
		.print 'deux'
	}
`, result: `
	un
	deux
`,},

{line: new Error().lineNumber, code:`
	{if true
		.print 'un'
	}
`, result: `
	un
`,},

{line: new Error().lineNumber, code:`
	{if false
		.print 'un'
	}
`, result: `
`,},

{line: new Error().lineNumber, code:`
	{if true
		.print 'un'
	else
		.print 'deux'
	}
`, result: `
	un
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		%ext (rt yyu) 'console.log("coucou")' a
	}
`, result: `
	coucou
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		%ext (rt yyu) 'output(45)' a
		.print $a
	}
`, result: `
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		%ext (rt yyu) 'output(45)' a
		.print :await a bip
	}
`, result: `
	45
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var boite
		:set boite !Scope
	}
`, result: `
`,},

{line: new Error().lineNumber, code:`
	.print {seq
		99 4 56 309
	}
`, result: `
309
`,},

{line: new Error().lineNumber, code:`
	{seq
		%deffunc plus (_x p_y) :+ $_x $p_y
		.print (&plus 5 8)
	}
`, result: `
13
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		:set a 0
		{while :< $a 3
			{seq
				.print $a
				:set a :+ $a 1
				$a
			}
		}
	}
`, result: `
0
1
2
`,},


]





async function main() {



{
	const oldLog = console.log
	let res = ''
	console.log = function(...args) {
		res += args + '\n'
	}
	
	for (const progTestIndex in lesTests) {
		const progTest = lesTests[progTestIndex]
		res = ''
		try {
			if (progTest.code!=='') execProg(progTest.code)
		} catch (err) {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' line ' + progTest.line + ' : -------- SYNTAX ERROR OR BUG--------')
			oldLog(progTest.code)
			oldLog(progTest.result.replaceAll('\n\t','\n').trim())
			throw err
		}
		await new Promise(resolve=>{setTimeout(()=>{resolve(1)},0)})
		if (res.trim()===progTest.result.replaceAll('\n\t','\n').trim()) {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' line ' + progTest.line + ' : OK')
		} else {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' line ' + progTest.line + ' : RESULT ERROR')
			oldLog(res.trim())
			oldLog(progTest.result.replaceAll('\n\t','\n').trim())
			break
		}
		await new Promise(resolve=>{setTimeout(()=>{resolve(1)},0)})
	}
	
	console.log = oldLog
}




}


main()

