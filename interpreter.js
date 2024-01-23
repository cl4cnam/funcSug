'use strict'

// inspired by https://gist.github.com/eyecatchup/d0e1fb062343d45fbb5800dd0dc3d4d9
function wrapListener(pFunction_listener) {
	if (!pFunction_listener.wrapped) {
		pFunction_listener.wrapped = function () {
			try{
				pFunction_listener.apply(this, arguments)
			} catch(err) {
				console.error('JavaScript Error at line ' + (err.lineNumber - 13) + ' in this listener (' + pFunction_listener.evtType + '): ' + pFunction_listener.toString())
				//~ console.error('JavaScript Error (location): ', pFunction_listener.location)
				throw err
			}
		}
	}
}

const addEventListener_orig = EventTarget.prototype.addEventListener
EventTarget.prototype.addEventListener = function (ps_evtType, pFunction_listener, options, location) {
	pFunction_listener.location = (new Error()).stack
	pFunction_listener.evtType = ps_evtType
	wrapListener(pFunction_listener)
	addEventListener_orig.call(this, ps_evtType, pFunction_listener.wrapped, options)
}

const removeEventListener_orig = EventTarget.prototype.removeEventListener
EventTarget.prototype.removeEventListener = function (ps_evtType, pFunction_listener, options) {
	removeEventListener_orig.call(this, ps_evtType, pFunction_listener.wrapped || pFunction_listener, options)
}
// end of part inspired by https://gist.github.com/eyecatchup/d0e1fb062343d45fbb5800dd0dc3d4d9


const namespaceSet = new Set()
const cancellationSet = new Set()
const frozenLiveboxSet = new Set()
const cancellableFrameSet = new Set()
const dynamicParallelSet = new Set()

const BREAK = 0
const RESTART = 1
const TOGGLE_PAUSE = 2
const PAUSE = 3
const RESUME = 4

let stop
let timeout0 = false
let frameFunction = undefined

// continuous
//-----------
let gs_prepContinuous = ''
let old_timestamp = undefined
let continuousEvents

clearContinuousEvents()

function clearContinuousEvents() {
	continuousEvents = new Map()
	continuousEvents.old_get = continuousEvents.get
	continuousEvents.get = (key) => continuousEvents.old_get(key) || []
}

function send(type, val) {
	if (! continuousEvents.has(type)) continuousEvents.set(type, [])
	continuousEvents.get(type).push(val)
}

function prep_goAssign(pFrame_) {
	return function goAssign(ps_variable, p_val, pFrame = pFrame_) {
		const l_namespace = getNamespace(pFrame, ps_variable)
		;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'set undefined variable (for goAssign) "' + ps_variable + '"')
		const l_livebox = l_namespace.get(ps_variable)
		l_livebox.setval(pFrame, [p_val], true)
		runBurst()
	}
}

const continuousActionDict = {
	send: new Map(),
	adapt: new Map(),
	play: new Map(),
	emit: new Map(),
}
let continuousActionNotEmptyAnymore = false
let continuousActionEmpty = true

function addContinuousAction(type, key, fct, frame) {
	if (continuousActionDict.send.size === 0
			&& continuousActionDict.adapt.size === 0
			&& continuousActionDict.play.size === 0
			&& continuousActionDict.emit.size === 0) {
		continuousActionNotEmptyAnymore = true
	}
	continuousActionDict[type].set(key,{fct:fct,frame:frame})
	continuousActionEmpty = false
}

function delContinuousAction(type, key) {
	continuousActionDict[type].delete(key)
	if (continuousActionDict.send.size === 0
			&& continuousActionDict.adapt.size === 0
			&& continuousActionDict.play.size === 0
			&& continuousActionDict.emit.size === 0) {
		continuousActionEmpty = true
	}
}

let mainFrame
let globalFrameTree
let g_superInstantNumber = 0
let Expression = null

//===================================================================================================
//
// Errors, debug
//
//===================================================================================================
//===================================================================================================

let f_location

const localLog = console.debug
const localGroup = console.group
const localGroupEnd = console.groupEnd
let g_debug = 0
const condLog = function (debugLevel, ...param) {
	if (g_debug >= debugLevel) localLog(...param)
}
const condLogGroup = function (debugLevel, ...param) {
	if (g_debug >= debugLevel) localGroup(...param)
}
const condLogGroupEnd = function (debugLevel, ...param) {
	if (g_debug >= debugLevel) localGroupEnd(...param)
}

function $$$__BugChecking(pb_bugCondition, ps_message, pn_line, p_otherInfo, ps_messageForOtherInfo) {
	if (pb_bugCondition) {
		if (p_otherInfo!==undefined) console.warn(      ps_messageForOtherInfo, p_otherInfo      )
		console.error('%c Bug in funcSug interpreter %c ' + ps_message + ' **at** line ' + pn_line, 'background-color: #ffb0b0; color: #800000')
		throw '-- END OF BUG --'
		//~ throw 'Bug: ' + ps_message + ' **at** line ' + pn_line
	}
}

function $__ErrorChecking(pFrameOrCode, pb_errorCondition, ps_message, p_otherInfo, ps_messageForOtherInfo) {
	if (pb_errorCondition) {
		if (p_otherInfo!==undefined) console.warn(      ps_messageForOtherInfo, p_otherInfo      )
		const lExpr_code = (pFrameOrCode.constructor===Frame) ? pFrameOrCode.code : pFrameOrCode
		console.error('Error (funcSug): %c' + ps_message + '%c --IN-- %c' + expressionToString(lExpr_code), 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue')
		throw '-- END OF ERROR --'
		//~ throw 'Error (prog): ' + ps_message + ' --IN--' + expressionToString(lExpr_code)
	}
}

function locationToString(loc) {
	const oldStartLine = loc.start.line
	const oldEndLine = loc.end.line
	const startSource = (f_location) ? f_location(loc.start.line).source : loc.source
	const startLine = (f_location) ? f_location(loc.start.line).line : loc.start.line
	const endSource = (f_location) ? f_location(loc.end.line).source : loc.source
	const endLine = (f_location) ? f_location(loc.end.line).line : loc.end.line
	return 'source ' + startSource + ', line ' + startLine + ' column ' + loc.start.column + '%c to %csource ' + endSource + ', line ' + endLine + ' column ' + loc.end.column
}

function expressionToString(expr) {
	return ' "... ' + expr.text + ' ..."%c --AT--> %c' + locationToString(expr.location)
}

//===================================================================================================
//
// Utils
//
//===================================================================================================
//===================================================================================================

function cartesianProduct(...p_arrays) { // inspired by https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
	if (p_arrays.length==0) return [[]]
	if (p_arrays.length==1) return p_arrays[0].map(elt=>[elt])
	return p_arrays.reduce(
		(previousResult, currentArray) => previousResult.flatMap(
			previousResultElt => currentArray.map(
				currentArrayElt => [previousResultElt, currentArrayElt].flat()
			)
		)
	)
}

//===================================================================================================
//
// variables
//
//===================================================================================================
//===================================================================================================

function makeNewDetachedNamespace(pFrame) {
	const l_namespace = new Map()
	l_namespace.frame = pFrame
	namespaceSet.add(l_namespace)
	return l_namespace
}

function makeNewAttachedNamespace(pFrame) {
	;;     $$$__BugChecking(pFrame.namespace!==undefined, 'pFrame.namespace already set', new Error().lineNumber)
	pFrame.namespace = makeNewDetachedNamespace(pFrame)
	pFrame.namespace.attached = true
}

function getNamespace(pFrame, label) {
	;;     $$$__BugChecking(pFrame===undefined, 'pFrame===undefined', new Error().lineNumber)
	if ( pFrame.namespace!==undefined && pFrame.namespace.has(label) ) return pFrame.namespace
	if ( pFrame.historicParent ) return getNamespace(pFrame.namespaceParent || pFrame.historicParent, label)
}

function getLivebox(pFrame, label) {
	const l_namespace = getNamespace(pFrame, label)
	return l_namespace.get(label)
}

function Livebox(p_namespace, p_label, pb_split) {
	this.lbNamespace = p_namespace
	this.lbLabel = p_label
	this.lb_split = pb_split
	this.precBip = false
	this.precBeep = false
	this.currBip = false
	this.currBeep = false
	this.precMultival = []
	this.currMultival = []
}

Livebox.prototype.getMultival = function() {
	return this.precMultival
}

function getCommonStart(ps_text1, ps_text2) {
	let i = 0
	while (ps_text1.charAt(i) === ps_text2.charAt(i) && i < ps_text1.length) i += 1
	return ps_text1.slice(0,i)
}

Livebox.prototype.setval = function(pFrame, val, pb_multiple) {
	this.currBip = true
	this.currBeep = true
	// delete values in direct line
	for (const otherVal of [...this.currMultival]) {
		//~ const lb_specialVariable = typeof this.lbLabel === 'string' && this.lbLabel.charAt(0) === '*'
		const lb_specialVariable = this.lb_split
		let ls_common
		if (lb_specialVariable) {
			//~ if ( isPrecedingFrame(otherVal.frame, pFrame) ) {
			ls_common = getCommonStart(otherVal.frame.pathOfExecution, pFrame.pathOfExecution)
			while (['0','1','2','3','4','5','6','7','8','9'].includes(ls_common.charAt(ls_common.length - 1))) {
				ls_common = ls_common.slice(0,-1)
			}
		}
		if ( !lb_specialVariable || ls_common.charAt(ls_common.length - 1) == ';') {
			const l_otherValIndex = this.currMultival.indexOf(otherVal)
			this.currMultival.splice(l_otherValIndex, 1)
		}
	}
	// add new val
	if (pb_multiple) {
		for (const valElt of val) {
			this.currMultival.push({frame:pFrame, val:valElt})
		}
	} else {
		this.currMultival.push({frame:pFrame, val:val})
	}
}

function makeNewVariable(pFrame, p_label, pb_split) {
	if (pFrame.namespace===undefined) makeNewAttachedNamespace(pFrame)
	;;     $$$__BugChecking(pFrame.namespace.has( p_label ), 'variable already defined', new Error().lineNumber, [pFrame, p_label])
	pFrame.namespace.set( p_label, new Livebox(pFrame.namespace, p_label, pb_split) )
}

function variableExists(pFrame, p_label) {
	if (pFrame.namespace===undefined) return false
	return pFrame.namespace.has( p_label )
}

//===================================================================================================
//
// Desc instruction
//
//===================================================================================================
//===================================================================================================

const gDict_instructions = {
	
	lambda: { // lambda <paramExpression> <expressionToExecute>
		nbArg:2,
		exec: function(pFrame, p_content) {
			//~ ;;     $__ErrorChecking(pFrame, p_content[1].type !== 'expression', 'parameters not a list')
			;;     $__ErrorChecking(pFrame, p_content[2].type !== 'expression', 'body not an expression')
			//~ ;;     $__ErrorChecking(pFrame, p_content[1].content.some(elt=>(elt.type !== 'identifier')), 'some parameter is not an identifier')
			pFrame.toReturn_multival.push({type: 'lambda', frame:pFrame, param:p_content[1], body:p_content[2]})
			pFrame.terminated = true
		}
	},
	//===========================================================
	
	foreach: { // foreach <variable> <expressionToExecute>
		nbArg:2,
		exec: function(pFrame, p_content) {
			const lPARAM_variable = p_content[1]
			const lPARAM_expressionToExecute = p_content[2]
			;;     $__ErrorChecking(pFrame, p_content[2].type !== 'expression', 'expressionToExecute not an expression')
			
			if (pFrame.instrPointer==1) {
				pFrame.addChild(lPARAM_variable, 'foreachVariable')
			} else if (pFrame.instrPointer==2) {
				const l_argsLabel = pFrame.childReturnedMultivals.foreachVariable
				;;     $__ErrorChecking(pFrame, l_argsLabel.length>1, 'multiple foreach-ed variable')
				for (const label of l_argsLabel) {
					const l_namespace = getNamespace(pFrame, label)
					;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'undefined foreach-ed variable')
					const l_livebox = l_namespace.get(label)
					const l_multival = l_livebox.getMultival()
					
					// exec
					//==========
					let ln_valCnt = 0
					for (const val of l_multival) {
						const l_childFrame = pFrame.addChild(lPARAM_expressionToExecute, 'expressionToExecute'+ln_valCnt)
						l_childFrame.injectParametersWithValues(
							[new Expression('identifier', label, label)],
							[[val]],
							{frame:pFrame, foreach: true}
						)
						l_childFrame.injectParametersWithValues(
							[new Expression('identifier', label+'_N', label+'_N')],
							[[ln_valCnt]],
							{frame:pFrame, foreach: true}
						)
						ln_valCnt += 1
					}
					pFrame.valCnt = ln_valCnt
				}
			} else {
				for (const key in pFrame.childReturnedMultivals) {
					if (key.startsWith('expressionToExecute')) {
						pFrame.toReturn_multival.push(...pFrame.childReturnedMultivals[key])
					}
				}
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	foreachIn: { // foreachIn <variable> <multival <expressionToExecute>
		nbArg:3,
		exec: function(pFrame, p_content) {
			const lPARAM_variable = p_content[1]
			const lPARAM_multival = p_content[2]
			const lPARAM_expressionToExecute = p_content[3]
			;;     $__ErrorChecking(pFrame, lPARAM_expressionToExecute.type !== 'expression', 'expressionToExecute not an expression')
			
			if (pFrame.instrPointer==1) {
				pFrame.addChild(lPARAM_variable, 'foreachVariable')
				pFrame.addChild(lPARAM_multival, 'multival')
			} else if (pFrame.instrPointer==2) {
				const l_argsLabel = pFrame.childReturnedMultivals.foreachVariable
				const l_multival = pFrame.childReturnedMultivals.multival
				//~ const label = lPARAM_variable.content
				for (const label of l_argsLabel) {
					
					// exec
					//==========
					let ln_valCnt = 0
					for (const val of l_multival) {
						const l_childFrame = pFrame.addChild(lPARAM_expressionToExecute, 'expressionToExecute'+ln_valCnt)
						l_childFrame.injectParametersWithValues(
							[new Expression('identifier', label, label)],
							[[val]],
							{frame:pFrame, foreach: true}
						)
						l_childFrame.injectParametersWithValues(
							[new Expression('identifier', label+'_N', label+'_N')],
							[[ln_valCnt]],
							{frame:pFrame, foreach: true}
						)
						ln_valCnt += 1
					}
					pFrame.valCnt = ln_valCnt
				}
			} else {
				for (const key in pFrame.childReturnedMultivals) {
					if (key.startsWith('expressionToExecute')) {
						pFrame.toReturn_multival.push(...pFrame.childReturnedMultivals[key])
					}
				}
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	call: { // call <function> <param> ... <param>
		nbArg: (n=> (n>=1) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				pFrame.addChild(p_content[1], 'calledFunction')
			} else if (pFrame.instrPointer==2) {
				pFrame.lambda = pFrame.childReturnedMultivals.calledFunction
				;;     $__ErrorChecking(pFrame, pFrame.lambda.length!==1, 'multiple lambdas')
				;;     $__ErrorChecking(pFrame, pFrame.lambda.some(elt=>(elt.type!=='lambda')), 'not lambda', pFrame.lambda)
				;;     $__ErrorChecking(pFrame, typeof pFrame.lambda[0].param.content !== 'string' && pFrame.lambda.some(elt=>   (   elt.param.content.length !== p_content.length-2   )   ), 'arguments number differs from parameters number')
				const l_params = pFrame.lambda[0].param.content
				if (p_content.length==3 && p_content[2].content[0] == '*') {
					// spread syntax
					
				} else {
					for (let i=2;i<=p_content.length-1;i++) {
						;;     $$$__BugChecking(p_content[i]===undefined, 'p_content[i]===undefined', new Error().lineNumber)
						//~ if(l_params[i-2][0] !== '_') pFrame.addChild(p_content[i], 'param' + (i-1))
						if (
							typeof l_params === 'string' && l_params[0] !== '_' || typeof l_params !== 'string' && l_params[i-2].content[0] !== '_'
						) {
							pFrame.addChild(p_content[i], 'param' + (i-1))
						}
					}
				}
			} else if (pFrame.instrPointer==3) {
				
				// get args
				//==========
				const l_params = pFrame.lambda[0].param.content
				const l_argsResults = []
				let cpt = 0
				for (let i=1;i<p_content.length-1;i++) {
					//~ l_argsResults[i-1] = (l_params[i-1].content[0] !== '_') ? pFrame.childReturnedMultivals['param'+i] : [p_content[i+1]]
					l_argsResults[i-1] = (
						typeof l_params === 'string' && l_params[0] !== '_' || typeof l_params !== 'string' && l_params[i-1].content[0] !== '_'
					) ? pFrame.childReturnedMultivals['param'+i] : [p_content[i+1]]
					cpt += 1
				}
				
				// exec
				//==========
				pFrame.addChild(pFrame.lambda[0].body, 'bodyToExecute')
				pFrame.injectParametersWithValues(pFrame.lambda[0].param.content, l_argsResults, pFrame.lambda[0])
			} else {
				pFrame.toReturn_multival = pFrame.childReturnedMultivals.bodyToExecute
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	ext: { // ext <inputExpression> <jsStringToExecute> <outputExpression> [<jsStringForCancellation>] [<jsStringForResume>]
		nbArg: (n=> (2<=n && n<=5) ),
		exec: function(pFrame, p_content) {
			const lPARAM_inputExpression = p_content[1]
			const lPARAM_jsStringToExecute = p_content[2]
			const lPARAM_outputExpression = p_content[3]
			const ls_jsStringForCancellation = (p_content.length>=5) ? p_content[4].content : ''
			const ls_jsStringForResume = (p_content.length>=6) ? p_content[5].content : ''
			const l_inputContent = lPARAM_inputExpression.content
			
			if (pFrame.instrPointer==1) {
				// input
				//------
				;;     $__ErrorChecking(pFrame, lPARAM_inputExpression.type!=='expression', 'inputExpression not an expression')
				for (let i=0;i<l_inputContent.length;i++) {
					;;     $$$__BugChecking(l_inputContent[i]===undefined, 'l_inputContent[i]===undefined', new Error().lineNumber)
					const lExpr_inputProg = new Expression('expression', [
						new Expression('identifier', 'get', 'get'),
						l_inputContent[i]
					], '.get ' + l_inputContent[i].content)
					lExpr_inputProg.location = pFrame.code.location
					pFrame.addChild(lExpr_inputProg, 'input' + i)
				}
				// jsStringToExecute
				//------------------
				pFrame.addChild(lPARAM_jsStringToExecute, 'jsStringToExecute')
				// outputExpression
				//-----------------
				if (lPARAM_outputExpression) pFrame.addChild(lPARAM_outputExpression, 'outputExpression')
			} else {
				// get input
				//==========
				const l_argsResults = []
				for (let i=0;i<l_inputContent.length;i++) {
					l_argsResults[i] = pFrame.childReturnedMultivals['input' + i]
				}
				const l_argOutput = pFrame.childReturnedMultivals.outputExpression
				;;     $__ErrorChecking(pFrame, l_argOutput?.length>1, 'multiple output')
				const l_theCombinations = cartesianProduct(...l_argsResults)
				
				// get jsStringToExecute
				//======================
				const l_arg_jsStringToExecute = pFrame.childReturnedMultivals.jsStringToExecute
				;;     $__ErrorChecking(pFrame, l_arg_jsStringToExecute?.length>1, 'multiple jsStringToExecute')
				
				// output
				//========
				const l_outputLabel = l_argOutput?.[0]
				const l_namespace = getNamespace(pFrame, l_outputLabel)
				;;     $__ErrorChecking(pFrame, l_outputLabel!==undefined && l_namespace===undefined, 'undefined output variable ' + l_outputLabel)
				const l_outputLivebox = (l_outputLabel) ? l_namespace.get(l_outputLabel) : undefined
				if (l_outputLabel) l_namespace.set( l_outputLivebox, new Livebox(l_namespace, l_outputLabel) )
				
				// replace in jsStringToExecute
				//=============================
				let ls_jsStringToExecute = `
					"use strict"
					const output=arguments[0]
					const error=arguments[1]
					const SAVES=arguments[2]
					const goAssign=arguments[3]
					const goBreak=arguments[3]
					const goBip=arguments[3]
					const sugAssign=arguments[3]
					const sugBreak=arguments[3]
					const sugBip=arguments[3]
				`
				let cptArg = 4
				for (const vari of l_inputContent) {
					ls_jsStringToExecute += 'const ' + vari.content + '=arguments[' + cptArg + ']\n'
					cptArg += 1
				}
				ls_jsStringToExecute += l_arg_jsStringToExecute[0]
				//~ ls_jsStringToExecute += '\n//# sourceURL=ext' +  + '.js'
				
				// cancellation preparation
				//=========================
				const lList_saveExternals=[]
				const l_cancelObj={
					externalObjects: lList_saveExternals,
					pathOfExecution: pFrame.pathOfExecution,
					execCancel: ls_jsStringForCancellation,
					execPause: ls_jsStringForCancellation,
					execResume: ls_jsStringForResume,
					code: pFrame.code
				}
				if(ls_jsStringForCancellation !== '') cancellationSet.add(l_cancelObj)
				
				// exec
				//======
				let promises = []
				for (const argmts of l_theCombinations) {
					const lFunction = new Function(ls_jsStringToExecute)
					lFunction.location = pFrame.code.location
					promises.push(
						new Promise(
							//~ (resolve,reject) => {       (new Function(ls_jsStringToExecute))(resolve,reject,lList_saveExternals,prep_goAssign(pFrame),...argmts)    }
							(resolve,reject) => {       lFunction(resolve,reject,lList_saveExternals,prep_goAssign(pFrame),...argmts)    }
						)
					)
					promises[promises.length-1].catch(err=>{
						console.warn('Text where Error is', ls_jsStringToExecute)
						console.error('Error (Js in funcSug): %c' + '"ext" instruction' + '%c --IN-- %c' + expressionToString(pFrame.code), 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue')
						throw err
					})
					promises[promises.length-1].then(res => {
						l_outputLivebox.currMultival.push({frame:pFrame, val:res})
						l_outputLivebox.precMultival.push(res) // useful ?
						runBurst()
					}).catch(err=>{
						console.error('javascript ERROR: ' + expressionToString(lPARAM_jsStringToExecute), 'color: #008000')
						console.error(err)
					})
				}
				Promise.all(promises).then(res => {
					l_outputLivebox.currBip = true // useful ?
					l_outputLivebox.currBeep = true // useful ?
					l_outputLivebox.precBip = true
					l_outputLivebox.precBeep = true
					if(ls_jsStringForCancellation !== '') cancellationSet.delete(l_cancelObj)
					runBurst()
				}).catch(err=>{
						console.error('javascript ERROR: ' + expressionToString(lPARAM_jsStringToExecute), 'color: #008000')
						console.error(err)
				})
				pFrame.toReturn_multival = []
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	short: { // short <inputExpression> <jsStringToExecute>
		nbArg: 2,
		exec: function(pFrame, p_content) {
			const lPARAM_inputExpression = p_content[1]
			const lPARAM_jsStringToExecute = p_content[2]
			const l_inputContent = lPARAM_inputExpression.content
			
			if (pFrame.instrPointer==1) {
				// input
				//------
				;;     $__ErrorChecking(pFrame, lPARAM_inputExpression.type!=='expression', 'inputExpression not an expression')
				for (let i=0;i<l_inputContent.length;i++) {
					;;     $$$__BugChecking(l_inputContent[i]===undefined, 'l_inputContent[i]===undefined', new Error().lineNumber)
					const lExpr_inputProg = new Expression('expression', [
						new Expression('identifier', 'get', 'get'),
						l_inputContent[i]
					], '.get ' + l_inputContent[i].content)
					lExpr_inputProg.location = pFrame.code.location
					pFrame.addChild(lExpr_inputProg, 'input' + i)
				}
				// jsStringToExecute
				//------------------
				pFrame.addChild(lPARAM_jsStringToExecute, 'jsStringToExecute')
			} else {
				// get input
				//==========
				const l_argsResults = []
				for (let i=0;i<l_inputContent.length;i++) {
					l_argsResults[i] = pFrame.childReturnedMultivals['input' + i]
				}
				const l_theCombinations = cartesianProduct(...l_argsResults)
				
				// get jsStringToExecute
				//======================
				const l_arg_jsStringToExecute = pFrame.childReturnedMultivals.jsStringToExecute
				;;     $__ErrorChecking(pFrame, l_arg_jsStringToExecute?.length>1, 'multiple jsStringToExecute')
				
				// replace in jsStringToExecute
				//=============================
				let ls_jsStringToExecute = `
					"use strict"
					function v(elt) {return elt.baseVal.value}
				`
				let cptArg = 0
				for (const vari of l_inputContent) {
					ls_jsStringToExecute += 'const ' + vari.content + '=arguments[' + cptArg + ']\n'
					cptArg += 1
				}
				ls_jsStringToExecute += l_arg_jsStringToExecute[0]
				
				// exec
				//======
				pFrame.toReturn_multival = []
				for (const argmts of l_theCombinations) {
					try {
						pFrame.toReturn_multival.push(   (new Function(ls_jsStringToExecute))(...argmts)   )
					} catch (err) {
						console.warn('Text where Error is', ls_jsStringToExecute)
						console.error('Error (Js in funcSug): %c' + '"short" instruction' + '%c --IN-- %c' + expressionToString(pFrame.code), 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue')
						throw err
					}
				}
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	continuous: { // continuous <type> <key> <jsStringToExecute>
		nbArg: 3,
		exec: function(pFrame, p_content) {
			const lPARAM_type = p_content[1]
			const lPARAM_key = p_content[2]
			const lPARAM_jsStringToExecute = p_content[3]
			
			if (pFrame.instrPointer==1) {
				;;     $__ErrorChecking(pFrame, lPARAM_type.type!=='identifier', 'lPARAM_type not an identifier', lPARAM_type)
				// key
				//------
				;;     $__ErrorChecking(pFrame, lPARAM_key.type!=='identifier', 'lPARAM_key not an identifier', lPARAM_type)
				const lExpr_key = new Expression('expression', [
					new Expression('identifier', 'get', 'get'),
					lPARAM_key
				], '.get ' + lPARAM_key.content)
				lExpr_key.location = pFrame.code.location
				pFrame.addChild(lExpr_key, 'key')
				
				// jsStringToExecute
				//------------------
				pFrame.addChild(lPARAM_jsStringToExecute, 'jsStringToExecute')
			} else if (pFrame.instrPointer==2) {
				// get key
				//==========
				const l_arg_key = pFrame.childReturnedMultivals.key
				;;     $__ErrorChecking(pFrame, l_arg_key?.length>1, 'continuous: multiple key')
				
				// get jsStringToExecute
				//======================
				const l_arg_jsStringToExecute = pFrame.childReturnedMultivals.jsStringToExecute
				;;     $__ErrorChecking(pFrame, l_arg_jsStringToExecute?.length>1, 'continuous: multiple jsStringToExecute')
				
				// replace in jsStringToExecute
				//=============================
				let ls_jsStringToExecute = `
					"use strict"
					function v(elt) {return elt.baseVal.value}
				`
				ls_jsStringToExecute += gs_prepContinuous
				ls_jsStringToExecute += ';const ' + lPARAM_key.content + '=arguments[0]\n'
				ls_jsStringToExecute += 'const delta=arguments[1]\n'
				if (lPARAM_type.content === 'send') ls_jsStringToExecute += 'const send=arguments[2]\n'
				if (lPARAM_type.content === 'adapt') ls_jsStringToExecute += 'const events=arguments[2]\nconst goAssign=arguments[3]\nconst goBreak=arguments[3]\nconst goBip=arguments[3]\nconst sugAssign=arguments[3]\nconst sugBreak=arguments[3]\nconst sugBip=arguments[3]\n'
				ls_jsStringToExecute += l_arg_jsStringToExecute[0]
				
				// cancellation preparation
				//=========================
				const l_cancelObj={
					externalObjects: 'continuous',
					pathOfExecution: pFrame.pathOfExecution,
					type: lPARAM_type.content,
					key: pFrame.childReturnedMultivals.key[0]
				}
				cancellationSet.add(l_cancelObj)
				
				// exec
				//======
				try {
					addContinuousAction(
						lPARAM_type.content,
						pFrame.childReturnedMultivals.key[0],
						new Function(ls_jsStringToExecute),
						pFrame,
					)
				} catch(err) {
					//~ console.warn('code text where the error is:', ls_jsStringToExecute)
					console.error('Error (Js in funcSug): %c' + '"continuous" instruction' + '%c --IN-- %c' + expressionToString(pFrame.code), 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue')
					throw err
				}
				pFrame.toReturn_multival = []
				//~ pFrame.terminated = true
				pFrame.awake = false
			} else {
				pFrame.awake = false
			}
		}
	},
	//===========================================================
	
	setDebug: { // setDebug <level>
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const val of pFrame.childReturnedMultivals.arg1) {
				g_debug = val
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	awaitForever: { // awaitForever
		nbArg:0,
		exec: function(pFrame, p_content) {
			pFrame.awake = false
		}
	},
	//===========================================================
	
	await: { // await <variable> <type>
		nbArg:2,
		exec: function(pFrame, p_content) {
			const lPARAM_variable = p_content[1]
			const lPARAM_type = p_content[2]
			
			if (pFrame.instrPointer==1) {
				pFrame.addChild(lPARAM_variable, 'awaitedVariable')
			} else {
				const l_argsLabel = pFrame.childReturnedMultivals.awaitedVariable
				;;     $__ErrorChecking(pFrame, l_argsLabel.length>1, 'multiple awaited variable')
				for (const label of l_argsLabel) {
					const l_namespace = getNamespace(pFrame, label)
					;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'undefined awaited variable')
					const l_livebox = l_namespace.get(label)
					if (l_livebox.precBip && lPARAM_type.content=='bip') {
						pFrame.toReturn_multival.push(...l_livebox.getMultival())
						pFrame.awake = true
					} else if (l_livebox.precBeep && lPARAM_type.content=='beep') {
						pFrame.toReturn_multival.push(...l_livebox.getMultival())
						l_livebox.currBeep = false
						pFrame.awake = true
					} else {
						pFrame.awake = false
					}
					if (pFrame.awake) pFrame.terminated = true
				}
			}
		}
	},
	//===========================================================
	
	awaitInNamespace: { // await <namespace> <variable> <type>
		nbArg:3,
		exec: function(pFrame, p_content) {
			const lPARAM_namespace = p_content[1]
			const lPARAM_variable = p_content[2]
			const lPARAM_type = p_content[3]
			
			if (pFrame.instrPointer==1) {
				pFrame.addChild(lPARAM_namespace, 'namespace')
				pFrame.addChild(lPARAM_variable, 'awaitedVariable')
			} else {
				const l_argsNamespace = pFrame.childReturnedMultivals.namespace
				const l_argsLabel = pFrame.childReturnedMultivals.awaitedVariable
				;;     $__ErrorChecking(pFrame, l_argsNamespace.length>1, 'multiple namespace (awaitNamespace)')
				;;     $__ErrorChecking(pFrame, l_argsLabel.length>1, 'multiple awaited variable')
				for (const label of l_argsLabel) {
					const l_namespace = l_argsNamespace[0]
					;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'undefined awaited variable')
					const l_livebox = l_namespace.get(label)
					if (l_livebox === undefined) {
						pFrame.awake = false
					} else if (l_livebox.precBip && lPARAM_type.content=='bip') {
						pFrame.toReturn_multival.push(...l_livebox.getMultival())
						pFrame.awake = true
					} else if (l_livebox.precBeep && lPARAM_type.content=='beep') {
						pFrame.toReturn_multival.push(...l_livebox.getMultival())
						l_livebox.currBeep = false
						pFrame.awake = true
					} else {
						pFrame.awake = false
					}
					if (pFrame.awake) pFrame.terminated = true
				}
			}
		}
	},
	//===========================================================
	
	awaitBool: { // 'awaitBool' <condition>
		nbArg:1,
		exec: function(pFrame, p_content) {
			let lastResult
			if (pFrame.instrPointer%2==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				pFrame.addChild(p_content[1], 'awaitedExpression')
			} else {
				const l_firstargResult = pFrame.childReturnedMultivals.awaitedExpression
				const lb_thereIsTrue = l_firstargResult.some(x=>x)
				if (lb_thereIsTrue) {
					pFrame.awake = true
				} else {
					pFrame.awake = false
				}
				if (pFrame.awake) pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	prepContinuous: { // 'prepContinuous' <functionsDefinition>
		nbArg:1,
		exec: function(pFrame, p_content) {
			;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
			gs_prepContinuous += p_content[1].content
			pFrame.terminated = true
		}
	},
	//===========================================================
	
	print: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const val of pFrame.childReturnedMultivals.arg1) {
				console.log(val)
			}
			if (pFrame.childReturnedMultivals.arg1.length === 0) console.log('No value')
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	Namespace: {
		nbArg:0,
		postExec: function(pFrame, p_content) {
			const lMap_newNamespace = makeNewDetachedNamespace(pFrame)
			pFrame.toReturn_multival = [lMap_newNamespace]
		}
	},
	//===========================================================
	
	combineMicrostep: {
		nbArg:0,
		postExec: function(pFrame, p_content) {
			timeout0 = false
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	separateMicrostep: {
		nbArg:0,
		postExec: function(pFrame, p_content) {
			timeout0 = true
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	'var': {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, variableExists(pFrame.parent, label), 'variable already exists in this namespace', label)
				variableExists(pFrame.parent, label)
				makeNewVariable(pFrame.parent, label)
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	'varmul': {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, variableExists(pFrame.parent, label), 'variable already exists in this namespace', label)
				variableExists(pFrame.parent, label)
				makeNewVariable(pFrame.parent, label, true)
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	freeze: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'freeze underscore variable "' + label + '"')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'freeze undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				
				frozenLiveboxSet.add(l_livebox)
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	unfreeze: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'unfreeze underscore variable "' + label + '"')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'unfreeze undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				
				frozenLiveboxSet.delete(l_livebox)
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	next: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'next underscore variable "' + label + '"')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'next undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				
				l_livebox.precMultival = l_livebox.currMultival.map(elt=>elt.val)
				l_livebox.precBip = l_livebox.currBip
				l_livebox.precBeep = l_livebox.currBeep
				l_livebox.currBip = false
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	aggregsum: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'get underscore variable (aggregsum) "' + label + '"')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'aggregsum undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				
				l_livebox.setval(pFrame, l_livebox.getMultival().reduce((x, y) => x+y, 0))
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	aggregprod: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'get underscore variable (aggregprod) "' + label + '"')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'aggregprod undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				
				l_livebox.setval(pFrame, l_livebox.getMultival().reduce((x, y) => x*y, 1))
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	allEqual: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const result = pFrame.childReturnedMultivals.arg1.every( (value, index, arr) => {
				if (index == arr.length - 1) return true
				return value == arr[index+1]
			})
			pFrame.toReturn_multival.push(result)
		}
	},
	//===========================================================
	
	get: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' && label.slice(-2)!=='_N' , 'get underscore variable "' + label + '"')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'get undefined variable "' + label + '"', pFrame)
				const l_livebox = l_namespace.get(label)
				// get value
				//----------
				//~ localLog('get', label, l_livebox.getMultival())
				pFrame.toReturn_multival.push(...l_livebox.getMultival())
			}
		}
	},
	//===========================================================
	
	getFromNamespace: { // getFromNamespace <namespace> <var>
		nbArg:2,
		postExec: function(pFrame, p_content) {
			for (const l_namespace of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, ! (l_namespace instanceof Map), 'getFromNamespace not from a namespace', l_namespace, 'l_namespace is: ')
				for (const label of pFrame.childReturnedMultivals.arg2) {
					// get variable
					//-------------
					const l_livebox = l_namespace.get(label)
					//~ ;;     $__ErrorChecking(pFrame, l_livebox === undefined, 'getFromNamespace this label does not exist in this namespace', [l_namespace, label])
					
					// get value
					//----------
					if (l_livebox === undefined) {
						pFrame.toReturn_multival.push(undefined)
					} else {
						pFrame.toReturn_multival.push(...l_livebox.getMultival())
					}
				}
			}
		}
	},
	//===========================================================
	
	evalget: {
		nbArg:1,
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $__ErrorChecking(pFrame, typeof p_content[1].content !== 'string' || p_content[1].content[0]!=='_' , 'evalget non underscore variable "' + p_content[1] + '"')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, p_content[1].content)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'evalget undefined variable "' + p_content[1] + '"')
				const l_livebox = l_namespace.get(p_content[1].content)
				// get value
				//----------
				const l_values = l_livebox.getMultival()
				for (let i=0;i<l_values.length;i++) {
					;;     $$$__BugChecking(l_values[i]===undefined, 'l_values[i]===undefined', new Error().lineNumber)
					pFrame.addChild(l_values[i], 'evaluatedVariable'+i)
				}
			} else {
				// get value
				//----------
				for (const key of Object.keys(pFrame.childReturnedMultivals)) {
					const l_argResult = pFrame.childReturnedMultivals[key]
					pFrame.toReturn_multival.push(...l_argResult)
				}
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	'+': { cumulExec: (x, y) => x + y},
	'-': { operExec: (x, y) => x - y},
	'*': { cumulExec: (x, y) => x * y},
	'/': { operExec: (x, y) => x / y},
	'<': { andExec: (x, y) => x < y},
	'<=': { andExec: (x, y) => x <= y},
	'>': { andExec: (x, y) => x > y},
	'>=': { andExec: (x, y) => x >= y},
	'=': { andExec: (x, y) => x == y},
	'/=': { andExec: (x, y) => x != y},
	'mod': { operExec: (x, y) => x % y},
	'and': { cumulExec: (x, y) => x && y},
	'or': { cumulExec: (x, y) => x || y},
	'not': { singleExec: x => !x },
	'sin': { singleExec: x => Math.sin(x) },
	'cos': { singleExec: x => Math.cos(x) },
	'randomIntBetween': { operExec: (min, max) =>  Math.floor( (max-min+1)*Math.random()+min )  },
	'shuffle': { singleExec: x => x.sort(()=>Math.random()-0.5) },
	'lengthOf': { singleExec: x => x.length },
	'typeOf': { singleExec: x => (typeof x) },
	'isString': { singleExec: x => (typeof x === 'string') },
	'getFromObject': { operExec: (x, y) => x[y] },
	'setToObject': { operExec3: (x, y, z) => (x[y] = z) },
	//===========================================================
	
	'notCancellable': {
		singleExec: x => x,
		canc: function(pFrame) {},
	},
	//===========================================================
	
	bip: { // generate(evt)
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			for (const label of l_firstargResult) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'bip undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				l_livebox.currBip = true
				l_livebox.currBeep = true
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	isBip: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			for (const label of l_firstargResult) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'isBip undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				pFrame.toReturn_multival.push(l_livebox.precBip)
			}
		}
	},
	//===========================================================
	
	listToPar: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			pFrame.toReturn_multival.push(...l_firstargResult[0])
		}
	},
	//===========================================================
	
	parToList: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			pFrame.toReturn_multival = [l_firstargResult]
		}
	},
	//===========================================================
	
	first: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			pFrame.toReturn_multival.push(l_firstargResult[0])
		}
	},
	//===========================================================
	
	rest: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			pFrame.toReturn_multival.push(...l_firstargResult.slice(1))
		}
	},
	//===========================================================
	
	multiplicity: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			pFrame.toReturn_multival.push(l_firstargResult.length)
		}
	},
	//===========================================================
	
	isNovalue: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			pFrame.toReturn_multival = [l_firstargResult.length == 0]
		}
	},
	//===========================================================
	
	valuesFrom: {
		nbArg:3,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			const l_secondargResult = pFrame.childReturnedMultivals.arg2
			;;     $__ErrorChecking(pFrame, l_secondargResult.length != 1 || l_secondargResult[0] != 'butNotFrom', '"butNotFrom" missing')
			const l_thirdResult = pFrame.childReturnedMultivals.arg3
			pFrame.toReturn_multival = l_firstargResult.filter( val => ! l_thirdResult.includes(val) )
		}
	},
	//===========================================================
	
	isBeep: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			for (const label of l_firstargResult) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'isBeep undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				pFrame.toReturn_multival.push(l_livebox.precBeep)
			}
		}
	},
	//===========================================================
	
	stopBeep: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			for (const label of l_firstargResult) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'stopBeep undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				l_livebox.currBeep = false
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	registerFrameFunction: { // registerFrameFunction container label
		nbArg:2,
		postExec: function(pFrame, p_content) {
			frameFunction = {}
			frameFunction.container = pFrame.childReturnedMultivals.arg1[0]
			frameFunction.label = pFrame.childReturnedMultivals.arg2[0]
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	set: { // generate(evt, value)
		nbArg:2,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			const l_secondargResult = pFrame.childReturnedMultivals.arg2
			for (const label of l_firstargResult) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'set undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				l_livebox.setval(pFrame, l_secondargResult, true)
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	break: { // generate(evt, 0)
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			for (const label of l_firstargResult) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'set undefined variable "' + label + '"')
				const l_livebox = l_namespace.get(label)
				l_livebox.setval(pFrame, [0], true)
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	setToNamespace: { // setToNamespace <namespace> <var> <value>
		nbArg:3,
		postExec: function(pFrame, p_content) {
			for (const l_namespace of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, ! (l_namespace instanceof Map), 'getFromNamespace not from a namespace', l_namespace)
				for (const label of pFrame.childReturnedMultivals.arg2) {
					let l_livebox = l_namespace.get(label)
					if (l_livebox === undefined) {
						l_namespace.set( label, new Livebox(l_namespace, label) )
						l_livebox = l_namespace.get(label)
					}
					l_livebox.setval(pFrame, pFrame.childReturnedMultivals.arg3, true)
				}
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	spawn: {
		nbArg:2,
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				for (let i=1;i<=p_content.length-1;i++) {
					;;     $$$__BugChecking(p_content[i]===undefined, 'p_content[i]===undefined', new Error().lineNumber)
				}
				pFrame.addChild(p_content[1], 'arg1')
			} else {
				const l_firstargResult = pFrame.childReturnedMultivals.arg1
				const l_secondargResult = p_content[2]
				for (const label of l_firstargResult) {
					const l_namespace = getNamespace(pFrame, label)
					;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'set undefined variable (for spawn) "' + label + '"')
					const l_livebox = l_namespace.get(label)
					l_livebox.setval(pFrame, {expr:l_secondargResult,frame:pFrame}, false)
				}
				pFrame.toReturn_multival = []
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	disableCancelFor: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			//~ console.warn('---> disableCancelFor')
			for (const label of pFrame.childReturnedMultivals.arg1) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'get undefined variable "' + label + '"', pFrame)
				const l_livebox = l_namespace.get(label)
				l_livebox.setval(pFrame, [{disablecancelFrame: pFrame.parent}], true)
			}
			//~ pFrame.parent.disableCancel = true
			pFrame.terminated = true
		}
	},
	//===========================================================
	
	disableCancel: {
		nbArg:0,
		exec: function(pFrame, p_content) {
			pFrame.parent.disableCancel = true
			pFrame.terminated = true
		}
	},
	//===========================================================
	
	enableCancel: {
		nbArg:0,
		exec: function(pFrame, p_content) {
			pFrame.parent.disableCancel = false
			pFrame.terminated = true
		}
	},
	//===========================================================
	
	par: {
		nbArg: (n=> (n>=0) ),
		activ: function(pFrame) {
			const lPARAM_variable = pFrame.code.multLabel
			const l_namespace = getNamespace(pFrame, lPARAM_variable)
			;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'undefined dynamicAdder variable')
			const l_livebox = l_namespace.get(lPARAM_variable)
			
			if (l_livebox.precBeep) {
				const branches = l_livebox.getMultival()
				for (const branch of branches) {
					pFrame.addChild(branch.expr, 'branch' + pFrame.spanningNumOfChild, branch.frame)
				}
				l_livebox.currBeep = false
			}
		},
		postExec: function(pFrame, p_content) {
			for (const key of Object.keys(pFrame.childReturnedMultivals)) {
				const l_argResult = pFrame.childReturnedMultivals[key]
				//~ localLog('par', i)
				pFrame.toReturn_multival.push(...l_argResult)
			}
		}
	},
	//===========================================================
	
	parRange: { // parRange <min> <max>
		nbArg: 2,
		postExec: function(pFrame, p_content) {
			const l_min = pFrame.childReturnedMultivals.arg1
			const l_max = pFrame.childReturnedMultivals.arg2
			;;     $__ErrorChecking(pFrame, l_min.length>1, 'multiple min')
			;;     $__ErrorChecking(pFrame, l_max.length>1, 'multiple max')
			pFrame.toReturn_multival = [...Array(l_max[0] - l_min[0] + 1).keys()].map(i => i+l_min[0])
		}
	},
	//===========================================================
	
	seq: {
		nbArg: (n=> (n>=1) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer<p_content.length) {
				;;     $$$__BugChecking(p_content[pFrame.instrPointer]===undefined, 'p_content[pFrame.instrPointer]===undefined', new Error().lineNumber)
				pFrame.addChild(p_content[pFrame.instrPointer], 'oneOfSequence')
			} else {
				const l_argResult = pFrame.childReturnedMultivals.oneOfSequence
				pFrame.toReturn_multival.push(...l_argResult)
				pFrame.terminated = true
			}
		},
	},
	//===========================================================
	
	'if': { // 'if' <condition> <expression> 'else' <expression>
		nbArg: (n=> (n==2 || n==4) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				;;     $$$__BugChecking(p_content.length==5 && p_content[3]===undefined, 'p_content[3]===undefined', new Error().lineNumber)
				;;     $__ErrorChecking(pFrame, p_content.length==5 && p_content[3].content != 'else', 'else missing')
				pFrame.addChild(p_content[1], 'ifCondition')
			} else if (pFrame.instrPointer==2) {
				const l_firstargResult = pFrame.childReturnedMultivals.ifCondition
				const lb_thereIsTrue = l_firstargResult.some(x=>x)
				const lb_thereIsFalse = l_firstargResult.some(x=>!x)
				if (lb_thereIsTrue) pFrame.addChild(p_content[2], 'thenBranch')
				if (lb_thereIsFalse && p_content.length==5) pFrame.addChild(p_content[4], 'elseBranch')
			} else {
				if (pFrame.childReturnedMultivals.thenBranch !== undefined) pFrame.toReturn_multival.push(...pFrame.childReturnedMultivals.thenBranch)
				if (pFrame.childReturnedMultivals.elseBranch !== undefined) pFrame.toReturn_multival.push(...pFrame.childReturnedMultivals.elseBranch)
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	'match': { // 'match' <value> 'case' <value1> <expression1> ... 'case' <valueN> <expressionN>
		nbArg: (n=> (n>=4 && n%3==1) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				for (let i=2; i<p_content.length; i+=3) {
					;;     $__ErrorChecking(pFrame, p_content[i].content != 'case', 'case missing')
				}
				pFrame.addChild(p_content[1], 'tomatchValue')
				for (let i=3; i<p_content.length; i+=3) {
					pFrame.addChild(p_content[i], 'matchedValue'+(i/3))
				}
			} else if (pFrame.instrPointer==2) {
				for (let i=3; i<p_content.length; i+=3) {
					//~ if (pFrame.childReturnedMultivals['matchedValue'+(i/3)][0] === pFrame.childReturnedMultivals.tomatchValue[0]) {
					if (pFrame.childReturnedMultivals['matchedValue'+(i/3)].includes(pFrame.childReturnedMultivals.tomatchValue[0])) {
						pFrame.addChild(p_content[i+1], 'expression'+(i/3))
					}
				}
			} else {
				pFrame.toReturn_multival = []
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	'whileTrue': { // 'whileTrue' <expression> // = loop
		nbArg:1,
		exec: function(pFrame, p_content) {
			pFrame.addChild(p_content[1], 'whileBody')
			//~ if (pFrame.instrPointer%2==1) {
				//~ ;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
			//~ } else {
				//~ pFrame.addChild(p_content[1], 'whileBody')
			//~ }
		}
	},
	//===========================================================
	
	'while': { // 'while' <condition> <expression> // = repeatIf
		nbArg:2,
		exec: function(pFrame, p_content) {
			let lastResult
			if (pFrame.instrPointer%2==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				;;     $$$__BugChecking(p_content[2]===undefined, 'p_content[2]===undefined', new Error().lineNumber)
				if (pFrame.instrPointer > 1) {
					lastResult = pFrame.childReturnedMultivals.whileBody
				}
				pFrame.addChild(p_content[1], 'whileCondition')
			} else {
				const l_firstargResult = pFrame.childReturnedMultivals.whileCondition
				const lb_thereIsTrue = l_firstargResult.some(x=>x)
				if (lb_thereIsTrue) {
					pFrame.addChild(p_content[2], 'whileBody')
				} else {
					pFrame.toReturn_multival = [lastResult]
					pFrame.terminated = true
				}
			}
		}
	},
	//===========================================================
	
	'repeat': { // 'repeat' <number> <expression>
		nbArg:2,
		exec: function(pFrame, p_content) {
			let lastResult
			if (pFrame.instrPointer==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				;;     $$$__BugChecking(p_content[2]===undefined, 'p_content[2]===undefined', new Error().lineNumber)
				pFrame.addChild(p_content[1], 'number')
			} else {
				const l_firstargResult = pFrame.childReturnedMultivals.number
				;;     $__ErrorChecking(pFrame, l_firstargResult.length>1, 'multiple repeat number')
				const l_number = l_firstargResult[0]
				if (pFrame.instrPointer<=l_number+1) {
					pFrame.addChild(p_content[2], 'repeatBody')
				} else {
					pFrame.toReturn_multival = []
					pFrame.terminated = true
				}
			}
		}
	},
	//===========================================================
	
	cancellableExec: {
		operExec: (x, y) => y,
		activ: function(pFrame) {
			const lPARAM_variable = pFrame.code.content[1]
			const lPARAM_body = pFrame.code.content[2]
			
			const l_namespace = getNamespace(pFrame, lPARAM_variable.content)
			;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'undefined cancellor variable "' + lPARAM_variable.content + '"', pFrame)
			const l_livebox = l_namespace.get(lPARAM_variable.content)
			if (l_livebox.precBeep) {
				const l_multival = l_livebox.getMultival()
				//~ console.warn('l_multival', l_multival, lPARAM_variable.content, pFrame)
				;;     $__ErrorChecking(pFrame, l_multival.length > 1 && l_multival[0]?.returnValue === undefined, 'multiple value for cancellor variable')
				if (l_multival.length===1 && l_multival[0] === 1) {
					for (const ch of pFrame.childrenList) {
						ch.getInstruction()
						//~ console.warn('pFrame.frameList_notCancellable (restart)', pFrame.frameList_notCancellable)
						ch.instruction.canc(ch, 'Cancel', pFrame.frameList_notCancellable)
					}
					if (pFrame.childrenList.length==0) {
						pFrame.terminated = true
						const l_parent = pFrame.parent
						const l_expr = pFrame.code
						pFrame.removeChildFromLeaflist()
						l_parent.addChild(l_expr, 'restart')
					}
				} else if (l_multival.length===1 && l_multival[0] > 1) {
					this.setPause(pFrame, l_multival[0])
				} else if (l_multival[0]?.disablecancelFrame) {
					pFrame.frameList_notCancellable ||= []
					pFrame.frameList_notCancellable.push(l_multival[0].disablecancelFrame)
					//~ console.warn('pFrame.frameList_notCancellable (constr)', pFrame.frameList_notCancellable)
				} else {
					if (l_multival[0]?.returnValue) {
						pFrame.toReturn_multival = l_multival.map(elt=>elt.returnValue)
					}
					for (const ch of pFrame.childrenList) {
						ch.getInstruction()
						//~ console.warn('pFrame.frameList_notCancellable (breakReturn)', pFrame.frameList_notCancellable)
						ch.instruction.canc(ch, 'Cancel', pFrame.frameList_notCancellable)
					}
					if (pFrame.childrenList.length==0) {
						pFrame.terminated = true
						pFrame.removeChildFromLeaflist()
					}
				}
				l_livebox.currBeep = false
			}
		}
	},
	//===========================================================
	
	quote: {
		nbArg:1,
		exec: function(pFrame, p_content) {
			;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
			pFrame.toReturn_multival.push(p_content[1])
			pFrame.terminated = true
		}
	},
	//===========================================================
	
	execute: {
		nbArg:1,
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				pFrame.addChild(p_content[1], 'expressionToExecute')
			} else if (pFrame.instrPointer==2) {
				const l_firstargResult = pFrame.childReturnedMultivals.expressionToExecute
				for (let i=0; i<l_firstargResult.length; i++) {
					pFrame.addChild(l_firstargResult[i], 'expressionToExecuteB'+i)
				}
				pFrame.exprCnt = l_firstargResult.length
			} else {
				for (let i=0; i<pFrame.exprCnt; i++) {
					const l_argResult = pFrame.childReturnedMultivals['expressionToExecuteB'+i]
					pFrame.toReturn_multival.push(...l_argResult)
				}
				pFrame.terminated = true
			}
		}
	},
}

//~ gDict_instructions.break = gDict_instructions.bip
gDict_instructions.mix = gDict_instructions.par
gDict_instructions.syncjs = gDict_instructions.short
gDict_instructions.js = gDict_instructions.short
gDict_instructions.whileTrueAwaitFrame = gDict_instructions.continuous
gDict_instructions.foreachPar = gDict_instructions.foreach
gDict_instructions.splitMicrostep = gDict_instructions.separateMicrostep
gDict_instructions.isEmpty = gDict_instructions.isNovalue

//===================================================================================================
//
// Instruction management
//
//===================================================================================================
//===================================================================================================

function Instruction(ps_codeWord) {
	if (! gDict_instructions[ps_codeWord]) return undefined
	this.codeWord = ps_codeWord
	this.nbArg = gDict_instructions[ps_codeWord].nbArg
	this.singleExec = gDict_instructions[ps_codeWord].singleExec
	this.operExec = gDict_instructions[ps_codeWord].operExec
	this.operExec3 = gDict_instructions[ps_codeWord].operExec3
	this.cumulExec = gDict_instructions[ps_codeWord].cumulExec
	this.andExec = gDict_instructions[ps_codeWord].andExec
	this.postExec = gDict_instructions[ps_codeWord].postExec
	this.exec = gDict_instructions[ps_codeWord].exec
	this.activ = gDict_instructions[ps_codeWord].activ
	this.canc = gDict_instructions[ps_codeWord].canc
	
	this.setPause = function(pFrame, valPause) {
		switch (valPause) {
			case TOGGLE_PAUSE:
				if (pFrame.suspended) {
					this.setPause(pFrame, RESUME)
				} else {
					this.setPause(pFrame, PAUSE)
				}
				return;
			case PAUSE:
				pFrame.suspended = true
				for (const ch of pFrame.childrenList) {
					ch.getInstruction()
					//~ console.warn('pFrame.frameList_notCancellable (breakReturn)', pFrame.frameList_notCancellable)
					ch.instruction.canc(ch, 'Pause', pFrame.frameList_notCancellable)
				}
				break;
			case RESUME:
				pFrame.suspended = false
				for (const ch of pFrame.childrenList) {
					ch.getInstruction()
					//~ console.warn('pFrame.frameList_notCancellable (breakReturn)', pFrame.frameList_notCancellable)
					ch.instruction.canc(ch, 'Resume', pFrame.frameList_notCancellable)
				}
				break;
		}
		for (const ch of pFrame.childrenList) {
			ch.getInstruction()
			ch.instruction.setPause(ch, valPause)
		}
	}
	
	if (! this.canc) {
		this.canc = function(pFrame, pType, pFrameList_notCancellable) {
			if (pFrame.disableCancel) return
			//~ console.warn('pFrameList_notCancellable (gen)', pFrameList_notCancellable)
			if (pFrameList_notCancellable?.includes(pFrame)) return
			for (const ch of [...pFrame.childrenList]) {
				ch.getInstruction()
				ch.instruction.canc(ch, pType, pFrameList_notCancellable)
			}
			if (pType=='Cancel' && pFrame.code.cancelExpression) {
				const l_namespaceParent = (pFrame?.parent?.code?.content[0]?.content === 'cancellableExec') ? pFrame.parent.parent : pFrame.parent
				mainFrame.addChild(toNotcancellableExpression(pFrame.code.cancelExpression), 'whenCanceled', l_namespaceParent)
			}
			if (pType=='Cancel' && pFrame.childrenList.length==0) {
				pFrame.removeChildFromLeaflist()
			}
			cancellationSet.forEach(
				cancelElt => {
					if (cancelElt.pathOfExecution.startsWith(pFrame.pathOfExecution)) {
						if (cancelElt.externalObjects === 'continuous') {
							delContinuousAction(cancelElt.type, cancelElt.key)
						} else {
							let ls_jsStringToExecute = cancelElt['exec'+pType]
							if (ls_jsStringToExecute != '') {
								ls_jsStringToExecute = `
									"use strict"
									const output=arguments[0]
									const error=arguments[1]
									const SAVE=arguments[2]
									const args=[...arguments]
									args.shift(); args.shift(); args.shift();
								` + ls_jsStringToExecute
								for (const extObj of cancelElt.externalObjects) {
									const lPromise = new Promise(
										(resolve,reject) => {       (new Function(ls_jsStringToExecute))(resolve,reject,extObj)    }
									)
									lPromise.catch(err=>{
										console.warn('Text where Error is', ls_jsStringToExecute)
										console.error('Error (Js in funcSug): %c' + 'Cancellation of fungSug block (deep)' + '%c --IN-- %c' + expressionToString(cancelElt.code), 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue')
										console.error('Error (Js in funcSug): %c' + 'Cancellation of fungSug block (superficial)' + '%c --IN-- %c' + expressionToString(pFrame.code), 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue')
										throw err
									})
								}
							}
						}
						if(pType=='Cancel') cancellationSet.delete(cancelElt)
					}
				}
			)
		}
	}
	
	if (this.singleExec) {
		this.nbArg = 1
		this.postExec = function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			for (const arg1 of l_firstargResult) {
				pFrame.toReturn_multival.push(this.singleExec(arg1))
			}
		}
	}
	
	if (this.operExec) {
		this.nbArg = 2
		this.postExec = function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			const l_secondargResult = pFrame.childReturnedMultivals.arg2
			for (const arg1 of l_firstargResult) {
				for (const arg2 of l_secondargResult) {
					pFrame.toReturn_multival.push(this.operExec(arg1, arg2))
				}
			}
		}
	}
	
	if (this.operExec3) {
		this.nbArg = 3
		this.postExec = function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			const l_secondargResult = pFrame.childReturnedMultivals.arg2
			const l_thirdargResult = pFrame.childReturnedMultivals.arg3
			for (const arg1 of l_firstargResult) {
				for (const arg2 of l_secondargResult) {
					for (const arg3 of l_thirdargResult) {
						pFrame.toReturn_multival.push(this.operExec3(arg1, arg2, arg3))
					}
				}
			}
		}
	}
	
	if (this.cumulExec) {
		this.nbArg = (n=> (n>=2) )
		this.postExec = function(pFrame, p_content) {
			// get args
			//==========
			const l_argsResults = []
			for (let i=0;i<p_content.length-1;i++) {
				l_argsResults[i] = pFrame.childReturnedMultivals['arg'+(i+1)]
			}
			const l_theCombinations = cartesianProduct(...l_argsResults)
			for (const comb of l_theCombinations) {
				pFrame.toReturn_multival.push(
					comb.reduce(
						(previousValue, currentValue) => this.cumulExec(previousValue, currentValue)
					)
				)
			}
		}
	}
	
	if (this.andExec) {
		this.nbArg = (n=> (n>=2) )
		this.postExec = function(pFrame, p_content) {
			// get args
			//==========
			const l_argsResults = []
			for (let i=0;i<p_content.length-1;i++) {
				l_argsResults[i] = pFrame.childReturnedMultivals['arg'+(i+1)]
			}
			const l_theCombinations = cartesianProduct(...l_argsResults)
			for (const comb of l_theCombinations) {
				pFrame.toReturn_multival.push(
					comb.every( (value, index, arr) => {
						if (index == arr.length - 1) return true
						return this.andExec(value, arr[index+1])
					})
				)
			}
		}
	}
	
	if (this.postExec) {
		this.exec = function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				//~ localLog('####debut--', p_content[0].content, p_content[1].text, (p_content[2]!==undefined)?p_content[2].text:' -- ')
				for (let i=1;i<=p_content.length-1;i++) {
					;;     $$$__BugChecking(p_content[i]===undefined, 'p_content[i]===undefined', new Error().lineNumber)
					pFrame.addChild(p_content[i], 'arg' + i)
				}
			} else {
				this.postExec(pFrame, p_content)
				pFrame.terminated = true
				//~ localLog('####fin--', p_content[0].content, p_content[1].text, (p_content[2]!==undefined)?p_content[2].text:' -- ')
			}
		}
	}
}

function toCallExpression(pExpression_oldCode) {
	const lExpression_get = new Expression(
		'expression',
		[
			new Expression('identifier', 'get', 'get'),
			pExpression_oldCode.content[0]
		],
		'get ' + pExpression_oldCode.content[0].content
	)
	lExpression_get.location = pExpression_oldCode.location
	const lExpression = new Expression(
		'expression',
		[
			new Expression('identifier', 'call', 'call'),
			lExpression_get,
			...pExpression_oldCode.content.filter((elt, ind)=>(ind>0))
		],
		pExpression_oldCode.text,
		pExpression_oldCode.exprLabel,
		pExpression_oldCode.cancelExpression
	)
	lExpression.location = pExpression_oldCode.location
	return lExpression
}

function toCancellableExpression(pExpression_oldCode) {
	const lExpression = new Expression(
		'expression',
		[
			new Expression('identifier', 'cancellableExec', 'cancellableExec'),
			new Expression('identifier', pExpression_oldCode.exprLabel, pExpression_oldCode.exprLabel),
			new Expression(pExpression_oldCode.type, pExpression_oldCode.content, pExpression_oldCode.text, null, pExpression_oldCode.cancelExpression)
		],
		pExpression_oldCode.text,
		null,
		//~ pExpression_oldCode.cancelExpression
		null
	)
	lExpression.location = pExpression_oldCode.location
	return lExpression
}

function untilToCancellableExpression(pExpression_oldCode) {
	const lExpression = new Expression(
		'expression',
		[
			new Expression('identifier', 'cancellableExec', 'cancellableExec'),
			pExpression_oldCode.content[3],
			pExpression_oldCode.content[1],
		],
		pExpression_oldCode.text,
		null,
		//~ pExpression_oldCode.cancelExpression
		null
	)
	lExpression.location = pExpression_oldCode.location
	return lExpression
}

function toNotcancellableExpression(pExpression_oldCode) {
	const lExpression = new Expression(
		'expression',
		[
			new Expression('identifier', 'notCancellable', 'notCancellable'),
			new Expression(pExpression_oldCode.type, pExpression_oldCode.content, pExpression_oldCode.text, null, null)
		],
		pExpression_oldCode.text,
		null,
		null
	)
	lExpression.location = pExpression_oldCode.location
	return lExpression
}

function getSeqInsertedForMatch(pExpression) {
	let lArray_contentContent = pExpression.content.map(elt=>elt.content)
	let lb_toInsert = true
	let lIndex_keyword1
	let lIndex_keyword2
	
	lIndex_keyword1 = lArray_contentContent.indexOf('case', 1)
	
	while (lb_toInsert) {
		lIndex_keyword2 = lArray_contentContent.indexOf('case', lIndex_keyword1+1)
		if (lIndex_keyword2 === -1) {
			lIndex_keyword2 = lArray_contentContent.length
			lb_toInsert = false
		}
		
		const lArray_content = pExpression.content.slice(lIndex_keyword1+2, lIndex_keyword2)
		const lExpr_seq = new Expression(
			'expression',
			[
				new Expression('identifier', 'seq', 'seq'),
				...lArray_content,
			],
			'{seq\n' + lArray_content.map(elt=>elt.text).join('\n') + '\n}'
		)
		lExpr_seq.location = pExpression.location
		pExpression.content.splice(lIndex_keyword1+2, lIndex_keyword2 - lIndex_keyword1 -2, lExpr_seq)
		
		lIndex_keyword1 += 3
		lArray_contentContent = pExpression.content.map(elt=>elt.content)
	}
}

function getSeqInserted(pExpression, pn_pos, ps_keyword) {
	if (pn_pos > 0) {
		//~ const lArray_content = [...pExpression.content]
		const lArray_contentContent = pExpression.content.map(elt=>elt.content)
		let lIndex_keyword, lArray_content1, lArray_content2
		
		if (ps_keyword && lArray_contentContent.includes(ps_keyword)) {
			lIndex_keyword = lArray_contentContent.indexOf(ps_keyword)
			lArray_content1 = pExpression.content.slice(pn_pos, lIndex_keyword)
			lArray_content2 = pExpression.content.slice(lIndex_keyword+1)
		} else {
			lArray_content1 = pExpression.content.slice(pn_pos)
		}
		
		//~ for (let i=0; i<pn_pos; i++) lArray_content.shift()
		const lExpr_seq1 = new Expression(
			'expression',
			[
				new Expression('identifier', 'seq', 'seq'),
				...lArray_content1,
			],
			pExpression.text
		)
		const l_rest2 = (! lIndex_keyword) ? [] :[
			pExpression.content[lIndex_keyword],
			new Expression(
				'expression',
				[
					new Expression('identifier', 'seq', 'seq'),
					...lArray_content2
				],
				pExpression.text
			)
		]
		const lExpression = new Expression(
			'expression',
			[
				//~ pExpression.content[0],
				//~ pExpression.content[1],
				...pExpression.content.slice(0, pn_pos),
				lExpr_seq1,
				...l_rest2
			],
			pExpression.text,
			pExpression.exprLabel,
			pExpression.cancelExpression,
		)
		lExpr_seq1.location = pExpression.location
		lExpression.location = pExpression.location
		return lExpression
	}
}

//===================================================================================================
//
// Frame
//
//===================================================================================================
//===================================================================================================

let g_frameSerialNumber = 0

const Frame = function(code) {
	this.serialNumber = g_frameSerialNumber
	g_frameSerialNumber += 1
	this.awake = true
	this.code = code
	this.superInstantNumber = g_superInstantNumber
	this.instrPointer = 1
	this.toReturn_multival = []
	this.childReturnedMultivals = {}
	this.pathOfExecution = ''
}

Frame.prototype.toString = function() {
	if (this.code.type === 'expression') {
		const l_content = this.code.content
		//~ return '[' + l_content.map(e=>e.text).join(' ') + '] instrPointer=' + this.instrPointer + ' / ' + (l_content instanceof Array)
		return '[' + l_content.map(e=>e.text).join(' ') + '] instrPointer=' + this.instrPointer
	} else {
		return this.code.text
	}
}

Frame.prototype.injectParametersWithValues = function(param, args, fct) {
	if (typeof param === 'string' && (param.startsWith('p__') || param.startsWith('__'))) {
		makeNewVariable(this, param)
		const l_namespace = this.namespace
		const l_livebox = l_namespace.get(param)
		l_livebox.currBip = true
		l_livebox.currBeep = true
		l_livebox.currMultival = []
		// set values of args
		//-------------------
		for (let i=0; i<args.length; i++) {
			l_livebox.currMultival.push(...args[i].map(    val => ({frame:this, val:val})    )   )
		}
	} else if (typeof param === 'string') {
		makeNewVariable(this, param)
		const l_namespace = this.namespace
		const l_livebox = l_namespace.get(param)
		const l_freeNamespace = new Map()
		namespaceSet.add(l_freeNamespace)
		// set values of args
		//-------------------
		for (let i=0; i<args.length; i++) {
			const l_internalLivebox = new Livebox(l_freeNamespace, i)
			l_freeNamespace.set(i, l_internalLivebox)
			l_internalLivebox.currBip = true
			l_internalLivebox.currBeep = true
			l_internalLivebox.currMultival = args[i].map(    val => ({frame:this, val:val})    )
		}
		
		// set length
		//-----------
		const l_maxLivebox = new Livebox(l_freeNamespace, 'PARAMLENGTH')
		l_freeNamespace.set('PARAMLENGTH', l_maxLivebox)
		l_maxLivebox.currBip = true
		l_maxLivebox.currBeep = true
		l_maxLivebox.currMultival = [{frame:this, val:args.length}]
		
		// set namespace
		//--------------
		l_livebox.currBip = true
		l_livebox.currBeep = true
		l_livebox.currMultival.push({frame:this, val:l_freeNamespace})
	} else {
		for (const labelIndex in param) {
			const label = param[labelIndex].content
			;;     $__ErrorChecking(fct.frame, ! fct.foreach && ! label.startsWith('p_') && label[0] != '_', "parameters must begin with 'p_' or '_'")
			makeNewVariable(this, label)
			const l_namespace = this.namespace
			const l_livebox = l_namespace.get(label)
			l_livebox.currBip = true
			l_livebox.currBeep = true
			const l_multiVal = args[labelIndex]
			l_livebox.currMultival = l_multiVal.map(    val=>({frame:this, val:val})    )
		}
	}
}

Frame.prototype.addChild = function(expr, reason, namespaceParent) {
	if (expr.type === 'string' || expr.type === 'number' || expr.type === 'identifier') {
		if (expr.content == 'true' && expr.type === 'identifier') expr.content = true
		if (expr.content == 'false' && expr.type === 'identifier') expr.content = false
		this.childReturnedMultivals[reason] = [expr.content]
	} else {
		;;     $$$__BugChecking(expr.type === 'program', 'frame cannot have code of type "program"', new Error().lineNumber)
		const childFrame = new Frame(expr)
		childFrame.reason = reason
		childFrame.namespaceParent = namespaceParent
		childFrame.suspended = this.suspended
		
		condLog(4, '- - - ->new frame', expr.text, reason, childFrame.serialNumber, this.serialNumber)
		
		// globalFrameTree
		//========================
		globalFrameTree.addNode(childFrame, this)
		
		// pathOfExecution
		//========================
		let ls_symb
		if (['seq', 'while', 'mix'].includes(childFrame.parent.code.content[0].content)) {
			ls_symb = ';'
		} else {
			ls_symb = '/'
		}
		
		childFrame.pathOfExecution = childFrame.parent.pathOfExecution + ls_symb + childFrame.spanningChildIndex
		
		// return
		//===================
		return childFrame
	}
}

Frame.prototype.removeChildFromLeaflist = function() {

	condLog(4, '- - - ->frame return', this.code.text, this.toReturn_multival)
	
	// remove namespace
	//------------------
	namespaceSet.delete(this.namespace)
	
	// remove 
	//-----------
	cancellableFrameSet.delete(this)
	dynamicParallelSet.delete(this)
	
	// remove links between frames
	//----------------------------
	if (this.parent) {
		
		// transfer return values
		//-----------------------
		this.parent.childReturnedMultivals[this.reason] = this.toReturn_multival
		
	}
	
	globalFrameTree.removeNode(this)
}

Frame.prototype.getInstruction = function() {
	if (!this.instruction) {
		if (this.code.type === 'expression') {
			const l_content = this.code.content
			
			// put next to last element into the first place if '['
			//======================================================
			if (l_content.length >= 3 && this.code.text[0] === '[') {
				const l_lastToNext = l_content[l_content.length-2]
				l_content.splice(l_content.length-2, 1)
				l_content.unshift(l_lastToNext)
				this.code.text = this.code.text.replace('[', '(')
			}
			
			// get Instruction
			//======================
			if (this.code.content[0]?.content === 'doOnce') {
				;;     $__ErrorChecking(this, this.code.content.length !== 4, 'doOnce: wrong number of arguments')
				;;     $__ErrorChecking(this, this.code.content[2]?.content !== 'until', 'doOnce: "until" is missing')
				this.code = untilToCancellableExpression(this.code)
			}
			
			let lInstruction_firstTry = new Instruction(this.code.content[0].content)
			if (lInstruction_firstTry.nbArg===undefined) lInstruction_firstTry = undefined
			
			if (this.code.exprLabel) {
				this.code = toCancellableExpression(this.code)
			}
			if (this.code.multLabel) {
				dynamicParallelSet.add(this)
			}
			if ( ['foreachIn_select_mult'].includes(this.code.content[0]?.content) ) {
				this.code = getSeqInserted(this.code, 4)
			} else if ( ['foreach_race_mult', 'foreach_select_mult', 'foreachIn'].includes(this.code.content[0]?.content) ) {
				this.code = getSeqInserted(this.code, 3)
			} else if ( ['lambda', 'while', 'foreach', 'foreach_race', 'repeat'].includes(this.code.content[0]?.content) ) {
				this.code = getSeqInserted(this.code, 2)
			} else if (this.code.content[0]?.content === 'whileTrue') {
				this.code = getSeqInserted(this.code, 1)
			} else if (this.code.content[0]?.content === 'if') {
				this.code = getSeqInserted(this.code, 2, 'else')
			} else if (this.code.content[0]?.content === 'match') {
				getSeqInsertedForMatch(this.code)
			}
			if (this.code.content[0].content === 'cancellableExec') {
				cancellableFrameSet.add(this)
			}
			if (lInstruction_firstTry===undefined && l_content[0].type==='identifier') {
				this.code = toCallExpression(this.code)
			}
		}
		
		const l_content = this.code.content
		//~ if (l_content === undefined) localLog(this)
		const lInstruction = new Instruction(l_content[0]?.content)
		
		// verif number of arg
		//====================
		if (typeof l_content !== 'string' && typeof l_content !== 'number') {
			;;     $__ErrorChecking(this, typeof l_content[0].content !== 'string', 'instruction code cannot be multiple')
			;;     $__ErrorChecking(this, typeof lInstruction.nbArg === 'number' && l_content.length !== lInstruction.nbArg+1, 'wrong number of arguments')
			;;     $__ErrorChecking(this, typeof lInstruction.nbArg !== 'number' && ! lInstruction.nbArg(l_content.length-1), 'invalid number of arguments', this)
			
			;;     $$$__BugChecking(! (l_content instanceof Array), 'expression not array', new Error().lineNumber)
			;;     $$$__BugChecking(l_content.length === 0, 'exec empty array', new Error().lineNumber)
			;;     $$$__BugChecking(l_content[0].content === undefined, 'exec undefined instr', new Error().lineNumber)
			
			;;     $__ErrorChecking(this, ! ['identifier'].includes(l_content[0].type), 'cannot execute')
		}
		
		// verif each elt of sequence on its own line
		//============================================
		if (l_content[0].content === 'seq' && ! this.code.seqFunction) {
			let ln_precLine = -1
			let ln_currLine = -1
			let ls_precSource
			let ls_currSource
			let lExpr_prec = null
			for (const expr of l_content) {
				//~ localLog(expr)
				ln_currLine = expr.location.start.line
				ls_currSource = expr.location.source
				//~ localLog(ls_precSource, ls_currSource)
				;;     $__ErrorChecking(lExpr_prec, ln_currLine == ln_precLine && ls_currSource == ls_precSource && expr.content[0]?.text !== 'set', 'two elements of sequence on the same line: "'+lExpr_prec?.text+'" and "'+expr?.text+'"')
				ln_precLine = ln_currLine
				ls_precSource = ls_currSource
				lExpr_prec = expr
			}
		}
		
		this.instruction = lInstruction
	}
}

//===================================================================================================
//
// Tree
//
//===================================================================================================
//===================================================================================================

function Tree(p_root) {
	this.root = p_root
	this.leafList = [p_root]
	this.nodeSet = new Set()
	this.nodeSet.add(p_root)
	
	this.root.level = 0
	this.root.parent = null
	this.root.historicParent = null
	this.root.childrenList = []
	this.root.spanningNumOfChild = 0
	this.root.initialChildIndex = null
	this.root.spanningChildIndex = null
	
	this.addNode = function(p_node, p_parent) {
		;;     $$$__BugChecking(this.nodeSet.has(p_node), 'p_node already in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_node.parent !== undefined, 'p_node already in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_node.childrenList !== undefined, 'p_node already in tree', new Error().lineNumber)
		;;     $$$__BugChecking(! this.nodeSet.has(p_parent), 'p_parent not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_parent.parent === undefined, 'p_parent not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_parent.childrenList === undefined, 'p_parent not in tree', new Error().lineNumber)
		
		// nodeSet
		//--------
		this.nodeSet.add(p_node)
		
		// leafList
		//----------
		const ln_leafParentI = this.leafList.indexOf(p_parent)
		if (ln_leafParentI === -1) {
			;;     $$$__BugChecking(p_parent.childrenList.length === 0, 'p_parent should have been in leafList', new Error().lineNumber)
			// insert
			const l_precedingChild = p_parent.childrenList[p_parent.childrenList.length-1]
			;;     $$$__BugChecking(! this.nodeSet.has(l_precedingChild), 'l_precedingChild not in tree', new Error().lineNumber)
			;;     $$$__BugChecking(l_precedingChild.parent === undefined, 'l_precedingChild not in tree', new Error().lineNumber)
			;;     $$$__BugChecking(l_precedingChild.childrenList === undefined, 'l_precedingChild not in tree', new Error().lineNumber)
			;;     $$$__BugChecking(l_precedingChild === p_node, 'new child should be other', new Error().lineNumber)
			const ln_precedingChildIndex = this.leafList.indexOf(l_precedingChild)
			//~ localLog('l_precedingChild', ln_precedingChildIndex, l_precedingChild, p_node)
			//~ ;;     $$$__BugChecking(ln_precedingChildIndex === -1, 'child should have been in leafList', new Error().lineNumber)
			if (ln_precedingChildIndex === -1) this.leafList.push(p_node) // not ideal FIXME
			else this.leafList.splice(ln_precedingChildIndex+1, 0, p_node)
		} else {
			// replace
			this.leafList.splice(ln_leafParentI, 1, p_node)
		}
		
		// mark node
		//----------
		p_node.level = null
		p_node.parent = null
		p_node.childrenList = []
		p_node.initialChildIndex = null
		p_node.spanningNumOfChild = 0
		p_node.spanningChildIndex = null
		
		// link to parent
		//---------------
		p_node.level = p_parent.level + 1
		p_node.parent = p_parent
		p_node.historicParent = p_parent
		p_node.initialChildIndex = p_parent.childrenList.length
		p_node.spanningChildIndex = p_parent.spanningNumOfChild
		p_parent.spanningNumOfChild += 1 // TODO : BigInt for very long (in time) (>= 100 years) program, BUG, FIXME
		p_parent.childrenList.push(p_node)
	}
	
	this.removeNode = function(p_node) {
		;;     $$$__BugChecking(! this.nodeSet.has(p_node), 'p_node not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_node.parent === undefined, 'p_node not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_node.childrenList === undefined, 'p_node not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_node.childrenList.length !== 0, 'p_node has still children', new Error().lineNumber)
		
		// nodeSet
		//--------
		this.nodeSet.delete(p_node)
		
		// leafList
		//----------
		const ln_leafChildI = this.leafList.indexOf(p_node)

		// remove or, maybe, replace by parent     from leafList
		//-----------------------------------------------------------
		//~ localLog(this)
		;;     $$$__BugChecking(p_node.parent && p_node.parent.childrenList.length == 0, 'childrenList of parent is empty', new Error().lineNumber, p_node)
		if (p_node.parent && p_node.parent.childrenList.length == 1) {
			// replace
			//~ console.log('replace leaf')
			this.leafList.splice(ln_leafChildI, 1, p_node.parent)
		} else {
			// remove
			//~ console.log('remove leaf')
			this.leafList.splice(ln_leafChildI, 1)
		}
		
		// unlink from parent
		//---------------
		//~ localLog(p_node)
		if (p_node != this.root) {
			const ln_childrenI = p_node.parent.childrenList.indexOf(p_node)
			;;     $$$__BugChecking(ln_childrenI === -1, 'child not found', new Error().lineNumber)
			p_node.parent.childrenList.splice(ln_childrenI, 1)
		}
		
		// unmark node
		//----------
		delete p_node.level
		delete p_node.parent
		delete p_node.childrenList
		delete p_node.initialChildIndex
	}
	
	this.someLeafHasPropertyTrue = function(ps_property) {
		return this.leafList.some(elt=>elt[ps_property])
	}

	this.someLeafHasConditionTrue = function(pFunc_condition) {
		//~ console.log('someLeafHasPropertyTrue', this.leafList, ps_property)
		return this.leafList.some(pFunc_condition)
	}

	
	this.setPropertyTrueForAllLeaf = function(ps_property) {
		for (const leaf of this.leafList) {
			leaf[ps_property] = true
		}
	}
}

//===================================================================================================
//
// exec
//
//===================================================================================================
//===================================================================================================

async function runBurst() {
	if (stop) return
	g_superInstantNumber += 1
	//~ localLog('====> SuperInstant:', g_superInstantNumber)
	;;        condLogGroup(1, '====> SuperInstant:', g_superInstantNumber)
	//~ ;;        condLog(1, '-------------')
	
	globalFrameTree.setPropertyTrueForAllLeaf('awake')
	let cpt2 = 0
	let precedent_stillAwake = true
	//~ let stillAwake = globalFrameTree.someLeafHasPropertyTrue('awake' )
	let stillAwake = globalFrameTree.someLeafHasConditionTrue(elt=>! elt.suspended && elt.awake)
	while ( precedent_stillAwake || stillAwake ) {
		cpt2 += 1
		if (cpt2==500 && g_debug > 0) console.warn('!!! soon INFINITE LOOP ?? !!!')
		if (cpt2==1000 && g_debug > 0) {
			console.warn('!!! INFINITE LOOP ?? !!!', globalFrameTree, namespaceSet)
			console.warn(precedent_stillAwake, stillAwake)
			stop = true
			throw 'err'
		}
		// exec 1 microinstant
		//====================
		//~ localLog('------> MicroInstant', cpt2)
		if (! mainFrame.childrenList) break
		;;        condLogGroup(3, '------> MicroInstant', cpt2)
		;;        condLog(3, '                                       -')
		for (const cancellableFrame of cancellableFrameSet) {
			cancellableFrame.getInstruction()
			cancellableFrame.instruction.activ(cancellableFrame)
		}
		for (const dynamicParFrame of dynamicParallelSet) {
			dynamicParFrame.getInstruction()
			dynamicParFrame.instruction.activ(dynamicParFrame)
		}
		for (const leaf of [...globalFrameTree.leafList]) {
			if (leaf.suspended) continue
			leaf.getInstruction()
			leaf.instruction.exec(leaf, leaf.code.content)
			if (leaf.terminated) leaf.removeChildFromLeaflist()
			else leaf.instrPointer += 1
		}
		
		// copy "current" values to "precedent"
		//=====================================
		for (const l_namespace of namespaceSet) {
			for (const l_var of l_namespace.keys()) {
				const l_livebox = l_namespace.get(l_var)
				;;     $$$__BugChecking(! (l_livebox instanceof Livebox), 'l_livebox not a Livebox', new Error().lineNumber, l_livebox, 'l_livebox is:')
				if (! frozenLiveboxSet.has(l_livebox)) {
					l_livebox.precMultival = l_livebox.currMultival.map(elt=>elt.val)
					l_livebox.precBip = l_livebox.currBip
					l_livebox.precBeep = l_livebox.currBeep
					l_livebox.currBip = false
				}
			}
		}
		
		// update continuousAction
		//========================
		let cpt3 = 0
		if (continuousActionNotEmptyAnymore) {
			continuousActionNotEmptyAnymore = false
			const raf_func = function raf_func(timestamp) {
				cpt3 += 1
				const delta = (old_timestamp) ? timestamp - old_timestamp : 0
				const kinds = ['send', 'adapt', 'play', 'emit']
				const thirdParam = [send, continuousEvents, undefined, undefined]
				const fourthParam = [undefined, prep_goAssign, undefined, undefined]
				for (let i=0; i<4; i++) {
					for (const [key, fct_frame] of continuousActionDict[kinds[i]]) {
						try {
							if (!fct_frame.frame.suspended) fct_frame.fct(key, delta, thirdParam[i], fourthParam[i]?.(fct_frame.frame))
						} catch(err) {
							console.error('Error (Js in funcSug): %c' + '"continuous" instruction' + '%c --IN-- %c' + expressionToString(fct_frame.frame.code), 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue')
							throw err
						}
					}
				}
				
				if (!continuousActionEmpty && (g_debug <= 0.5 || cpt3 < 500) && !frameFunction) requestAnimationFrame(raf_func)
				//~ if (!continuousActionEmpty && (g_debug <= 0.5 || cpt3 < 500) && frameFunction) frameFunction.container[frameFunction.label] = raf_func
				//~ if (continuousActionEmpty && cpt3 < 1) requestAnimationFrame(raf_func)
				//~ else localLog('---STOP')
				clearContinuousEvents()
				old_timestamp = timestamp
			}
			if (!frameFunction) requestAnimationFrame(raf_func)
			if (frameFunction) frameFunction.container[frameFunction.label] = raf_func
		}
		
		if (timeout0) await new Promise( resolve => {setTimeout(resolve)} )
		
		precedent_stillAwake = stillAwake
		//~ stillAwake = globalFrameTree.someLeafHasPropertyTrue('awake' )
		stillAwake = globalFrameTree.someLeafHasConditionTrue(elt=>! elt.suspended && elt.awake)
		;;        condLogGroupEnd(3, '------> MicroInstant', 'END')
	}
	;;        condLogGroupEnd(1, '====> SuperInstant:', 'END')
}

function exec(code) {
	mainFrame = new Frame(code)
	//~ console.warn('mainFrame code', code)
	globalFrameTree = new Tree(mainFrame)
	runBurst()
}

function execProg(progText, pf_location, pb_notTimeout0, pParser) {
	timeout0 = ! pb_notTimeout0
	f_location = pf_location
	let progr
	try {
		progr = pParser.parse(progText)
		Expression = progr.constructor
	} catch (err) {
		if (err.location === undefined) console.error(err)
		const loc = err.location
		const oldStartLine = loc.start.line
		const startSource = (f_location) ? f_location(loc.start.line).source : loc.source
		const startLine = (f_location) ? f_location(loc.start.line).line : loc.start.line
		console.error('SYNTAX ERROR%c at ' + startSource + ' line ' + startLine + ' column ' + loc.start.column, 'color: #008000')
		throw err
	}
	exec(progr.content)
}

function execAST(pAST, pf_location, pb_notTimeout0) {
	timeout0 = ! pb_notTimeout0
	f_location = pf_location
	Expression = pAST.constructor
	exec(pAST.content)
}
