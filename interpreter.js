'use strict'

const leafFrameList = []
const scopeSet = new Set()

const exprlabelMap = new Map()
const inheritedexprlabelMap = new Map()
let toBreak_List = []

const localLog = console.log
let mainFrame
let f_location
let g_superInstantNumber = 0
let g_instantNumber = 0
let g_stepPending = false

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
// Errors
//
//===================================================================================================
//===================================================================================================

function $$$__BugChecking(pb_bugCondition, ps_message, pn_line) {
	if (pb_bugCondition) throw 'Bug: ' + ps_message + ' **at** line ' + pn_line
}

function $__ErrorChecking(pFrame, pb_errorCondition, ps_message) {
	if (pb_errorCondition) throw 'Error (prog): ' + ps_message + ' --IN--' + expressionToString(pFrame.code)
}

function locationToString(loc) {
	const oldStartLine = loc.start.line
	const oldEndLine = loc.end.line
	const startSource = (f_location) ? f_location(loc.start.line).source : loc.source
	const startLine = (f_location) ? f_location(loc.start.line).line : loc.start.line
	const endSource = (f_location) ? f_location(loc.end.line).source : loc.source
	const endLine = (f_location) ? f_location(loc.end.line).line : loc.end.line
	return 'source ' + startSource + ', line ' + startLine + ' column ' + loc.start.column + ' to source ' + endSource + ', line ' + endLine + ' column ' + loc.end.column
}

function expressionToString(expr) {
	return ' "... ' + expr.text + ' ..." --AT--> ' + locationToString(expr.location)
}

//===================================================================================================
//
// frame functions
//
//===================================================================================================
//===================================================================================================

function extractFromReturnedValues(returnedValues, initialIndex) {
	const lArray_fastestToSlowest = returnedValues.map( elt=>elt.idx )
	const l_index = lArray_fastestToSlowest.indexOf(initialIndex)
	;;     $$$__BugChecking(l_index===-1, 'initialIndex not found', new Error().lineNumber)
	return returnedValues[l_index].val
}

function linkFrames(frame1, frame2) {
	frame2.precedingFramesOrPlugs ||= []
	frame2.precedingFramesOrPlugs.push(frame1)
	frame1.followingFramesOrPlugs ||= []
	frame1.followingFramesOrPlugs.push(frame2)
}

function isLinkedFrames(frame1, frame2) {
	const l_index1in2 = frame2.precedingFramesOrPlugs.indexOf(frame1)
	const l_index2in1 = frame1.followingFramesOrPlugs.indexOf(frame2)
	;;     $$$__BugChecking(l_index1in2===-1 && l_index2in1!==-1, 'only forward link', new Error().lineNumber)
	;;     $$$__BugChecking(l_index2in1===-1 && l_index1in2!==-1, 'only backward link', new Error().lineNumber)
	return l_index2in1!==-1 && l_index1in2!==-1
}

function unlinkFrames(frame1, frame2) {
	const l_index1 = frame2.precedingFramesOrPlugs.indexOf(frame1)
	;;     $$$__BugChecking(l_index1===-1, 'no link between frame1 and frame2', new Error().lineNumber)
	frame2.precedingFramesOrPlugs.splice(l_index1, 1)
	const l_index2 = frame1.followingFramesOrPlugs.indexOf(frame2)
	;;     $$$__BugChecking(l_index2===-1, 'no link between frame1 and frame2', new Error().lineNumber)
	frame1.followingFramesOrPlugs.splice(l_index2, 1)
}

function isPrecedingFrame(frame1, frame2) {
	;;     $$$__BugChecking(frame1===undefined, '(isPrecedingFrame) frame1 is undefined', new Error().lineNumber)
	if (frame2===undefined) return false
	if (frame1.instantNumber < frame2.instantNumber) return true
	if (frame1.instantNumber > frame2.instantNumber) return false
	return frame1===frame2
		|| frame2.precedingFramesOrPlugs===frame1
		|| frame2.precedingFramesOrPlugs && frame2.precedingFramesOrPlugs.some(elt=>isPrecedingFrame(frame1, elt))
}

//===================================================================================================
//
// variables
//
//===================================================================================================
//===================================================================================================

function makeNewDetachedScope(pFrame) {
	const l_scope = new Map()
	l_scope.frame = pFrame
	scopeSet.add(l_scope)
	return l_scope
}

function makeNewAttachedScope(pFrame) {
	pFrame.scope = makeNewDetachedScope(pFrame)
	pFrame.scope.attached = true
}

function getVarScope(pFrame, label) {
	;;     $$$__BugChecking(pFrame===undefined, 'pFrame===undefined', new Error().lineNumber)
	if ( pFrame.scope!==undefined && pFrame.scope.has(label) ) return pFrame.scope
	if ( pFrame.parent ) return getVarScope(pFrame.parent, label)
}

function Variable(p_scope, p_label) {
	this.declScope = p_scope
	this.label = p_label
	this.precBip = false
	this.precBeep = false
	this.currBip = false
	this.currBeep = false
	this.prec = []
	this.curr = []
}

Variable.prototype.getval = function() {
	return this.prec
}

Variable.prototype.setval = function(pFrame, val) {
	this.currBip = true
	this.currBeep = true
	// delete values in direct line
	for (const otherVal of [...this.curr]) {
		if ( isPrecedingFrame(otherVal.frame, pFrame) ) {
			const l_otherValIndex = this.curr.indexOf(otherVal)
			this.curr.splice(l_otherValIndex, 1)
		}
	}
	// add new val
	this.curr.push({frame:pFrame, val:val})
}

function makeNewVariable(pFrame, p_label) {
	if (pFrame.scope===undefined) makeNewAttachedScope(pFrame)
	pFrame.scope.set( p_label, new Variable(pFrame.scope, p_label) )
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
			;;$__ErrorChecking(pFrame, p_content[1].type !== 'expression', 'parameters not a list')
			;;$__ErrorChecking(pFrame, p_content[2].type !== 'expression', 'body not an expression')
			;;$__ErrorChecking(pFrame, p_content[1].content.some(elt=>(elt.type !== 'identifier')), 'some parameter is not an identifier')
			pFrame.toReturn_values.push({type: 'lambda', frame:pFrame, param:p_content[1], body:p_content[2]})
			pFrame.terminated = true
		}
	},
	call: { // call <function> <param> ... <param>
		nbArg: (n=> (n>=1) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				pFrame.addChildToLeaflist(p_content[1])
			} else if (pFrame.instrPointer==2) {
				pFrame.lambda = extractFromReturnedValues(pFrame.returned_values, 0)
				;;$__ErrorChecking(pFrame, pFrame.lambda.length!==1, 'multiple lambdas')
				;;$__ErrorChecking(pFrame, pFrame.lambda.some(elt=>(elt.type!=='lambda')), 'not lambda')
				;;$__ErrorChecking(pFrame, pFrame.lambda.some(elt=>   (   elt.param.content.length !== p_content.length-2   )   ), 'arguments number differs from parameters number')
				pFrame.returned_values = []
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
					l_argsResults[i-1] = (l_params[i-1].content[0] !== '_') ? extractFromReturnedValues(pFrame.returned_values, cpt) : [p_content[i+1]]
					cpt += 1
				}
				pFrame.returned_values = []
				const l_theCombinations = cartesianProduct(...l_argsResults)
				
				// exec
				//==========
				for (const comb of l_theCombinations) {
					pFrame.addChildToLeaflist(pFrame.lambda[0].body, pFrame.lambda[0].param.content, comb, pFrame.lambda[0])
				}
			} else {
				for (let i=0; i<pFrame.returned_values.length; i++) {
					const l_argResult = extractFromReturnedValues(pFrame.returned_values, i)
					pFrame.toReturn_values.push(...l_argResult)
				}
				pFrame.terminated = true
			}
		}
	},
	ext: { // ext <inputExpression> <jsStringToExecute> <outputExpression>
		nbArg:3,
		exec: function(pFrame, p_content) {
			const l_inputExpression = p_content[1]
			const l_inputContent = l_inputExpression.content
			
			if (pFrame.instrPointer==1) {
				// input
				//========
				;;     $__ErrorChecking(pFrame, l_inputExpression.type!=='expression', 'inputExpression not an expression')
				for (let i=0;i<l_inputContent.length;i++) {
					;;     $$$__BugChecking(l_inputContent[i]===undefined, 'l_inputContent[i]===undefined', new Error().lineNumber)
					pFrame.addChildToLeaflist(l_inputContent[i])
				}
				pFrame.addChildToLeaflist(p_content[3])
			} else {
				// get input
				//==========
				const l_argsResults = []
				for (let i=0;i<l_inputContent.length;i++) {
					l_argsResults[i] = extractFromReturnedValues(pFrame.returned_values, i)
				}
				const l_argOutput = extractFromReturnedValues(pFrame.returned_values, l_inputContent.length)
				;;$__ErrorChecking(pFrame, l_argOutput.length!==1, 'multiple output')
				const l_theCombinations = cartesianProduct(...l_argsResults)
				
				// output
				//========
				const l_outputLabel = l_argOutput[0]
				const l_scope = getVarScope(pFrame, l_outputLabel)
				;;     $__ErrorChecking(pFrame, l_scope===undefined, 'undefined output variable ' + l_outputLabel)
				const l_outputVari = l_scope.get(l_outputLabel)
				l_scope.set( l_outputVari, new Variable(l_scope, l_outputVari) )
				
				// replace in jsStringToExecute
				//=============================
				let ls_jsStringToExecute = p_content[2].content
				ls_jsStringToExecute = `
					"use strict"
					const output=arguments[0]
					const error=arguments[1]
					const args=[...arguments]
					args.shift(); args.shift()
				` + ls_jsStringToExecute
				
				// exec
				//======
				let promises = []
				for (const argmts of l_theCombinations) {
					promises.push( new Promise(   (resolve,reject) => {       (new Function(ls_jsStringToExecute))(resolve,reject,...argmts)    }   ) )
					promises[promises.length-1].then(res => {
						l_outputVari.curr.push({frame:pFrame, val:res})
						l_outputVari.prec.push(res)
						run()
					})
				}
				Promise.all(promises).then(res => {
					l_outputVari.currBip = true
					l_outputVari.currBeep = true
					l_outputVari.precBip = true
					l_outputVari.precBeep = true
					run()
				})
				pFrame.toReturn_values = []
				pFrame.terminated = true
			}
		}
	},
	await: {
		nbArg:2,
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				pFrame.addChildToLeaflist(p_content[1])
			} else {
				const l_argsLabel = extractFromReturnedValues(pFrame.returned_values, 0)
				for (const label of l_argsLabel) {
					const l_scope = getVarScope(pFrame, label)
					;;     $__ErrorChecking(pFrame, l_scope===undefined, 'undefined awaited variable')
					const l_vari = l_scope.get(label)
					if (l_vari.precBip && p_content[2].content=='bip') {
						pFrame.toReturn_values.push(...l_vari.getval())
					} else if (l_vari.precBeep && p_content[2].content=='beep') {
						pFrame.toReturn_values.push(...l_vari.getval())
						l_vari.currBeep = false
					} else {
						pFrame.awake = false
					}
					if (pFrame.awake) pFrame.terminated = true
				}
			}
		}
	},
	print: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const val of pFrame.returned_values[0].val) console.log(val)
			pFrame.toReturn_values = []
		}
	},
	Scope: {
		nbArg:0,
		postExec: function(pFrame, p_content) {
			const lMap_newScope = makeNewDetachedScope(pFrame)
			pFrame.toReturn_values = [lMap_newScope]
		}
	},
	var: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.returned_values[0].val) {
				makeNewVariable(pFrame.parent, label)
			}
			pFrame.toReturn_values = []
		}
	},
	//~ insideVar: { // insideVar <scope> <label> : no : get <label> ... <label> and set <label> ... <label> <exression>
		//~ nbArg:2,
		//~ postExec: function(pFrame, p_content) {
			//~ // if (pFrame.parent.scope===undefined) makeNewAttachedScope(pFrame.parent)
			//~ // const l_scope = pFrame.parent.scope
			//~ const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
			//~ const l_secondargResult = extractFromReturnedValues(pFrame.returned_values, 1)
			//~ for (const label of pFrame.returned_values[0].val) {
				//~ // l_scope.set( label, new Variable(l_scope, label) )
				//~ makeNewVariable(pFrame.parent, label)
			//~ }
			//~ pFrame.toReturn_values = []
		//~ }
	//~ },
	get: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.returned_values[0].val) {
				;;     $__ErrorChecking(pFrame, typeof label === 'string' && label[0]==='_' , 'get underscore variable')
				// get variable
				//-------------
				const l_scope = getVarScope(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_scope===undefined, 'get undefined variable')
				const l_vari = l_scope.get(label)
				// get value
				//----------
				pFrame.toReturn_values.push(...l_vari.getval())
			}
		}
	},
	evalget: {
		nbArg:1,
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $__ErrorChecking(pFrame, typeof p_content[1].content !== 'string' || p_content[1].content[0]!=='_' , 'evalget non underscore variable')
				// get variable
				//-------------
				const l_scope = getVarScope(pFrame, p_content[1].content)
				;;     $__ErrorChecking(pFrame, l_scope===undefined, 'get undefined variable')
				const l_vari = l_scope.get(p_content[1].content)
				// get value
				//----------
				const l_values = l_vari.getval()
				for (let i=0;i<l_values.length;i++) {
					;;     $$$__BugChecking(l_values[i]===undefined, 'l_values[i]===undefined', new Error().lineNumber)
					pFrame.addChildToLeaflist(l_values[i])
				}
			} else {
				// get value
				//----------
				for (let i=0; i<pFrame.returned_values.length; i++) {
					const l_argResult = extractFromReturnedValues(pFrame.returned_values, i)
					pFrame.toReturn_values.push(...l_argResult)
				}
				pFrame.terminated = true
			}
		}
	},
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
	'randomIntBetween': { operExec: (min, max) =>  Math.floor( (max-min+1)*Math.random()+min )  },
	not: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
			for (const arg1 of l_firstargResult) {
				pFrame.toReturn_values.push(! arg1)
			}
		}
	},
	bip: { // generate(evt)
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
			for (const label of l_firstargResult) {
				const l_scope = getVarScope(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_scope===undefined, 'bip undefined variable')
				const l_vari = l_scope.get(label)
				l_vari.currBip = true
				l_vari.currBeep = true
			}
			pFrame.toReturn_values = []
		}
	},
	set: { // generate(evt, value)
		nbArg:2,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
			const l_secondargResult = extractFromReturnedValues(pFrame.returned_values, 1)
			for (const label of l_firstargResult) {
				const l_scope = getVarScope(pFrame, label)
				;;     $__ErrorChecking(pFrame, l_scope===undefined, 'set undefined variable')
				const l_vari = l_scope.get(label)
				for (const val of l_secondargResult) {
					l_vari.setval(pFrame, val)
				}
			}
			pFrame.assignment = true
			pFrame.toReturn_values = []
		}
	},
	par: {
		nbArg: (n=> (n>=1) ),
		postExec: function(pFrame, p_content) {
			for (let i=0; i<pFrame.returned_values.length; i++) {
				const l_argResult = extractFromReturnedValues(pFrame.returned_values, i)
				pFrame.toReturn_values.push(...l_argResult)
			}
		}
	},
	seq: {
		nbArg: (n=> (n>=1) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer<p_content.length) {
				;;     $$$__BugChecking(p_content[pFrame.instrPointer]===undefined, 'p_content[pFrame.instrPointer]===undefined', new Error().lineNumber)
				pFrame.lastChild = pFrame.addChildToLeaflist(p_content[pFrame.instrPointer])
				pFrame.returned_values = []
			} else {
				const l_argResult = extractFromReturnedValues(pFrame.returned_values, 0)
				pFrame.toReturn_values.push(...l_argResult)
				pFrame.terminated = true
			}
		},
	},
	if: { // 'if' <condition> <expression> 'else' <expression>
		nbArg: (n=> (n==2 || n==4) ),
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				;;     $$$__BugChecking(p_content.length==5 && p_content[3]===undefined, 'p_content[3]===undefined', new Error().lineNumber)
				;;     $__ErrorChecking(pFrame, p_content.length==5 && p_content[3].content != 'else', 'else missing')
				pFrame.addChildToLeaflist(p_content[1])
			} else if (pFrame.instrPointer==2) {
				const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
				pFrame.returned_values = []
				const lb_thereIsTrue = l_firstargResult.some(x=>x)
				const lb_thereIsFalse = l_firstargResult.some(x=>!x)
				if (lb_thereIsTrue) pFrame.addChildToLeaflist(p_content[2])
				if (lb_thereIsFalse && p_content.length==5) pFrame.addChildToLeaflist(p_content[4])
			} else {
				for (let i=0; i<pFrame.returned_values.length; i++) {
					const l_argResult = extractFromReturnedValues(pFrame.returned_values, i)
					pFrame.toReturn_values.push(...l_argResult)
				}
				pFrame.terminated = true
			}
		}
	},
	while: { // 'while' <condition> <expression> // = repeatIf
		nbArg:2,
		exec: function(pFrame, p_content) {
			let lastResult
			if (pFrame.instrPointer%2==1) {
				;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
				;;     $$$__BugChecking(p_content[2]===undefined, 'p_content[2]===undefined', new Error().lineNumber)
				if (pFrame.instrPointer > 1) {
					lastResult = extractFromReturnedValues(pFrame.returned_values, 0)
					pFrame.returned_values = []
					g_stepPending = true
				}
				pFrame.lastChild = pFrame.addChildToLeaflist(p_content[1])
			} else {
				const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
				pFrame.returned_values = []
				const lb_thereIsTrue = l_firstargResult.some(x=>x)
				//~ if (lb_thereIsTrue && pFrame.instrPointer < 11) {
				if (lb_thereIsTrue) {
					pFrame.lastChild = pFrame.addChildToLeaflist(p_content[2])
				} else {
					pFrame.toReturn_values = [lastResult]
					pFrame.terminated = true
				}
			}
		}
	},
	break: {
		nbArg:1,
		exec: function(pFrame, p_content) {
			;;     $$$__BugChecking(p_content[1]===undefined, 'p_content[1]===undefined', new Error().lineNumber)
			;;     $__ErrorChecking(pFrame, typeof p_content[1].content !== 'string', 'first arg must be a string')
			toBreak_List.push(p_content[1].content)
			pFrame.toReturn_values = []
			pFrame.terminated = true
		}
	},
}

function Instruction(ps_codeWord, pn_nbArg, pf_operExec, pf_cumulExec, pf_postExec, pf_exec) {
	this.codeWord = ps_codeWord
	this.nbArg = pn_nbArg
	this.operExec = pf_operExec
	this.cumulExec = pf_cumulExec
	this.postExec = pf_postExec
	this.exec = pf_exec
	
	if (this.operExec) {
		this.nbArg = 2
		this.postExec = function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
			const l_secondargResult = extractFromReturnedValues(pFrame.returned_values, 1)
			for (const arg1 of l_firstargResult) {
				for (const arg2 of l_secondargResult) {
					pFrame.toReturn_values.push(this.operExec(arg1, arg2))
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
			//~ let cpt = 0
			for (let i=0;i<p_content.length-1;i++) {
				l_argsResults[i] = extractFromReturnedValues(pFrame.returned_values, i)
				//~ cpt += 1
			}
			//~ pFrame.returned_values = []
			const l_theCombinations = cartesianProduct(...l_argsResults)
			for (const comb of l_theCombinations) {
				//~ pFrame.addChildToLeaflist(pFrame.lambda[0].body, pFrame.lambda[0].param.content, comb, pFrame.lambda[0])
				pFrame.toReturn_values.push(
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
				for (let i=1;i<=p_content.length-1;i++) {
					;;     $$$__BugChecking(p_content[i]===undefined, 'p_content[i]===undefined', new Error().lineNumber)
					pFrame.addChildToLeaflist(p_content[i])
				}
			} else {
				this.postExec(pFrame, p_content)
				pFrame.terminated = true
			}
		}
	}
}

const gDict_Instruct = {}
for (const codeWord in gDict_instructions) {
	gDict_Instruct[codeWord] = new Instruction(
		codeWord,
		gDict_instructions[codeWord].nbArg,
		gDict_instructions[codeWord].operExec,
		gDict_instructions[codeWord].cumulExec,
		gDict_instructions[codeWord].postExec,
		gDict_instructions[codeWord].exec,
	)
}

//===================================================================================================
//
// Frame
//
//===================================================================================================
//===================================================================================================

const Frame = function(code, parent) {
	this.awake = true
	this.code = code
	this.parent = parent
	this.superInstantNumber = g_superInstantNumber
	this.instantNumber = g_instantNumber
	this.plug = {}
	this.instrPointer = 1
	this.childrenList = []
	this.toReturn_values = []
	this.returned_values = []
	if (parent !== null) {
		this.initialChildIndex = parent.childrenList.length
		parent.childrenList.push(this)
	}
	if (this.parent && this.parent.inheritedExprLabel) this.inheritedExprLabel = this.parent.inheritedExprLabel
	
	linkFrames(this, this.plug)
	
	// if it has an exprLabel, register it
	//====================================
	//~ localLog(code)
	if (code.exprLabel) {
		this.exprLabel = code.exprLabel
		this.inheritedExprLabel = code.exprLabel
		if (! exprlabelMap.has(code.exprLabel)) exprlabelMap.set(code.exprLabel, [])
		const lList_frame = exprlabelMap.get(code.exprLabel)
		lList_frame.push(this)
	} else if (this.inheritedExprLabel) {
		if (! inheritedexprlabelMap.has(this.inheritedExprLabel)) inheritedexprlabelMap.set(this.inheritedExprLabel, [])
		const lList_frame = inheritedexprlabelMap.get(this.inheritedExprLabel)
		lList_frame.push(this)
	}
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

Frame.prototype.addChildToLeaflist = function(expr, param, args, fct) {
	const childFrame = new Frame(expr, this)
	
	// param
	//========
	if (param=='skipLinking') {
		childFrame.skipLinking = true
	} else if (param!==undefined) {
		//~ if (this.scope===undefined) makeNewAttachedScope(this)
		for (const labelIndex in param) {
			const label = param[labelIndex].content
			;;$__ErrorChecking(fct.frame, ! label.startsWith('p_') && label[0] != '_', "parameters must begin with 'p_' or '_'")
			makeNewVariable(this, label)
			const l_scope = this.scope
			const l_vari = l_scope.get(label)
			l_vari.currBip = true
			l_vari.currBeep = true
			l_vari.curr.push({frame:this, val:args[labelIndex]})
		}
	}
	
	// precedingFramesOrPlugs
	//========================
	if (! childFrame.skipLinking) {
		if (isLinkedFrames(this, this.plug)) unlinkFrames(this, this.plug)
		if (this.lastChild) {
			linkFrames(this.lastChild.plug, childFrame)
			unlinkFrames(this.lastChild.plug, this.plug)
		} else {
			linkFrames(this, childFrame)
		}
		linkFrames(childFrame.plug, this.plug)
	}
	
	// leafFrameList
	//========================
	const ln_leafParentFrameI = leafFrameList.indexOf(this)
	if (ln_leafParentFrameI === -1) {
		// insert
		const l_precedingChild = this.childrenList[this.childrenList.length-2]
		const ln_precedingChildIndex = leafFrameList.indexOf(l_precedingChild)
		;;     $$$__BugChecking(ln_precedingChildIndex === -1, 'frame not found', new Error().lineNumber)
		leafFrameList.splice(ln_precedingChildIndex+1, 0, childFrame)
	} else {
		// replace
		leafFrameList.splice(ln_leafParentFrameI, 1, childFrame)
	}
	
	// return
	//===================
	return childFrame
}

Frame.prototype.removeChildFromLeaflist = function() {
	const ln_leafChildFrameI = leafFrameList.indexOf(this)

	// remove or, maybe, replace by parent     from leafFrameList
	//-----------------------------------------------------------
	//~ localLog(this)
	;;     $$$__BugChecking(this.parent && this.parent.childrenList.length == 0, 'childrenList of parent is empty', new Error().lineNumber)
	if (this.parent && this.parent.childrenList.length == 1) {
		// replace
		//~ console.log('replace leaf')
		leafFrameList.splice(ln_leafChildFrameI, 1, this.parent)
	} else {
		// remove
		//~ console.log('remove leaf')
		leafFrameList.splice(ln_leafChildFrameI, 1)
	}
	
	// remove links between frames
	//----------------------------
	if (! this.assignment) {
		this.plug.precedingFramesOrPlugs = []
		this.followingFramesOrPlugs = []
		linkFrames(this, this.plug)
	}
	
	if (this.parent) {
		if (this.assignment) this.parent.assignment = true
		
		const ln_childrenFrameI = this.parent.childrenList.indexOf(this)
		;;     $$$__BugChecking(ln_childrenFrameI === -1, 'child frame not found', new Error().lineNumber)
		
		// transfer return values
		//-----------------------
		this.parent.returned_values.push({idx:this.initialChildIndex, val:this.toReturn_values})
		
		// remove from parent
		//---------------------
		this.parent.childrenList.splice(ln_childrenFrameI, 1)
	}
}

Frame.prototype.exec1instant = function() {
	//======
	// exec
	//======
	//~ localLog(this)
	if (this.code.type === 'expression') {
		//~ console.log('est expression', this.toString() )
		const l_content = this.code.content
		
		// put next to last element into the first place if '['
		//======================================================
		if (l_content.length >= 3 && this.code.text[0] === '[') {
			const l_lastToNext = l_content[l_content.length-2]
			l_content.splice(l_content.length-2, 1)
			l_content.unshift(l_lastToNext)
			this.code.text = this.code.text.replace('[', '(')
		}
	
		// errors
		//==========
		;;     $$$__BugChecking(! (l_content instanceof Array), 'expression not array', new Error().lineNumber)
		;;     $$$__BugChecking(l_content.length === 0, 'exec empty array', new Error().lineNumber)
		;;     $$$__BugChecking(l_content[0].content === undefined, 'exec undefined instr', new Error().lineNumber)
		
		;;$__ErrorChecking(this, ! ['identifier'].includes(l_content[0].type), 'cannot execute')
		
		// get Instruction
		//======================
		const lInstruction = gDict_Instruct[l_content[0].content]
		;;$__ErrorChecking(this, lInstruction===undefined, 'undefined instruction')
		
		// verif number of arg
		//====================
		;;$__ErrorChecking(this, typeof lInstruction.nbArg === 'number' && l_content.length !== lInstruction.nbArg+1, 'wrong number of arguments')
		;;$__ErrorChecking(this, typeof lInstruction.nbArg !== 'number' && ! lInstruction.nbArg(l_content.length-1), 'invalid number of arguments')
		
		// finished ?
		//===============
		const lb_finished = this.terminated
		
		// exec instructions
		//===============
		if (! lb_finished) {
			lInstruction.exec(this, l_content)
		}
		
		// increment instrPointer
		//=======================
		this.instrPointer += 1
		
		return lb_finished
	//======
	// value
	//======
	} else {
		//~ console.log('est PAS expression', this.toString() )
		if (this.code.content === 'true') this.code.content = true
		if (this.code.content === 'false') this.code.content = false
		this.toReturn_values.push(this.code.content)
		return true
	}
}

//===================================================================================================
//
// exec
//
//===================================================================================================
//===================================================================================================

function run() {
	g_superInstantNumber += 1 
	g_instantNumber += 1
	for (const leaf of leafFrameList) {
		leaf.awake = true
	}
	while (  leafFrameList.some( elt=>elt.awake ) ) {
		// exec 1 instant
		//===============
		//~ console.log('exec1instant', { ...leafFrameList.map(fr=>fr.toString()) } )
		const leafFrameList_clone = leafFrameList.slice()
		for (const ln_leafFrameI in leafFrameList_clone) {
			const l_leafFrame = leafFrameList_clone[ln_leafFrameI]
			//~ console.log('exec1instant par frame', ln_leafFrameI, l_leafFrame.toString() )
			const lFinished = l_leafFrame.exec1instant()
			if (lFinished) l_leafFrame.removeChildFromLeaflist()
		}
		
		// copy "current" values to "precedent"
		//=====================================
		for (const l_scope of scopeSet) {
			for (const l_var of l_scope.keys()) {
				l_scope.get(l_var).prec = l_scope.get(l_var).curr.map(elt=>elt.val)
				l_scope.get(l_var).precBip = l_scope.get(l_var).currBip
				l_scope.get(l_var).precBeep = l_scope.get(l_var).currBeep
				l_scope.get(l_var).currBip = false
			}
		}
		
		// treat toBreak_List
		//====================
		for (const l_exprLabel of toBreak_List) {
			const lList_inherited = inheritedexprlabelMap.get(l_exprLabel)
			const lList_direct = exprlabelMap.get(l_exprLabel)
			for (const leafIndex in leafFrameList) {
				const l_leaf = leafFrameList[leafIndex]
				if (lList_inherited.includes(l_leaf)) {
					leafFrameList.splice(leafIndex, 1)
				}
			}
			for (const newLeaf of lList_direct) {
					leafFrameList.push(newLeaf)
					if ( newLeaf.parent.childrenList.indexOf(newLeaf) === -1 ) {
						newLeaf.parent.childrenList.push(newLeaf)
					}
					newLeaf.terminated = true
			}
		}
		toBreak_List = []
		
		if (g_stepPending) g_instantNumber += 1
		g_stepPending = false
	}
	//~ localLog('g_superInstantNumber', g_superInstantNumber)
	//~ localLog('g_instantNumber', g_instantNumber)
}

function exec(code) {
	mainFrame = new Frame(code, null)
	leafFrameList.push(mainFrame)
	//~ console.log(mainFrame)
	run()
}

function execProg(progText, pf_location) {
	f_location = pf_location
	let progr
	try {
		progr = peg.parse(progText)
	} catch (err) {
		const loc = err.location
		const oldStartLine = loc.start.line
		const startSource = (f_location) ? f_location(loc.start.line).source : loc.source
		const startLine = (f_location) ? f_location(loc.start.line).line : loc.start.line
		console.log('SYNTAX ERROR at source ' + startSource + ' line ' + startLine + ' column ' + loc.start.column)
		throw err
	}
	exec(progr.content)
}
