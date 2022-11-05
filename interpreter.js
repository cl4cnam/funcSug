'use strict'

const namespaceSet = new Set()
const cancellationSet = new Set()
const frozenLivebox = new Set()

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

function $$$__BugChecking(pb_bugCondition, ps_message, pn_line, p_otherInfo) {
	if (pb_bugCondition) {
		if (p_otherInfo!==undefined) localLog(p_otherInfo)
		console.error('%c Bug in funcSug interpreter %c ' + ps_message + ' **at** line ' + pn_line, 'background-color: #ffb0b0; color: #800000')
		throw '-- END OF BUG --'
		//~ throw 'Bug: ' + ps_message + ' **at** line ' + pn_line
	}
}

function $__ErrorChecking(pFrame, pb_errorCondition, ps_message) {
	if (pb_errorCondition) {
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

function deepClone(p_object) { // inspired by https://stackoverflow.com/questions/728360/how-do-i-correctly-clone-a-javascript-object
	if (typeof p_object !== 'object' || p_object === null) return p_object
	
	if (p_object instanceof Array) return p_object.map(elt=>deepClone(elt))
	
	if (p_object instanceof Object) {
		const l_clone = {}
		for (var attr in p_object) {
			if (p_object.hasOwnProperty(attr)) l_clone[attr] = deepClone(p_object[attr])
		}
		return l_clone
	}
	
	;;     $$$__BugChecking(true, "Unable to copy obj! Its type isn't supported.", new Error().lineNumber)
}

//===================================================================================================
//
// return management
//
//===================================================================================================
//===================================================================================================

function extractFromReturnedValues(returnedValues, initialIndex) {
	//~ localLog(returnedValues, initialIndex)
	const lArray_fastestToSlowest = returnedValues.map( elt=>elt.idx )
	const l_index = lArray_fastestToSlowest.indexOf(initialIndex)
	;;     $$$__BugChecking(l_index===-1, 'initialIndex not found', new Error().lineNumber, returnedValues)
	return returnedValues[l_index].val
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
	pFrame.namespace = makeNewDetachedNamespace(pFrame)
	pFrame.namespace.attached = true
}

function getNamespace(pFrame, label) {
	;;     $$$__BugChecking(pFrame===undefined, 'pFrame===undefined', new Error().lineNumber)
	if ( pFrame.namespace!==undefined && pFrame.namespace.has(label) ) return pFrame.namespace
	if ( pFrame.historicParent ) return getNamespace(pFrame.namespaceParent || pFrame.historicParent, label)
}

function Livebox(p_namespace, p_label) {
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

Livebox.prototype.setval = function(pFrame, val) {
	this.currBip = true
	this.currBeep = true
	// delete values in direct line
	for (const otherVal of [...this.currMultival]) {
		//~ if ( isPrecedingFrame(otherVal.frame, pFrame) ) {
		let ls_common = getCommonStart(otherVal.frame.pathOfExecution, pFrame.pathOfExecution)
		while (['0','1','2','3','4','5','6','7','8','9'].includes(ls_common.charAt(ls_common.length - 1))) {
			ls_common = ls_common.slice(0,-1)
		}
		if ( ls_common.charAt(ls_common.length - 1) == ';') {
			const l_otherValIndex = this.currMultival.indexOf(otherVal)
			this.currMultival.splice(l_otherValIndex, 1)
		}
	}
	// add new val
	this.currMultival.push({frame:pFrame, val:val})
}

function makeNewVariable(pFrame, p_label) {
	if (pFrame.namespace===undefined) makeNewAttachedNamespace(pFrame)
	pFrame.namespace.set( p_label, new Livebox(pFrame.namespace, p_label) )
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
			;;     $__ErrorChecking(pFrame, p_content[1].type !== 'expression', 'parameters not a list')
			;;     $__ErrorChecking(pFrame, p_content[2].type !== 'expression', 'body not an expression')
			;;     $__ErrorChecking(pFrame, p_content[1].content.some(elt=>(elt.type !== 'identifier')), 'some parameter is not an identifier')
			pFrame.toReturn_multival.push({type: 'lambda', frame:pFrame, param:p_content[1], body:p_content[2]})
			pFrame.terminated = true
		}
	},
	//===========================================================
	
	call: { // call <function> <param> ... <param>
		nbArg: (n=> (n>=1) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				pFrame.addChildToLeaflist(p_content[1])
			} else if (pFrame.instrPointer==2) {
				pFrame.lambda = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
				;;     $__ErrorChecking(pFrame, pFrame.lambda.length!==1, 'multiple lambdas')
				;;     $__ErrorChecking(pFrame, pFrame.lambda.some(elt=>(elt.type!=='lambda')), 'not lambda')
				;;     $__ErrorChecking(pFrame, pFrame.lambda.some(elt=>   (   elt.param.content.length !== p_content.length-2   )   ), 'arguments number differs from parameters number')
				pFrame.childReturnedMultivals = []
				const l_params = pFrame.lambda[0].param.content
				for (let i=2;i<=p_content.length-1;i++) {
					;;     $$$__BugChecking(p_content[i]===undefined, 'p_content[i]===undefined', new Error().lineNumber)
					if(l_params[i-2][0] !== '_') pFrame.addChildToLeaflist(p_content[i])
				}
			} else if (pFrame.instrPointer==3) {
				
				// get args
				//==========
				const l_params = pFrame.lambda[0].param.content
				const l_argsResults = []
				let cpt = 0
				for (let i=1;i<p_content.length-1;i++) {
					l_argsResults[i-1] = (l_params[i-1].content[0] !== '_') ? extractFromReturnedValues(pFrame.childReturnedMultivals, cpt) : [p_content[i+1]]
					cpt += 1
				}
				pFrame.childReturnedMultivals = []
				const l_theCombinations = cartesianProduct(...l_argsResults)
				
				// exec
				//==========
				for (const comb of l_theCombinations) {
					pFrame.addChildToLeaflist(pFrame.lambda[0].body)
					pFrame.injectParametersWithValues(pFrame.lambda[0].param.content, comb, pFrame.lambda[0])
				}
			} else {
				for (let i=0; i<pFrame.childReturnedMultivals.length; i++) {
					const l_argResult = extractFromReturnedValues(pFrame.childReturnedMultivals, i)
					pFrame.toReturn_multival.push(...l_argResult)
				}
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	ext: { // ext <inputExpression> <jsStringToExecute> <outputExpression> [<jsStringForCancellation>]
		nbArg: (n=> (n==3 || n==4) ),
		exec: function(pFrame, p_content) {
			const lPARAM_inputExpression = p_content[1]
			const lPARAM_jsStringToExecute = p_content[2]
			const lPARAM_outputExpression = p_content[3]
			const ls_jsStringForCancellation = (p_content.length==5) ? p_content[4].content : ''
			const l_inputContent = lPARAM_inputExpression.content
			
			if (pFrame.instrPointer==1) {
				// input
				//========
				;;     $__ErrorChecking(pFrame, lPARAM_inputExpression.type!=='expression', 'inputExpression not an expression')
				for (let i=0;i<l_inputContent.length;i++) {
					;;     $$$__BugChecking(l_inputContent[i]===undefined, 'l_inputContent[i]===undefined', new Error().lineNumber)
					pFrame.addChildToLeaflist(l_inputContent[i])
				}
				pFrame.addChildToLeaflist(lPARAM_outputExpression)
			} else {
				// get input
				//==========
				const l_argsResults = []
				for (let i=0;i<l_inputContent.length;i++) {
					l_argsResults[i] = extractFromReturnedValues(pFrame.childReturnedMultivals, i)
				}
				const l_argOutput = extractFromReturnedValues(pFrame.childReturnedMultivals, l_inputContent.length)
				;;     $__ErrorChecking(pFrame, l_argOutput.length!==1, 'multiple output')
				const l_theCombinations = cartesianProduct(...l_argsResults)
				
				// output
				//========
				const l_outputLabel = l_argOutput[0]
				const l_namespace = getNamespace(pFrame, l_outputLabel)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'undefined output variable ' + l_outputLabel)
				const l_outputLivebox = l_namespace.get(l_outputLabel)
				l_namespace.set( l_outputLivebox, new Livebox(l_namespace, l_outputLivebox) )
				
				// replace in jsStringToExecute
				//=============================
				let ls_jsStringToExecute = lPARAM_jsStringToExecute.content
				ls_jsStringToExecute = `
					"use strict"
					const output=arguments[0]
					const error=arguments[1]
					const SAVES=arguments[2]
					const args=[...arguments]
					args.shift(); args.shift(); args.shift();
				` + ls_jsStringToExecute
				
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
							(resolve,reject) => {       (new Function(ls_jsStringToExecute))(resolve,reject,lList_saveExternals,...argmts)    }
						)
					)
					promises[promises.length-1].then(res => {
						l_outputLivebox.currMultival.push({frame:pFrame, val:res})
						l_outputLivebox.precMultival.push(res) // useful ?
						runBurst()
					})
				}
				Promise.all(promises).then(res => {
					l_outputLivebox.currBip = true // useful ?
					l_outputLivebox.currBeep = true // useful ?
					l_outputLivebox.precBip = true
					l_outputLivebox.precBeep = true
					if(ls_jsStringForCancellation !== '') cancellationSet.delete(l_cancelObj)
					runBurst()
				})
				pFrame.toReturn_multival = []
				pFrame.terminated = true
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
				pFrame.addChildToLeaflist(lPARAM_variable)
			} else {
				const l_argsLabel = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
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
				if (pFrame.instrPointer > 1) {
					pFrame.childReturnedMultivals = []
				}
				pFrame.lastChild = pFrame.addChildToLeaflist(p_content[1])
			} else {
				const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
				pFrame.childReturnedMultivals = []
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
	
	print: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			//~ localLog('print', pFrame.childReturnedMultivals[0])
			for (const val of pFrame.childReturnedMultivals[0].val) console.log(val)
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
	
	var: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals[0].val) {
				makeNewVariable(pFrame.parent, label)
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	freeze: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals[0].val) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'freeze underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'freeze undefined variable')
				const l_livebox = l_namespace.get(label)
				
				frozenLivebox.add(l_livebox)
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	unfreeze: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals[0].val) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'unfreeze underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'unfreeze undefined variable')
				const l_livebox = l_namespace.get(label)
				
				frozenLivebox.delete(l_livebox)
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	next: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.childReturnedMultivals[0].val) {
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
			for (const label of pFrame.childReturnedMultivals[0].val) {
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
			for (const label of pFrame.childReturnedMultivals[0].val) {
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
			for (const label of pFrame.childReturnedMultivals[0].val) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'get underscore variable')
				// get variable
				//-------------
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'get undefined variable')
				const l_livebox = l_namespace.get(label)
				// get value
				//----------
				//~ localLog('get', label, l_livebox.getMultival())
				pFrame.toReturn_multival.push(...l_livebox.getMultival())
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
					pFrame.addChildToLeaflist(l_values[i])
				}
			} else {
				// get value
				//----------
				for (let i=0; i<pFrame.childReturnedMultivals.length; i++) {
					const l_argResult = extractFromReturnedValues(pFrame.childReturnedMultivals, i)
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
	'randomIntBetween': { operExec: (min, max) =>  Math.floor( (max-min+1)*Math.random()+min )  },
	//===========================================================
	
	'notCancellable': {
		singleExec: x => x,
		canc: function(pFrame) {},
	},
	//===========================================================
	
	bip: { // generate(evt)
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
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
			const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
			for (const label of l_firstargResult) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'isBip undefined variable')
				const l_livebox = l_namespace.get(label)
				pFrame.toReturn_multival.push(l_livebox.precBip)
			}
		}
	},
	//===========================================================
	
	isBeep: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
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
			const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
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
			const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
			const l_secondargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 1)
			for (const label of l_firstargResult) {
				const l_namespace = getNamespace(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_namespace===undefined, 'set undefined variable')
				const l_livebox = l_namespace.get(label)
				for (const val of l_secondargResult) {
					//~ localLog('setval', label, val)
					l_livebox.setval(pFrame, val)
				}
			}
			pFrame.toReturn_multival = []
		}
	},
	//===========================================================
	
	par: {
		nbArg: (n=> (n>=1) ),
		postExec: function(pFrame, p_content) {
			for (let i=0; i<pFrame.childReturnedMultivals.length; i++) {
				const l_argResult = extractFromReturnedValues(pFrame.childReturnedMultivals, i)
				//~ localLog('par', i)
				pFrame.toReturn_multival.push(...l_argResult)
			}
		}
	},
	//===========================================================
	
	seq: {
		nbArg: (n=> (n>=1) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer<p_content.length) {
				;;     $$$__BugChecking(p_content[pFrame.instrPointer]===undefined, 'p_content[pFrame.instrPointer]===undefined', new Error().lineNumber)
				pFrame.lastChild = pFrame.addChildToLeaflist(p_content[pFrame.instrPointer])
				pFrame.childReturnedMultivals = []
			} else {
				const l_argResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
				pFrame.toReturn_multival.push(...l_argResult)
				pFrame.terminated = true
			}
		},
	},
	//===========================================================
	
	if: { // 'if' <condition> <expression> 'else' <expression>
		nbArg: (n=> (n==2 || n==4) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				;;     $$$__BugChecking(p_content.length==5 && p_content[3]===undefined, 'p_content[3]===undefined', new Error().lineNumber)
				;;     $__ErrorChecking(pFrame, p_content.length==5 && p_content[3].content != 'else', 'else missing')
				pFrame.addChildToLeaflist(p_content[1])
			} else if (pFrame.instrPointer==2) {
				const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
				pFrame.childReturnedMultivals = []
				const lb_thereIsTrue = l_firstargResult.some(x=>x)
				const lb_thereIsFalse = l_firstargResult.some(x=>!x)
				if (lb_thereIsTrue) pFrame.addChildToLeaflist(p_content[2])
				if (lb_thereIsFalse && p_content.length==5) pFrame.addChildToLeaflist(p_content[4])
			} else {
				for (let i=0; i<pFrame.childReturnedMultivals.length; i++) {
					const l_argResult = extractFromReturnedValues(pFrame.childReturnedMultivals, i)
					pFrame.toReturn_multival.push(...l_argResult)
				}
				pFrame.terminated = true
			}
		}
	},
	//===========================================================
	
	while: { // 'while' <condition> <expression> // = repeatIf
		nbArg:2,
		exec: function(pFrame, p_content) {
			let lastResult
			if (pFrame.instrPointer%2==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				;;     $$$__BugChecking(p_content[2]===undefined, 'p_content[2]===undefined', new Error().lineNumber)
				if (pFrame.instrPointer > 1) {
					lastResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
					pFrame.childReturnedMultivals = []
				}
				pFrame.lastChild = pFrame.addChildToLeaflist(p_content[1])
			} else {
				const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
				pFrame.childReturnedMultivals = []
				const lb_thereIsTrue = l_firstargResult.some(x=>x)
				if (lb_thereIsTrue) {
					pFrame.lastChild = pFrame.addChildToLeaflist(p_content[2])
				} else {
					pFrame.toReturn_multival = [lastResult]
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
				for (const ch of pFrame.childrenList) {
					ch.getInstruction()
					ch.instruction.canc(ch)
				}
				if (pFrame.childrenList.length==0) {
					pFrame.terminated = true
					pFrame.removeChildFromLeaflist()
				}
				l_livebox.currBeep = false
			} else {
				const ln_childrenNumber = pFrame.childrenList.length
				for (const ch of [...pFrame.childrenList]) {
					ch.getInstruction()
					ch.instruction.activ(ch)
				}
				if (ln_childrenNumber==0) {
					;;     $$$__BugChecking(pFrame.terminated, 'pFrame.terminated', new Error().lineNumber)
					this.exec(pFrame, pFrame.code.content)
					if (pFrame.terminated) pFrame.removeChildFromLeaflist()
					else pFrame.instrPointer += 1
				}
			}
		}
	},
	//===========================================================
	
	value: {
		nbArg:1,
		exec: function(pFrame, p_content) {
			;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
			if (p_content[1].content === 'true') p_content[1].content = true
			if (p_content[1].content === 'false') p_content[1].content = false
			pFrame.toReturn_multival.push(p_content[1].content)
			pFrame.terminated = true
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
				pFrame.addChildToLeaflist(p_content[1])
			} else if (pFrame.instrPointer==2) {
				const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
				pFrame.childReturnedMultivals = []
				for (const expressi of l_firstargResult) {
					pFrame.addChildToLeaflist(expressi)
				}
			} else {
				for (let i=0; i<pFrame.childReturnedMultivals.length; i++) {
					const l_argResult = extractFromReturnedValues(pFrame.childReturnedMultivals, i)
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
	
	if (! this.canc) {
		this.canc = function(pFrame) {
			for (const ch of pFrame.childrenList) {
				ch.getInstruction()
				ch.instruction.canc(ch)
			}
			if (pFrame.code.cancelExpression) {
				//~ pFrame.parent.childReturnedMultivals = []
				//~ pFrame.replaceChildFromLeafList(toNotcancellableExpression(pFrame.code.cancelExpression))
				const l_namespaceParent = (pFrame?.parent?.code?.content[0]?.content === 'cancellableExec') ? pFrame.parent.parent : pFrame.parent
				mainFrame.addChildToLeaflist(toNotcancellableExpression(pFrame.code.cancelExpression), null, l_namespaceParent)
			}
			if (pFrame.childrenList.length==0) {
				pFrame.removeChildFromLeaflist()
			}
			cancellationSet.forEach(
				cancelElt => {
					if (cancelElt.pathOfExecution.startsWith(pFrame.pathOfExecution)) {
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
						cancellationSet.delete(cancelElt)
					}
				}
			)
		}
	}
	
	if (! this.activ) {
		this.activ = function(pFrame) {
			const ln_childrenNumber = pFrame.childrenList.length
			condLog(5, '- - - - - - activ', pFrame.code.content[0].content, pFrame.code.content[1]?.text, (pFrame.code.content[2]!==undefined)?pFrame.code.content[2].text:' -- ', ln_childrenNumber)
			for (const ch of [...pFrame.childrenList]) {
				ch.getInstruction()
				ch.instruction.activ(ch)
			}
			if (ln_childrenNumber==0) {
				;;     $$$__BugChecking(pFrame.terminated, 'pFrame.terminated', new Error().lineNumber)
				this.exec(pFrame, pFrame.code.content)
				if (pFrame.terminated) pFrame.removeChildFromLeaflist()
				else pFrame.instrPointer += 1
			}
		}
	}
	
	if (this.singleExec) {
		this.nbArg = 1
		this.postExec = function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
			for (const arg1 of l_firstargResult) {
				pFrame.toReturn_multival.push(this.singleExec(arg1))
			}
		}
	}
	
	if (this.operExec) {
		this.nbArg = 2
		this.postExec = function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 0)
			const l_secondargResult = extractFromReturnedValues(pFrame.childReturnedMultivals, 1)
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
				l_argsResults[i] = extractFromReturnedValues(pFrame.childReturnedMultivals, i)
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
					pFrame.addChildToLeaflist(p_content[i])
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

function toValueExpression(pExpression_oldCode) {
	const lExpression = new Expression(
		'expression',
		[
			new Expression('identifier', 'value', 'value'),
			pExpression_oldCode
		],
		pExpression_oldCode.text,
		pExpression_oldCode.exprLabel,
		pExpression_oldCode.cancelExpression
	)
	lExpression.location = pExpression_oldCode.location
	return lExpression
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
	this.childReturnedMultivals = []
	this.pathOfExecution = ''
}

Frame.prototype.toSimpleString = function() {
	const codeText = (this.code.type === 'expression') ? this.code.content[0].content : this.code.text
	const valueText = (this.code.type === 'expression' && this.code.content[0].content === 'value') ? this.code.content[1].content : ''
	return 'level ' + this.level + ', Frame #' + this.serialNumber + ', ' + codeText + '/' + valueText
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
	for (const labelIndex in param) {
		const label = param[labelIndex].content
		;;     $__ErrorChecking(fct.frame, ! label.startsWith('p_') && label[0] != '_', "parameters must begin with 'p_' or '_'")
		makeNewVariable(this, label)
		const l_namespace = this.namespace
		const l_livebox = l_namespace.get(label)
		l_livebox.currBip = true
		l_livebox.currBeep = true
		l_livebox.currMultival.push({frame:this, val:args[labelIndex]})
	}
}

Frame.prototype.addChildToLeaflist = function(expr, reason, namespaceParent) {
	const childFrame = new Frame(expr)
	condLog(4, '- - - ->new frame', expr.text)
	
	if (namespaceParent) {
		childFrame.namespaceParent = namespaceParent
		//~ localLog(namespaceParent)
	}
	
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

Frame.prototype.replaceChildFromLeafList = function(expr) {
	const childFrame = new Frame(expr)
	condLog(4, '- - - ->new frame (replace)', expr.text)
	
	if (this.parent) {
		
		// transfer return values
		//-----------------------
		this.parent.childReturnedMultivals.push({idx:this.initialChildIndex, val:this.toReturn_multival})
		
	}
	
	// globalFrameTree
	//========================
	globalFrameTree.replaceNode(this, childFrame)
	
	// return
	//===================
	return childFrame
}

Frame.prototype.removeChildFromLeaflist = function() {

	condLog(4, '- - - ->frame return', this.code.text, this.toReturn_multival)
	
	// remove links between frames
	//----------------------------
	if (this.parent) {
		
		// transfer return values
		//-----------------------
		this.parent.childReturnedMultivals.push({idx:this.initialChildIndex, val:this.toReturn_multival})
		
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
			let lInstruction_firstTry = new Instruction(l_content[0].content)
			if (lInstruction_firstTry.nbArg===undefined) lInstruction_firstTry = undefined
			
			if (lInstruction_firstTry===undefined && l_content[0].type==='identifier') {
				this.code = toCallExpression(this.code)
			}
			if (this.code.exprLabel) {
				this.code = toCancellableExpression(this.code)
			}
		} else {
			this.code = toValueExpression(this.code)
		}
		
		const l_content = this.code.content
		const lInstruction = new Instruction(l_content[0].content)
		
		// verif number of arg
		//====================
		//~ localLog('======', this.code, l_content[0])
		;;     $__ErrorChecking(this, typeof l_content[0].content !== 'string', 'instruction code cannot be multiple')
		;;     $__ErrorChecking(this, typeof lInstruction.nbArg === 'number' && l_content.length !== lInstruction.nbArg+1, 'wrong number of arguments')
		;;     $__ErrorChecking(this, typeof lInstruction.nbArg !== 'number' && ! lInstruction.nbArg(l_content.length-1), 'invalid number of arguments')
		
		;;     $$$__BugChecking(! (l_content instanceof Array), 'expression not array', new Error().lineNumber)
		;;     $$$__BugChecking(l_content.length === 0, 'exec empty array', new Error().lineNumber)
		;;     $$$__BugChecking(l_content[0].content === undefined, 'exec undefined instr', new Error().lineNumber)
		
		;;     $__ErrorChecking(this, ! ['identifier'].includes(l_content[0].type), 'cannot execute')
		
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
			//~ localLog('l_precedingChild', ln_precedingChildIndex, l_precedingChild)
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
	
	this.replaceNode = function(p_oldNode, pNewNode) {
		//~ localLog('replaceNode', p_oldNode, pNewNode)
		;;     $$$__BugChecking(! this.nodeSet.has(p_oldNode), 'p_oldNode not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_oldNode.parent === undefined, 'p_oldNode not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_oldNode.childrenList === undefined, 'p_oldNode not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(p_oldNode.childrenList.length !== 0, 'p_oldNode has still children', new Error().lineNumber)
		
		;;     $$$__BugChecking(this.nodeSet.has(pNewNode), 'pNewNode already in tree', new Error().lineNumber)
		;;     $$$__BugChecking(pNewNode.parent !== undefined, 'pNewNode already in tree', new Error().lineNumber)
		;;     $$$__BugChecking(pNewNode.childrenList !== undefined, 'pNewNode already in tree', new Error().lineNumber)
		
		// get parent
		//-----------
		const l_parent = p_oldNode.parent
		;;     $$$__BugChecking(! this.nodeSet.has(l_parent), 'l_parent not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(l_parent.parent === undefined, 'l_parent not in tree', new Error().lineNumber)
		;;     $$$__BugChecking(l_parent.childrenList === undefined, 'l_parent not in tree', new Error().lineNumber)
		
		// nodeSet
		//--------
		this.nodeSet.delete(p_oldNode)
		this.nodeSet.add(pNewNode)
		
		// leafList
		//----------
		const ln_leafChildI = this.leafList.indexOf(p_oldNode)
		;;     $$$__BugChecking(l_parent && l_parent.childrenList.length == 0, 'childrenList of parent is empty', new Error().lineNumber, p_oldNode)
		this.leafList.splice(ln_leafChildI, 1, pNewNode)
		
		// unlink from parent
		//---------------
		if (p_oldNode != this.root) {
			const ln_childrenI = p_oldNode.parent.childrenList.indexOf(p_oldNode)
			;;     $$$__BugChecking(ln_childrenI === -1, 'child not found', new Error().lineNumber)
			p_oldNode.parent.childrenList.splice(ln_childrenI, 1)
		}
		
		// unmark node
		//----------
		delete p_oldNode.level
		delete p_oldNode.parent
		delete p_oldNode.childrenList
		delete p_oldNode.initialChildIndex
		
		// mark node
		//----------
		pNewNode.level = null
		pNewNode.parent = null
		pNewNode.childrenList = []
		pNewNode.initialChildIndex = null
		pNewNode.spanningNumOfChild = 0
		pNewNode.spanningChildIndex = null
		
		// link to parent
		//---------------
		pNewNode.level = l_parent.level + 1
		pNewNode.parent = l_parent
		pNewNode.historicParent = l_parent
		pNewNode.initialChildIndex = l_parent.childrenList.length
		pNewNode.spanningChildIndex = l_parent.spanningNumOfChild
		l_parent.spanningNumOfChild += 1 // TODO : BigInt for very long (in time) (>= 100 years) program, BUG, FIXME
		l_parent.childrenList.push(pNewNode)
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
	g_superInstantNumber += 1 
	;;        condLogGroup(1, '====> SuperInstant:', g_superInstantNumber)
	//~ ;;        condLog(1, '-------------')
	
	globalFrameTree.setPropertyTrueForAllLeaf('awake')
	let cpt2 = 0
	while (  globalFrameTree.someLeafHasPropertyTrue('awake' ) ) {
		cpt2 += 1
		if (cpt2==250 && g_debug > 0) console.warn('!!! soon INFINITE LOOP ?? !!!')
		if (cpt2==500 && g_debug > 0) {
			console.warn('!!! INFINITE LOOP ?? !!!', globalFrameTree, namespaceSet)
			break
		}
		// exec 1 microinstant
		//====================
		if (! mainFrame.childrenList) break
		;;        condLogGroup(3, '------> MicroInstant')
		;;        condLog(3, '                                       -')
		mainFrame.getInstruction()
		mainFrame.instruction.activ(mainFrame)
		
		// copy "current" values to "precedent"
		//=====================================
		for (const l_namespace of namespaceSet) {
			for (const l_var of l_namespace.keys()) {
				const l_livebox = l_namespace.get(l_var)
				if (! frozenLivebox.has(l_livebox)) {
					l_livebox.precMultival = l_livebox.currMultival.map(elt=>elt.val)
					l_livebox.precBip = l_livebox.currBip
					l_livebox.precBeep = l_livebox.currBeep
					l_livebox.currBip = false
				}
			}
		}
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
