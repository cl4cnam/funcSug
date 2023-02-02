'use strict'

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
		;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'set undefined variable')
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
const g_debug = 0.5
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

function $__ErrorChecking(pFrame, pb_errorCondition, ps_message, p_otherInfo, ps_messageForOtherInfo) {
	if (pb_errorCondition) {
		if (p_otherInfo!==undefined) console.warn(      ps_messageForOtherInfo, p_otherInfo      )
		console.error('Error (funcSug): %c' + ps_message + '%c --IN-- %c' + expressionToString(pFrame.code), 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue', 'color: red', 'color: blue')
		throw '-- END OF ERROR --'
		//~ throw 'Error (prog): ' + ps_message + ' --IN--' + expressionToString(pFrame.code)
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
	if (p_arrays.length==1) return p_arrays
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
				pFrame.toReturn_multival = []
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
				;;     $__ErrorChecking(pFrame, pFrame.lambda.some(elt=>(elt.type!=='lambda')), 'not lambda')
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
	
	ext: { // ext <inputExpression> <jsStringToExecute> <outputExpression> [<jsStringForCancellation>]
		nbArg: (n=> (n==2 || n==3 || n==4) ),
		exec: function(pFrame, p_content) {
			const lPARAM_inputExpression = p_content[1]
			const lPARAM_jsStringToExecute = p_content[2]
			const lPARAM_outputExpression = p_content[3]
			const ls_jsStringForCancellation = (p_content.length==5) ? p_content[4].content : ''
			const l_inputContent = lPARAM_inputExpression.content
			
			if (pFrame.instrPointer==1) {
				// input
				//------
				;;     $__ErrorChecking(pFrame, lPARAM_inputExpression.type!=='expression', 'inputExpression not an expression')
				for (let i=0;i<l_inputContent.length;i++) {
					;;     $$$__BugChecking(l_inputContent[i]===undefined, 'l_inputContent[i]===undefined', new Error().lineNumber)
					const lExpr_inputProg = peg.parse('.get ' + l_inputContent[i].content)
					pFrame.addChild(lExpr_inputProg.content, 'input' + i)
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
				`
				let cptArg = 4
				for (const vari of l_inputContent) {
					ls_jsStringToExecute += 'const ' + vari.content + '=arguments[' + cptArg + ']\n'
					cptArg += 1
				}
				ls_jsStringToExecute += l_arg_jsStringToExecute[0]
				
				// cancellation preparation
				//=========================
				const lList_saveExternals=[]
				const l_cancelObj={
					externalObjects: lList_saveExternals,
					pathOfExecution: pFrame.pathOfExecution,
					execCancel: ls_jsStringForCancellation
				}
				if(ls_jsStringForCancellation !== '') cancellationSet.add(l_cancelObj)
				
				// exec
				//======
				let promises = []
				for (const argmts of l_theCombinations) {
					promises.push(
						new Promise(
							(resolve,reject) => {       (new Function(ls_jsStringToExecute))(resolve,reject,lList_saveExternals,prep_goAssign(pFrame),...argmts)    }
						)
					)
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
					const lExpr_inputProg = peg.parse('.get ' + l_inputContent[i].content)
					pFrame.addChild(lExpr_inputProg.content, 'input' + i)
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
					pFrame.toReturn_multival.push(   (new Function(ls_jsStringToExecute))(...argmts)   )
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
				const lExpr_key = peg.parse('.get ' + lPARAM_key.content)
				pFrame.addChild(lExpr_key.content, 'key')
				
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
				if (lPARAM_type.content === 'adapt') ls_jsStringToExecute += 'const events=arguments[2]\nconst goAssign=arguments[3]\nconst goBreak=arguments[3]\nconst goBip=arguments[3]\n'
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
				addContinuousAction(
					lPARAM_type.content,
					pFrame.childReturnedMultivals.key[0],
					new Function(ls_jsStringToExecute),
					pFrame,
				)
				pFrame.toReturn_multival = []
				//~ pFrame.terminated = true
				pFrame.awake = false
			} else {
				pFrame.awake = false
			}
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
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'freeze underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'freeze undefined variable')
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
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'unfreeze underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'unfreeze undefined variable')
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
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'next underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'next undefined variable')
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
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'get underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'aggregsum undefined variable')
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
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'get underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'aggregprod undefined variable')
				const l_livebox = l_namespace.get(label)
				
				l_livebox.setval(pFrame, l_livebox.getMultival().reduce((x, y) => x*y, 1))
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	get: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals.arg1) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'get underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'get undefined variable', pFrame)
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
					;;     $__ErrorChecking(pFrame, l_livebox === undefined, 'getFromNamespace this label does not exist in this namespace', [l_namespace, label])
					
					// get value
					//----------
					pFrame.toReturn_multival.push(...l_livebox.getMultival())
				}
			}
		}
	},
	//===========================================================
	
	evalget: {
		nbArg:1,
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $__ErrorChecking(pFrame, typeof p_content[1].content !== 'string' || p_content[1].content[0]!=='_' , 'evalget non underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, p_content[1].content)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'evalget undefined variable')
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
	'<': { operExec: (x, y) => x < y},
	'<=': { operExec: (x, y) => x <= y},
	'>': { operExec: (x, y) => x > y},
	'>=': { operExec: (x, y) => x >= y},
	'=': { operExec: (x, y) => x == y},
	'/=': { operExec: (x, y) => x != y},
	'mod': { operExec: (x, y) => x % y},
	'and': { operExec: (x, y) => x && y},
	'or': { operExec: (x, y) => x || y},
	'not': { singleExec: x => !x },
	'sin': { singleExec: x => Math.sin(x) },
	'cos': { singleExec: x => Math.cos(x) },
	'randomIntBetween': { operExec: (min, max) =>  Math.floor( (max-min+1)*Math.random()+min )  },
	'lengthOf': { singleExec: x => x.length },
	'isString': { singleExec: x => (typeof x === 'string') },
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
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'bip undefined variable')
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
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'isBip undefined variable')
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
	
	isBeep: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = pFrame.childReturnedMultivals.arg1
			for (const label of l_firstargResult) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'isBeep undefined variable')
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
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'stopBeep undefined variable')
				const l_livebox = l_namespace.get(label)
				l_livebox.currBeep = false
			}
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
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'set undefined variable')
				const l_livebox = l_namespace.get(label)
				l_livebox.setval(pFrame, l_secondargResult, true)
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
					;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'set undefined variable')
					const l_livebox = l_namespace.get(label)
					l_livebox.setval(pFrame, {expr:l_secondargResult,frame:pFrame}, false)
				}
				pFrame.toReturn_multival = []
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	par: {
		nbArg: (n=> (n>=1) ),
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
			;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'undefined cancellor variable')
			const l_livebox = l_namespace.get(lPARAM_variable.content)
			if (l_livebox.precBeep) {
				const l_multival = l_livebox.getMultival()
				;;     $__ErrorChecking(pFrame, l_multival.length > 1, 'multiple value for cancellor variable')
				if (l_multival.length===0 || ! l_multival[0]) {
					for (const ch of pFrame.childrenList) {
						ch.getInstruction()
						ch.instruction.canc(ch)
					}
					if (pFrame.childrenList.length==0) {
						pFrame.terminated = true
						pFrame.removeChildFromLeaflist()
					}
				} else if (l_multival[0] === 1) {
					for (const ch of pFrame.childrenList) {
						ch.getInstruction()
						ch.instruction.canc(ch)
					}
					if (pFrame.childrenList.length==0) {
						pFrame.terminated = true
						const l_parent = pFrame.parent
						const l_expr = pFrame.code
						pFrame.removeChildFromLeaflist()
						l_parent.addChild(l_expr, 'restart')
					}
				} else if (l_multival[0] > 1) {
					this.setPause(pFrame, l_multival[0])
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

gDict_instructions.break = gDict_instructions.bip
gDict_instructions.mix = gDict_instructions.par

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
	this.cumulExec = gDict_instructions[ps_codeWord].cumulExec
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
				break;
			case RESUME:
				pFrame.suspended = false
				break;
		}
		for (const ch of pFrame.childrenList) {
			ch.getInstruction()
			ch.instruction.setPause(ch, valPause)
		}
	}
	
	if (! this.canc) {
		this.canc = function(pFrame) {
			for (const ch of [...pFrame.childrenList]) {
				ch.getInstruction()
				ch.instruction.canc(ch)
			}
			if (pFrame.code.cancelExpression) {
				const l_namespaceParent = (pFrame?.parent?.code?.content[0]?.content === 'cancellableExec') ? pFrame.parent.parent : pFrame.parent
				mainFrame.addChild(toNotcancellableExpression(pFrame.code.cancelExpression), 'whenCanceled', l_namespaceParent)
			}
			if (pFrame.childrenList.length==0) {
				pFrame.removeChildFromLeaflist()
			}
			cancellationSet.forEach(
				cancelElt => {
					if (cancelElt.pathOfExecution.startsWith(pFrame.pathOfExecution)) {
						if (cancelElt.externalObjects === 'continuous') {
							delContinuousAction(cancelElt.type, cancelElt.key)
						} else {
							let ls_jsStringToExecute = cancelElt.execCancel
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
							}
						}
						cancellationSet.delete(cancelElt)
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
	const lExpression = new Expression(
		'expression',
		[
			new Expression('identifier', 'call', 'call'),
			new Expression(
				'expression',
				[
					new Expression('identifier', 'get', 'get'),
					pExpression_oldCode.content[0]
				],
				'get ' + pExpression_oldCode.content[0].content
			),
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
				pExpression.content[0],
				pExpression.content[1],
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
			if ( ['lambda', 'while', 'foreach', 'foreach_race', 'repeat'].includes(this.code.content[0]?.content) ) {
				this.code = getSeqInserted(this.code, 2)
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
		if (l_content[0].content === 'seq') {
			let ln_precLine = -1
			let ls_currLine = -1
			let lExpr_prec = null
			for (const expr of l_content) {
				ls_currLine = expr.location.start.line
				;;     $__ErrorChecking(this, ls_currLine == ln_precLine && expr.content[0]?.text !== 'set', 'two elements of sequence on the same line: "'+lExpr_prec?.text+'" and "'+expr?.text+'"')
				ln_precLine = ls_currLine
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

	this.someLeafHasConditionTrue = function(ps_condition) {
		//~ console.log('someLeafHasPropertyTrue', this.leafList, ps_property)
		return this.leafList.some(elt=>eval(ps_condition))
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

function runBurst() {
	if (stop) return
	g_superInstantNumber += 1
	//~ localLog('====> SuperInstant:', g_superInstantNumber)
	;;        condLogGroup(1, '====> SuperInstant:', g_superInstantNumber)
	//~ ;;        condLog(1, '-------------')
	
	globalFrameTree.setPropertyTrueForAllLeaf('awake')
	let cpt2 = 0
	let precedent_stillAwake = true
	//~ let stillAwake = globalFrameTree.someLeafHasPropertyTrue('awake' )
	let stillAwake = globalFrameTree.someLeafHasConditionTrue('! elt.suspended && elt.awake' )
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
				for (const [key, fct_frame] of continuousActionDict.send) fct_frame.fct(key, delta, send)
				for (const [key, fct_frame] of continuousActionDict.adapt) fct_frame.fct(key, delta, continuousEvents, prep_goAssign(fct_frame.frame))
				for (const [key, fct_frame] of continuousActionDict.play) fct_frame.fct(key, delta)
				for (const [key, fct_frame] of continuousActionDict.emit) fct_frame.fct(key, delta)
				if (!continuousActionEmpty && (g_debug <= 0.5 || cpt3 < 500)) requestAnimationFrame(raf_func)
				//~ if (continuousActionEmpty && cpt3 < 1) requestAnimationFrame(raf_func)
				//~ else localLog('---STOP')
				clearContinuousEvents()
				old_timestamp = timestamp
			}
			requestAnimationFrame(raf_func)
		}
		
		precedent_stillAwake = stillAwake
		//~ stillAwake = globalFrameTree.someLeafHasPropertyTrue('awake' )
		stillAwake = globalFrameTree.someLeafHasConditionTrue('! elt.suspended && elt.awake' )
		;;        condLogGroupEnd(3, '------> MicroInstant', 'END')
	}
	;;        condLogGroupEnd(1, '====> SuperInstant:', 'END')
}

function exec(code) {
	mainFrame = new Frame(code)
	globalFrameTree = new Tree(mainFrame)
	runBurst()
}

function execProg(progText, pf_location) {
	f_location = pf_location
	let progr
	try {
		progr = peg.parse(progText)
		Expression = progr.constructor
	} catch (err) {
		const loc = err.location
		const oldStartLine = loc.start.line
		const startSource = (f_location) ? f_location(loc.start.line).source : loc.source
		const startLine = (f_location) ? f_location(loc.start.line).line : loc.start.line
		console.error('SYNTAX ERROR%c at ' + startSource + ' line ' + startLine + ' column ' + loc.start.column, 'color: #008000')
		throw err
	}
	exec(progr.content)
}
