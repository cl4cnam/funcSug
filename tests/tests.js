'use strict'

const lesTests = [



{line: new Error().lineNumber, code:`
	{seq
		.print '======> START'
	}
`, result: `
	======> START
`,},

{line: new Error().lineNumber, code:`
	{seq
		.print .value '======> START'
	}
`, result: `
	======> START
`,},

{line: new Error().lineNumber, code:`
	.print :+ 2 .print 4
`, result: `
4
`,},

{line: new Error().lineNumber, code:`
	{seq
		.print 34
		.print 56
	}
`, result: `
34
56
`,},

{line: new Error().lineNumber, code:`
	{par
		.print 34
		.print 56
	}
`, result: `
34
56
`,},

{line: new Error().lineNumber, code:`
	{mix
		.print 34
		.print 56
	}
`, result: `
34
56
`,},

{line: new Error().lineNumber, code:`
	{seq
		{seq
			.print 1
			.print 2
		}
		{seq
			.print 3
			.print 4
		}
	}
`, result: `
1
2
3
4
`,},

{line: new Error().lineNumber, code:`
	{par
		{seq
			.print 1
			.print 2
		}
		{seq
			.print 3
			.print 4
		}
	}
`, result: `
1
3
2
4
`,},

{line: new Error().lineNumber, code:`
	{mix
		{seq
			.print 1
			.print 2
		}
		{seq
			.print 3
			.print 4
		}
	}
`, result: `
1
3
2
4
`,},

{line: new Error().lineNumber, code:`
	.print {seq
		1
		2
	}
`, result: `
2
`,},

{line: new Error().lineNumber, code:`
	.print {par 1 2}
`, result: `
1
2
`,},

{line: new Error().lineNumber, code:`
	.print {mix 1 2}
`, result: `
1
2
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		# a <-- 0
	}
`, result: `
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		a <-- 0
		a <-- 1
		{par
			a <-- [+1]
			a <-- [+2]
		}
		.print $a
	}
`, result: `
2
3
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		a <-- 1
		{par
			a <-- [$a + 1]
			a <-- [$[a + ''] * 2]
		}
		.print $a
	}
`, result: `
2
2
`,},

{line: new Error().lineNumber, code:`
	{if (par true (seq 
		false
		true
	))
		.print 'c1'
	else
		.print 'deux'
	}
`, result: `
c1
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		a <-- 0
		a <-- 1
		{par
			a <-- [$a + 1]
			a <-- [$[[a + ''] + ''] * 2]
		}
		.print $a
	}
`, result: `
2
4
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		a <-- 0
		a <-- 1
		.freeze a
		{par
			a <-- [+1]
			a <-- [+2]
		}
		.next a
		.print $a
	}
`, result: `
2
3
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		a <-- 0
		a <-- 1
		.freeze a
		{par
			a <-- [+1]
			a <-- [*2]
		}
		.unfreeze a
		.print $a
	}
`, result: `
2
2
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		a <-- 0
		a <-- 1
		.freeze a
		{par
			{seq
				a <-- 1
				.next a
				.aggregsum a
				.next a
				.aggregsum a
			}
			{seq
				a <-- 2
				.next a
				.aggregprod a
				.next a
				.aggregprod a
			}
		}
		.unfreeze a
		.print $a
	}
`, result: `
5
6
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		{seq
			:set a 1
			:set a 2
		}
		.print $a
	}
`, result: `
2
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		{par
			:set a 1
			:set a 2
		}
		.print $a
	}
`, result: `
1
2
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		{mix
			:set a 1
			:set a 2
		}
		.print $a
	}
`, result: `
2
`,},

{line: new Error().lineNumber, code:`
	{seq
		.print '======> START'
		.print 456
		.print -789
		.print 'true'
		.print :+ 'true' 1
		.print :- :+ 4 5 1
		.print :+ :+ 'tru' 'e' 1
		.print :+ '5*4=' :* 5 4
		.print :< 5 4
		.print [1 > 0]
		.print '======> MID'
		.var a
		.var b
		{par :set a 20 :set a 30}
		{par :set b 4 :set b 5}
		.print :- $a $b
		.print '======> END'
	}
`, result: `
	======> START
	456
	-789
	true
	2
	8
	true1
	5*4=20
	false
	true
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
		.print :await a beep
		.print .isBeep a
	}
`, result: `
	45
	false
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		%ext (rt yyu) 'output(45)' a
		.awaitBool .isBeep a
		.print $a
		.print .isBeep a
	}
`, result: `
	45
	true
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		%ext (rt yyu) 'output(45)' a
		.print :await a bip
		.print .isBip a
		.print .isBeep a
		.stopBeep a
		.print .isBeep a
	}
`, result: `
	45
	false
	true
	false
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a
		[(rt yyu) 'output(45)' ext a]
		.print :await a bip
	}
`, result: `
	45
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var qwerty
		{seq @qwerty
			.var boite
			:set boite !Namespace
		}
	}
`, result: `
`,},

{line: new Error().lineNumber, code:`
	.print {seq
		99
		4
		56
		309
	}
`, result: `
309
`,},

{line: new Error().lineNumber, code:`
	{seq
		%deffunc plus (_x p_y)
			:+ $_x $p_y
		.print (&plus 5 8)
	}
`, result: `
13
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var azer
		.var qwertz
		{seq @azer
			.var a
			:set a 0
			#{while :< $a 1000
			{while [$a < 3]
				{seq @qwertz
					.print $a
					[a <- [$a + 1] ]
					$a
				}
			}
		}
	}
`, result: `
0
1
2
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var azerty
		.var qwertz
		{seq @azerty
			.var a
			:set a 0
			#.break azerty
			{while [$a < 3]
				{seq @qwertz
					.print $a
					[a <- [$a + 1] ]
					$a
				}
			}
		}
	}
`, result: `
0
1
2
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var theLoop
		.var a
		:set a 0
		{while @theLoop [$a < 3]
			{seq
				.print $a
				.break theLoop
				[a <- [$a + 1] ]
				$a
			}
		}
		.var b
	}
`, result: `
0
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var theSeq
		{seq @theSeq
			.print 45
			.break theSeq
			.print 'x'
			.print 'y'
		}
		~.print '*'
	}
`, result: `
45
*
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var theSeq
		.var a
		:set a 0
		{while :< $a 3
			{seq @theSeq
				.print $a
				[a <- [$a + 1] ]
				.break theSeq
				.print 'x'
				.print 'y'
			}
			~.print '*'
		}
		.var b
	}
`, result: `
0
*
1
*
2
*
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var theWhile
		.var a
		:set a 0
		{while @theWhile :< $a 3
			{seq
				.print $a
				[a <- [$a + 1] ]
				.break theWhile
				.print 'x'
				.print 'y'
			}
		}
		~.print '*'
		.var b
	}
`, result: `
0
*
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var theWhile
		.var a
		:set a 0
		{while @theWhile :< $a 3
			{seq
				.print $a
				[a <- [$a + 1] ]
				.break theWhile
				.print 'x'
				.print 'y'
			}
		}
		~.print :+ '*' $a
		.var b
	}
`, result: `
0
*1
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var theSeq
		{seq @theSeq
			.var a
			:set a 0
			{while :< $a 3
				{seq
					.print $a
					[a <- [$a + 1] ]
					.break theSeq
					.print 'x'
					.print 'y'
				}
			}
			~.print '*'
			.print 'z'
		}
		.print 'w'
	}
`, result: `
0
*
w
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

