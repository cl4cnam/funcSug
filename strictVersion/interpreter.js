'use strict'

let timeout0, f_location, Expression

let state = new Map()
let gAst
let gb_tickAwaited

function combineState(pState1, pState2) {
	const returnState = new Map(pState1)
	for (let [key, value] of pState2) {
		returnState.set(key, returnState.get(key) || [])
		returnState.set(key, [...returnState.get(key)])
		returnState.get(key).push(...value)
	}
	return returnState
}

function doStep(pAst, pEvt, pState) {
	//~ console.warn('========================== STEP', pEvt.type.genus)
	pAst = simplify(pAst)
	if (pAst === 'bottom') {
		return 'bottom'
	} else if (pAst.type === 'expression' && pAst.content[0].content === '<=' && pAst.content.length === 3) {
		let l_value = pAst.content[2].content
		//~ if (l_value.pop && l_value[0].content === 'host') {
		if (l_value.pop && ['exec', 'eval'].includes(l_value[0].content) ) {
			let ls_codeToEvaluate = l_value[1].content
			//~ ls_codeToEvaluate = ls_codeToEvaluate.replaceAll('$(', 'S.get(')
			const ls_optReturnWord = (l_value[0].content === 'exec') ? '' : 'return '
			ls_codeToEvaluate = getHostFunc() + `function $(genus, species) {return p_state.get(genus+'$$$'+species)}; ` + ls_optReturnWord + ls_codeToEvaluate
			//~ console.log('=====', ls_codeToEvaluate)
			l_value = (Function('p_state', ls_codeToEvaluate))(pState)
		}
		l_value = (l_value.pop) ? l_value : [l_value]
		return new Expression('expression', [
				new Expression('identifier', '<='),
				pAst.content[1],
				new Expression('string', l_value),
		])
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'await') {
		const l_genus = pAst.content[1].content[0].content
		const l_species = pAst.content[1].content[1].content
		if (pEvt.type?.genus === l_genus && pEvt.type?.species === l_species) {
			return 'bottom'
		} else {
			return pAst
		}
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'seq') {
		const lAst_first = doStep(pAst.content[1], pEvt, pState)
		const lArray_content = (lAst_first === 'bottom') ? pAst.content.slice(2) : [lAst_first, ...pAst.content.slice(2)]
		const lAst_remaining = new Expression('expression', [
			new Expression('identifier', 'seq'),
			...lArray_content
		])
		if (lAst_first === 'bottom') {
			return doStep(lAst_remaining, pEvt, pState)
		} else {
			return lAst_remaining
		}
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par') {
		const lArray_content = pAst.content.slice(1).map(elt=>doStep(elt, pEvt, pState)).filter(elt=>(elt!=='bottom'))
		if (lArray_content.length === 0) return 'bottom'
		//~ console.log('par: lArray_content', lArray_content)
		return new Expression('expression', [
			new Expression('identifier', 'par'),
			...lArray_content
		])
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par_race_mult') {
		const lArray_content = pAst.content.slice(2).map(elt=>doStep(elt, pEvt, pState))
		if (lArray_content.includes('bottom')) {
			clearInputHook(pAst)
			return 'bottom'
		}
		//~ console.log('par_race_mult: lArray_content', lArray_content)
		return new Expression('expression', [
			new Expression('identifier', 'par_race_mult'),
			new Expression('number', 1),
			...lArray_content
		])
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par_select_mult') {
		const branch1a = doStep(pAst.content[2].content[1], pEvt, pState)
		const branch2a = doStep(pAst.content[3].content[1], pEvt, pState)
		const branch1b = pAst.content[2].content[4]
		const branch2b = pAst.content[3].content[4]
		if (branch1a === 'bottom' && branch2a === 'bottom') {
			clearInputHook(pAst)
			return 'bottom'
		} else if (branch1a === 'bottom') {
			clearInputHook(branch2a)
			return doStep(branch1b, pEvt, pState)
		} else if (branch2a === 'bottom') {
			clearInputHook(branch1a)
			return doStep(branch2b, pEvt, pState)
		} else {
			const returnExpression = new Expression('expression', [
				new Expression('identifier', 'par_select_mult'),
				new Expression('number', 1),
				new Expression('expression', [
					new Expression('identifier', 'seq'),
					branch1a,
					'dummy',
					'dummy',
					branch1b
				]),
				new Expression('expression', [
					new Expression('identifier', 'seq'),
					branch2a,
					'dummy',
					'dummy',
					branch2b
				]),
			])
			//~ console.warn('returnExpression', returnExpression)
			return returnExpression
		}
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'while' && pAst.content[1].content === 'true') {
		return new Expression('expression', [
			new Expression('identifier', 'seq'),
			doStep(pAst.content[2], pEvt, pState),
			pAst
		])
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'if') {
		const ls_condition = pAst.content[1].content
		const ls_codeToEvaluate = `function $(genus, species) {console.log('====', p_state.get(genus+'$$$'+species)); return p_state.get(genus+'$$$'+species)}; return ` + ls_condition
		const l_value = (Function('p_state', ls_codeToEvaluate))(pState)
		if (l_value) {
			return doStep(pAst.content[2], pEvt, pState)
		} else {
			return 'bottom'
		}
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

function genState(pAst, pState) {
	//~ console.warn(pState)
	pAst = simplify(pAst)
	if (pAst === 'bottom') {
		return new Map()
	} else if (pAst.type === 'expression' && pAst.content[0].content === '<=' && pAst.content.length === 3) {
		const returnState = new Map()
		const ls_genus = pAst.content[1].content[0].content
		const ls_species = pAst.content[1].content[1].content
		let l_value = pAst.content[2].content
		if (l_value.pop && l_value[0].content === 'host') {
			let ls_codeToEvaluate = l_value[1].content
			//~ console.log('=====', ls_codeToEvaluate)
			//~ ls_codeToEvaluate = ls_codeToEvaluate.replaceAll('$(', 'S.get(')
			ls_codeToEvaluate = `function $(genus, species) {return p_state.get(genus+'$$$'+species)}; ` + ls_codeToEvaluate
			l_value = (Function('p_state', ls_codeToEvaluate))(pState)
		}
		//~ console.log(ls_genus, ls_species, l_value)
		//~ returnState.set({genus: ls_genus, species: ls_species}, [l_value])
		l_value = (l_value.pop) ? l_value : [l_value]
		returnState.set(ls_genus+'$$$'+ls_species, l_value)
		return returnState
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'await') {
		const l_genus = pAst.content[1].content[0].content
		const l_species = pAst.content[1].content[1].content
		inputHook(l_genus, l_species, pAst)
		if (l_genus === 'tick') {
			gb_tickAwaited = true
		}
		return new Map()
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'seq') {
		return genState(pAst.content[1], pState)
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par') {
		const lArray_content = pAst.content.slice(1)
		const lArray_newState = lArray_content.map(elt=>genState(elt, pState))
		return lArray_newState.reduce(combineState)
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par_race_mult') {
		const lArray_content = pAst.content.slice(2)
		//~ console.log('state par_race_mult content', lArray_content)
		const lArray_newState = lArray_content.map(elt=>genState(elt, pState))
		return lArray_newState.reduce(combineState)
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'par_select_mult') {
		const branch1a = pAst.content[2].content[1]
		const branch2a = pAst.content[3].content[1]
		return combineState(genState(branch1a, pState), genState(branch2a, pState))
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'while' && pAst.content[1].content === 'true') {
		return genState(pAst.content[2], pState)
	} else if (pAst.type === 'expression' && pAst.content[0].content === 'if') {
		const ls_condition = pAst.content[1].content
		const ls_codeToEvaluate = `function $(genus, species) {return p_state.get(genus+'$$$'+species)}; return ` + ls_condition
		const l_value = (Function('p_state', ls_codeToEvaluate))(pState)
		if (l_value) {
			return genState(pAst.content[2], pState)
		} else {
			return new Map()
		}
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

function simplify(pAST_code) {
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
	gAst = simplify(gAst)
	console.log('simplified', gAst)
	const l_evtState = new Map()
	//~ l_evtState.set(p_evt.type, [p_evt.value])
	l_evtState.set(p_evt.type.genus+'$$$'+p_evt.type.species, [p_evt.value])
	state = combineState(state, l_evtState)
	gAst = doStep(gAst, p_evt, state)
	state = genState(gAst, state)
	outputHook(state)
	//~ console.log('reducted', gAst)
	//~ console.log(state)
}

function runBurst(p_evt) {
	runOnce(p_evt)
	while (gb_tickAwaited) {
		gb_tickAwaited = false
		runOnce({
			type: {genus: 'tick', species: undefined},
			value: undefined
		})
	}
}

function exec(pAST_code) {
	gAst = pAST_code
	//~ runBurst({type: 'start', value: undefined})
	runBurst({
		type: {genus: 'start', species: undefined},
		value: undefined
	})
}

function execAST(pAST, pf_location, pb_notTimeout0) {
	timeout0 = ! pb_notTimeout0
	f_location = pf_location
	Expression = pAST.constructor
	exec(pAST.content)
}
