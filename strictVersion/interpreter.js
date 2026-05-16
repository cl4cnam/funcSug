'use strict'

let timeout0, f_location, Expression

let state = {}
let gAst
let variables = new Set()
const awaitedVariables = new Set()

function combineState(pState1, pState2) {
	const returnState = Object.assign({}, pState1)
	for (const key in pState2) {
		returnState[key] ||= []
		returnState[key] = [...returnState[key]]
		returnState[key].push(...pState2[key])
	}
	return returnState
}

function reduct(pAst, pEvt, pState) {
	pAst = simplifyRoot(pAst)
	if (pAst === 'bottom') {
		return 'bottom'
	} else if (pAst.type === 'expression' && pAst.content[0].content === '<=' && pAst.content.length === 3) {
		return pAst
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'await') {
		const l_genus = pAst.content[1].content
		const l_species = pAst.content[2].content
		if (pEvt.type?.genus === l_genus && pEvt.type?.species === l_species) {
			return 'bottom'
		} else {
			return pAst
		}
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'seq') {
		const lAst_first = reduct(pAst.content[1], pEvt, pState)
		const lArray_content = (lAst_first === 'bottom') ? pAst.content.slice(2) : [reduct(pAst.content[1], pEvt, pState), ...pAst.content.slice(2)]
		return new Expression('expression', [
			new Expression('identifier', 'seq'),
			...lArray_content
		])
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par') {
		const lArray_content = pAst.content.slice(1).map(elt=>reduct(elt, pEvt, pState)).filter(elt=>(elt!=='bottom'))
		if (lArray_content.length === 0) return 'bottom'
		//~ console.log('par: lArray_content', lArray_content)
		return new Expression('expression', [
			new Expression('identifier', 'par'),
			...lArray_content
		])
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par_race_mult') {
		const lArray_content = pAst.content.slice(2).map(elt=>reduct(elt, pEvt, pState))
		if (lArray_content.includes('bottom')) {
			return 'bottom'
		}
		//~ console.log('par_race_mult: lArray_content', lArray_content)
		return new Expression('expression', [
			new Expression('identifier', 'par_race_mult'),
			new Expression('number', 1),
			...lArray_content
		])
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	} else {
		console.warn(pAst, pEvt, pState)
		throw 'not_implemented'
	}
	
	// return AST
}

function newState(pAst, pState) {
	pAst = simplifyRoot(pAst)
	if (pAst === 'bottom') {
		return {}
	} else if (pAst.type === 'expression' && pAst.content[0].content === '<=' && pAst.content.length === 3) {
		const returnState = {}
		const ls_varName = pAst.content[1].content[1].content
		const l_value = pAst.content[2].content
		returnState[ls_varName] = [l_value]
		variables.add(ls_varName)
		return returnState
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'await') {
		const l_genus = pAst.content[1].content
		const l_species = pAst.content[2].content
		if (!pAst.content[0].alreadySeen) inputHook(l_genus, l_species)
		pAst.content[0].alreadySeen = true
		if (l_genus === 'var') {
			awaitedVariables.add(l_species)
		}
		return {}
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'seq') {
		return newState(pAst.content[1])
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par') {
		const lArray_content = pAst.content.slice(1)
		const lArray_newState = lArray_content.map(elt=>newState(elt))
		return lArray_newState.reduce(combineState)
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par_race_mult') {
		const lArray_content = pAst.content.slice(2)
		//~ console.log('state par_race_mult content', lArray_content)
		const lArray_newState = lArray_content.map(elt=>newState(elt))
		return lArray_newState.reduce(combineState)
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	} else {
		throw 'not_implemented'
	}
	
	// return state
}

function simplifyRoot(pAST_code) {
	if (pAST_code.type === 'expression' && pAST_code.content[0].content === 'seq' && pAST_code.content.length === 2) {
		return pAST_code.content[1]
	} else if (pAST_code.type === 'expression' && pAST_code.content[0].content === 'par' && pAST_code.content.length === 2) {
		return pAST_code.content[1]
	} else if (pAST_code.type === 'expression' && pAST_code.content[0].content === 'par_race_mult' && pAST_code.content.length === 3) {
		return pAST_code.content[2]
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	//~ } else if () {
	} else {
		return pAST_code
	}
}

function runOnce(p_evt) {
	console.log('runOnce', p_evt)
	gAst = simplifyRoot(gAst)
	//~ console.log('simplified', gAst)
	gAst = reduct(gAst, p_evt, state)
	state = newState(gAst, state)
	outputHook(state)
	//~ console.log('reducted', gAst)
	//~ console.log(state)
}

function runBurst(p_evt) {
	runOnce(p_evt)
	variables = variables.intersection(awaitedVariables)
	while (variables.size !== 0) {
		for (const vari of variables) {
			awaitedVariables.delete(vari)
			runOnce({
				type: {genus: 'var', species: vari},
				value: state[vari]
			})
		}
		variables = variables.intersection(awaitedVariables)
	}
}

function exec(pAST_code) {
	gAst = pAST_code
	runBurst({type: 'start', value: undefined})
}

function execAST(pAST, pf_location, pb_notTimeout0) {
	timeout0 = ! pb_notTimeout0
	f_location = pf_location
	Expression = pAST.constructor
	exec(pAST.content)
}
