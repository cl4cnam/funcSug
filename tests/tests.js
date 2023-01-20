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
		.varmul a
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
		.varmul a
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
		.varmul a
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
		.varmul a
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
		.varmul a
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
		.varmul a
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
		.varmul a
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
		.varmul a
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
		.varmul a
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
		.print :+ true 1
		.print :- :+ 4 5 1
		.print :+ :+ 'tru' 'e' 1
		.print :+ '5*4=' :* 5 4
		.print :< 5 4
		.print [1 > 0]
		.print '======> MID'
		.varmul a
		.varmul b
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
	true1
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
		.var a <-- 0
		.var b <-- 1
		:short (a b) 'console.log("coucou")'
	}
`, result: `
	coucou
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 2
		.var b <-- 5
		.print :short (a b) 'return (b+1)*(a+3)'
	}
`, result: `
	30
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 0
		.var b <-- 1
		:ext (a b) 'console.log("coucou")'
	}
`, result: `
	coucou
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 0
		.var b <-- 38
		%ext (a b) 'console.log(b)' a
	}
`, result: `
	38
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 0
		.var b <-- 1
		%ext (a b) 'output(45)' a
		.print $a
	}
`, result: `
0
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 0
		.var b <-- 1
		.var c
		%ext (a b) 'output(45)' c
		.print :await c beep
		.print .isBeep c
	}
`, result: `
	45
	false
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 0
		.var b <-- 1
		.var c
		%ext (a b) 'output(45)' c
		.awaitBool .isBeep c
		.print $c
		.print .isBeep c
	}
`, result: `
	45
	true
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 0
		.var b <-- 1
		.var c
		%ext (a b) 'output(45)' c
		.print :await c bip
		.print .isBip c
		.print .isBeep c
		.stopBeep c
		.print .isBeep c
	}
`, result: `
	45
	false
	true
	false
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 0
		.var b <-- 1
		.var c
		[(a b) 'output(45)' ext c]
		.print :await c bip
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
	{seq
		.var qwerty
		{seq @qwerty
			.var boite
			:set boite !Namespace
			%setToNamespace $boite a 34
			.print :getFromNamespace $boite a
			%setToNamespace $boite a 56
			.print :getFromNamespace $boite a
		}
	}
`, result: `
34
56
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var box
		:set box !Namespace
		box.a <-- 34
		.print :getFromNamespace $box a
	}
`, result: `
34
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var box
		:set box !Namespace
		%setToNamespace $box internBox !Namespace
		%setToNamespace $box.internBox a 56
		.print :getFromNamespace $box.internBox a
	}
`, result: `
56
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var box
		:set box !Namespace
		%setToNamespace $box internBox !Namespace
		%setToNamespace $box.internBox a 56
		.print $box.internBox.a
	}
`, result: `
56
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var box
		:set box !Namespace
		%setToNamespace $box internBox !Namespace
		box.internBox.a <-- 56
		.print $box.internBox.a
	}
`, result: `
56
`,},

{line: new Error().lineNumber, code:`
	{seq
		{deffunc test ()
			78
		}
		.print !test
	}
`, result: `
78
`,},

{line: new Error().lineNumber, code:`
	{seq
		{deffunc test (p_bool)
			{if $p_bool
				78
			else
				45
			}
		}
		.print .test false
		.print .test true
	}
`, result: `
45
78
`,},

{line: new Error().lineNumber, code:`
	{seq
		{deffunc test parame
			.print :getFromNamespace $parame 1
			.print :getFromNamespace $parame PARAMLENGTH
		}
		(test 34 57)
	}
`, result: `
57
2
`,},

{line: new Error().lineNumber, code:`
	{seq
		{deffunc test parame
			.print $parame.1
		}
		(test 34 57)
	}
`, result: `
57
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
		{deffunc plus (_x p_y)
			:+ $_x $p_y
		}
		.print (&plus 5 8)
	}
`, result: `
13
`,},

{line: new Error().lineNumber, code:`
	{seq
		{deffunc ifa (p_cond _action)
			{if $p_cond
				$_action
			}
		}
		{ifa false
			.print 61
		}
	}
`, result: `
`,},

{line: new Error().lineNumber, code:`
	{seq
		{match 63
			case 54
				.print '==NO=='
			case (par 44 63 77)
				.print 'OK'
			case 2
				.print '--NO--'
		}
	}
`, result: `
OK
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
				.print $a
				.break theLoop
				[a <- [$a + 1] ]
				$a
		}
		.var b
	}
`, result: `
0
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 0
		{while [$a < 3]
			.var b <-- 'OK'
			.print $a
			.print $b
			a <-- [$a + 1]
		}
	}
`, result: `
0
OK
1
OK
2
OK
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
				.print $a
				[a <- [$a + 1] ]
				.break theWhile
				.print 'x'
				.print 'y'
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
				.print $a
				[a <- [$a + 1] ]
				.break theWhile
				.print 'x'
				.print 'y'
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
					.print $a
					[a <- [$a + 1] ]
					.break theSeq
					.print 'x'
					.print 'y'
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

{line: new Error().lineNumber, code:`
	{seq
		.var a
		:set a (par 4 7)
		.print $a
	}
`, result: `
4
7
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- (par 4 7)
		.print $a
	}
`, result: `
4
7
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var nm <-- !Namespace
		nm.a <-- (par 4 7)
		.print $nm.a
	}
`, result: `
4
7
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- (par 4 7)
		{foreach a {seq
			.print $a
		}}
	}
`, result: `
4
7
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- (par 4 7)
		{foreach a {seq
			.print $a
			.print $a_N
		}}
	}
`, result: `
4
7
0
1
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var theMix
		{mix @theMix
			{while true
				.break theMix
			}
		}
		.print 77
	}
`, result: `
77
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var theMix
		.var evt
		{mix @theMix
			:await evt beep
			:await evt beep
			.break theMix
		}
		.print 77
	}
`, result: `
77
`,},

{line: new Error().lineNumber, code:`
	{seq
		{repeat 0
			.print 77
		}
	}
`, result: `
`,},

{line: new Error().lineNumber, code:`
	{seq
		{repeat 1
			.print 77
		}
	}
`, result: `
77
`,},

{line: new Error().lineNumber, code:`
	{seq
		{repeat 3
			.print 77
		}
	}
`, result: `
77
77
77
`,},

{line: new Error().lineNumber, code:`
	{seq
		{deffunc change (p_variable)
			:set $p_variable 45
		}
		.var aVariable
		.change aVariable
		.print $aVariable
	}
`, result: `
45
`,},

{line: new Error().lineNumber, code:`
	{seq
		.print :parRange 3 5
	}
`, result: `
3
4
5
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- (par 45)
		{foreach a
			.print $a
		}
	}
`, result: `
45
`,},

{line: new Error().lineNumber, code:`
	{seq
		.print .listToPar {short () 'return [76]'}
	}
`, result: `
76
`,},

{line: new Error().lineNumber, code:`
	{seq
		.print .listToPar {short () 'return [76,54]'}
	}
`, result: `
76
54
`,},

{line: new Error().lineNumber, code:`
	{seq
		.var a <-- 3
		.var suppl
		{par
			*suppl
			{while [$a > 0]
				.print $a
				a <-- [- 1]
			}
			{spawn suppl
				.print 'Hello!'
			}
		}
	}
`, result: `
Hello!
3
2
1
`,},


]





async function main() {



{
	const oldLog = console.log
	let res = ''
	let diff = -1
	console.log = function(...args) {
		res += args + '\n'
	}
	
	for (const progTestIndex in lesTests) {
		//~ if (progTestIndex != lesTests.length - 1) continue
		const progTest = lesTests[progTestIndex]
		res = ''
		try {
			if (progTest.code!=='') {
				let startTime = performance.now()
				execProg(progTest.code)
				diff = performance.now() - startTime
			}
		} catch (err) {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' line ' + progTest.line + ' : -------- SYNTAX ERROR OR BUG--------')
			oldLog(progTest.code)
			oldLog(progTest.result.replaceAll('\n\t','\n').trim())
			throw err
		}
		await new Promise(resolve=>{setTimeout(()=>{resolve(1)},0)})
		if (res.trim()===progTest.result.replaceAll('\n\t','\n').trim()) {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' line ' + progTest.line + ' : OK (time: ' + diff + ')')
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

