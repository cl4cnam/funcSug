'use strict'

const lesTests = [


{line: new Error().lineNumber, code:`
	{seq
		.print '======> START'
		.print 'true'
		.print :+ 'true' 1
		.print :+ :+ 'tru' 'e' 1
		.print '======> MID'
		.var a .var b
		{par :set a 20 :set a 30}
		{par :set b 4 :set b 5}
		.print :+ .get a .get b
		.print '======> END'
	}
`, result: `
	======> START
	true
	2
	true1
	======> MID
	24
	25
	34
	35
	======> END
`,},
{line: new Error().lineNumber, code:`
	{if (par true false)
	then
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
	then
		.print 'un'
	}
`, result: `
	un
`,},
{line: new Error().lineNumber, code:`
	{if true
	then
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
		%ext dummy 'console.log("coucou")' a
	}
`, result: `
	coucou
`,},
{line: new Error().lineNumber, code:`
	{seq
		.var a
		%ext dummy 'resolve(45)' a
		.print .get a
	}
`, result: `
`,},
{line: new Error().lineNumber, code:`
	{seq
		.var a
		%ext dummy 'resolve(45)' a
		.print .await a
	}
`, result: `
	45
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
			execProg(progTest.code)
		} catch (err) {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' line ' + progTest.line + ' : -------- SYNTAX ERROR --------')
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

