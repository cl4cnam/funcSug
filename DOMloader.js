'use strict'

async function getScripts() {
	const theScripts = document.querySelectorAll('script[type="application/funcsug"]')
	const scriptPromises = Array.from(theScripts).map(scriptElt=>fetch(scriptElt.src))
	const values = await Promise.all(scriptPromises)
	const valPromises =    values.map(  val  =>  (val.text())  )
	const texts = await Promise.all(valPromises)
	const l_texts = texts.filter(elt => ! elt.startsWith('<!doctype'))
	const l_infoTexts = l_texts.map((text,idx)=>({
		source: values[idx].url.split(/\//).pop(),
		len: text.split(/\r\n|\r|\n/).length
	}))
	return {texts: l_texts, infoTexts: l_infoTexts}
}

function getOneAST(ps_text, p_textInfo) {
	let lb_lispish
	try {
		//~ console.warn(ps_text)
		lb_lispish = ps_text.startsWith('#!syntax:lispish')
		//~ console.warn(lb_lispish)
		const parser = lb_lispish ? peg : pegPy
		//~ progr = (  (ps_type === 'funcsug') ? peg : pegPy  ).parse(ps_text)
		const completeText =
			lb_lispish
			? '{seq \n' + ps_text.replaceAll('\r','') + '\n }'
			//~ : 'seq:\n' + l_texts.map(l=>'\t'+l).join('\n') + '\n'
			: 'seq:\n\t' + ps_text.replaceAll('\r','').replaceAll('\n', '\n\t') + '\n'
		//~ console.warn(p_textInfo.source)
		//~ console.warn(completeText)
		const progr = parser.parse(completeText, {grammarSource: p_textInfo.source})
		return progr
	} catch (err) {
		if (err instanceof ReferenceError) console.warn('Verify that the right parser is loaded for **' + (lb_lispish?'lispish':'pythonic') + '** ' + p_textInfo.source + '!')
		if (err.location === undefined) console.error(err)
		const loc = err.location
		const oldStartLine = loc.start.line
		const startSource = p_textInfo.source
		const startLine = loc.start.line
		//~ console.warn(err.diagnostic)
		console.error('SYNTAX ERROR%c at ' + startSource + ' line ' + (startLine-1) + ' column ' + (loc.start.column-1), 'color: #008000')
		throw err
	}
}

function getMultASTs(p_texts, p_infoTexts) {
	const lArray_AST = []
	for (let i = 0; i < p_texts.length; i++) {
		lArray_AST.push(  getOneAST(p_texts[i], p_infoTexts[i])  )
	}
	return lArray_AST
}

function combineAST(pArray_AST) {
	const Expression = pArray_AST[0].constructor
	const l_text = pArray_AST.map(ast=>ast.text).join('\n')
	//~ console.warn(l_text)
	const lExpression_seq = new Expression('identifier', 'seq', 'seq')
	lExpression_seq.location.source = 'combine'
	const lExpression_result = new Expression(
		'program',
		new Expression('expression', [
			lExpression_seq,
			...pArray_AST.map(ast=>ast.content.content.slice(1)).flat()
		], l_text),
		l_text
	)
	lExpression_result.location.source = 'combine'
	return lExpression_result
}

async function getAST(ps_type) {
	let progr
	let f_getLocation
	
	const {texts: l_texts, infoTexts: l_infoTexts} = await getScripts(ps_type)
	
	f_getLocation = function(pn_lineNumber, p_infoTexts=l_infoTexts) {
		let linesTotal = 1
		let lastInfo = undefined
		for (const info of p_infoTexts) {
			const prevLinesTotal = linesTotal
			linesTotal += info.len
			lastInfo = info
			if (pn_lineNumber<=linesTotal) {
				return {
					source: info.source,
					line: pn_lineNumber - prevLinesTotal
				}
			}
		}
		return {
			source: (lastInfo===undefined) ? '?' : '!!beyond ' + lastInfo.source + ' in end of added code "{seq ... }"!!',
			line: pn_lineNumber - linesTotal
		}
	}
	const completeText =
		(ps_type === 'funcsug')
		? '{seq \n' + l_texts.join('\n') + '\n }'
		: 'seq:\n' + l_texts.map(l=>'\t'+l).join('\n') + '\n'


	try {
		progr = (  (ps_type === 'funcsug') ? peg : pegPy  ).parse(completeText)
	} catch (err) {
		if (err.location === undefined) console.error(err)
		const loc = err.location
		const oldStartLine = loc.start.line
		const startSource = (f_getLocation) ? f_getLocation(loc.start.line).source : loc.source
		const startLine = (f_getLocation) ? f_getLocation(loc.start.line).line : loc.start.line
		console.error('SYNTAX ERROR%c at ' + startSource + ' line ' + startLine + ' column ' + loc.start.column, 'color: #008000')
		throw err
	}
	return [progr, f_getLocation]
}

(async function() {
	const {texts: l_texts, infoTexts: l_infoTexts} = await getScripts()
	const lArray_AST = getMultASTs(l_texts, l_infoTexts)
	const ast = combineAST(lArray_AST)
	execAST(ast, undefined, true)
})()
