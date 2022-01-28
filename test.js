'use strict'

const leafFrameList = []
const scopeSet = new Set()

function locationToString(loc) {
	return 'source ' + loc.source + ', line ' + loc.start.line + ' column ' + loc.start.column + ' to line ' + loc.end.line + ' column ' + loc.end.column
}

function expressionToString(expr) {
	return ' "... ' + expr.text + ' ..." --at--> ' + locationToString(expr.location)
}

function extractFromReturnedValues(returnedValues, initialIndex) {
	const lArray_fastestToSlowest = returnedValues.map( elt=>elt.idx )
	const l_index = lArray_fastestToSlowest.indexOf(initialIndex)
	if (l_index===-1) throw 'Bug: initialIndex not found'
	return returnedValues[l_index].val
}

function isPrecedingFrame(frame1, frame2) {
	if (frame1===undefined) throw 'Bug: (isPrecedingFrame) frame1 is undefined'
	if (frame2===undefined) return false
	return frame1===frame2
		|| frame2.precedingFramesOrPlugs===frame1
		|| frame2.precedingFramesOrPlugs && frame2.precedingFramesOrPlugs.some(elt=>isPrecedingFrame(frame1, elt))
}

function isStraightLink(frame1, frame2) {
	if (frame1===undefined || frame2===undefined) throw 'Bug: scope frame is undefined'
	return isPrecedingFrame(frame1, frame2) || isPrecedingFrame(frame2, frame1)
}

function getVarScope(context, label) {
	if ( context === undefined ) throw 'Bug: context === undefined'
	if ( context.scope.has(label) ) return context.scope
	if ( context.parent ) return getVarScope(context.parent, label)
}

//===================================================================================================
//
// Desc instruction
//
//===================================================================================================
//===================================================================================================

const gDict_instructions = {
	print: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const val of pFrame.returned_values[0].val) console.log(val)
		}
	},
	var: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_scope = p_content[0].context.parent.parent.scope
			for (const vari of pFrame.returned_values[0].val) {
				l_scope.set( vari, {prec:[], curr:[], precBip:false, currBip:false} )
			}
			scopeSet.add(l_scope)
		}
	},
	get: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			for (const label of pFrame.returned_values[0].val) {
				// get variable
				//-------------
				const l_scope = getVarScope(pFrame.code.context, label)
				if (l_scope===undefined) throw 'Error (prog): undefined variable' + expressionToString(pFrame.code)
				const l_vari = l_scope.get(label)
				// get value
				//----------
				pFrame.toReturn_values.push(...l_vari.prec)
			}
		}
	},
	'+': {
		nbArg:2,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
			const l_secondargResult = extractFromReturnedValues(pFrame.returned_values, 1)
			for (const arg1 of l_firstargResult) {
				for (const arg2 of l_secondargResult) {
					pFrame.toReturn_values.push(arg1 + arg2)
				}
			}
		}
	},
	bip: {
		nbArg:1,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
			for (const label of l_firstargResult) {
				const l_scope = getVarScope(pFrame.code.context, label)
				if (l_scope===undefined) throw 'Error (prog): undefined variable' + expressionToString(pFrame.code)
				const l_vari = l_scope.get(label)
				l_vari.currBip = true
			}
		}
	},
	set: {
		nbArg:2,
		postExec: function(pFrame, p_content) {
			const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
			const l_secondargResult = extractFromReturnedValues(pFrame.returned_values, 1)
			for (const label of l_firstargResult) {
				const l_scope = getVarScope(pFrame.code.context, label)
				if (l_scope===undefined) throw 'Error (prog): undefined variable' + expressionToString(pFrame.code)
				const l_vari = l_scope.get(label)
				l_vari.currBip = true
				for (const val of l_secondargResult) {
					// delete values in direct line
					for (const otherVal of l_vari.curr) {
						if ( isStraightLink(pFrame, otherVal.frame) ) {
							const l_otherValIndex = l_vari.curr.indexOf(otherVal)
							l_vari.curr.splice(l_otherValIndex, 1)
						}
					}
					// add new val
					l_vari.curr.push({frame:pFrame, val:val})
				}
			}
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
			if (pFrame.instrPointer===1) pFrame.plug = {precedingFramesOrPlugs:[]}
			if (p_content[pFrame.instrPointer]===undefined) throw 'Bug: p_content[pFrame.instrPointer]===undefined'
			pFrame.lastChild = pFrame.addChildToLeaflist(p_content[pFrame.instrPointer])
		}
	},
	if: {
		nbArg: 3,
		exec: function(pFrame, p_content) {
			if (pFrame.instrPointer==1) {
				pFrame.plug = {precedingFramesOrPlugs:[]}
				if (p_content[1]===undefined) throw 'Bug: p_content[1]===undefined'
				pFrame.addChildToLeaflist(p_content[1])
			} else if (pFrame.instrPointer==2) {
				const l_firstargResult = extractFromReturnedValues(pFrame.returned_values, 0)
				pFrame.returned_values = []
				const lb_thereIsTrue = l_firstargResult.some(x=>x)
				const lb_thereIsFalse = l_firstargResult.some(x=>!x)
				if (lb_thereIsTrue) pFrame.addChildToLeaflist(p_content[2])
				if (lb_thereIsFalse) pFrame.addChildToLeaflist(p_content[3])
			} else {
				for (let i=0; i<pFrame.returned_values.length; i++) {
					const l_argResult = extractFromReturnedValues(pFrame.returned_values, i)
					pFrame.toReturn_values.push(...l_argResult)
				}
				//~ const l_argResult = extractFromReturnedValues(pFrame.returned_values, i)
				//~ pFrame.toReturn_values.push(...l_argResult)
			}
		}
	},
}

function Instruction(ps_codeWord, pn_nbArg, pf_postExec, pf_exec) {
	this.codeWord = ps_codeWord
	this.nbArg = pn_nbArg
	this.postExec = pf_postExec
	this.exec = pf_exec
	
	if (pf_postExec) {
		this.exec = function(pFrame, p_content) {
			//~ const l_content = pFrame.code.content
			if (pFrame.instrPointer==1) {
				pFrame.plug = {precedingFramesOrPlugs:[]}
				for (let i=1;i<=p_content.length-1;i++) {
					if (p_content[i]===undefined) throw 'Bug: p_content[i]===undefined'
					pFrame.addChildToLeaflist(p_content[i])
				}
			} else {
				this.postExec(pFrame, p_content)
			}
		}
	}
}

const gDict_Instruct = {}
for (const codeWord in gDict_instructions) {
	gDict_Instruct[codeWord] = new Instruction(codeWord, gDict_instructions[codeWord].nbArg, gDict_instructions[codeWord].postExec, gDict_instructions[codeWord].exec)
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
	this.instrPointer = 1
	this.childrenList = []
	this.toReturn_values = []
	this.returned_values = []
	if (parent !== null) {
		this.initialChildIndex = parent.childrenList.length
		parent.childrenList.push(this)
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

Frame.prototype.addChildToLeaflist = function(expr) {
	const childFrame = new Frame(expr, this)
	
	// precedingFramesOrPlugs
	//========================
	if (this.lastChild) {
		childFrame.precedingFramesOrPlugs = (this.lastChild.plug) ? [this.lastChild.plug] : [this.lastChild]
		this.plug.precedingFramesOrPlugs = []
	} else {
		childFrame.precedingFramesOrPlugs = [this]
	}
	this.plug.precedingFramesOrPlugs.push(childFrame)
	
	// leafFrameList
	//========================
	const ln_leafParentFrameI = leafFrameList.indexOf(this)
	if (ln_leafParentFrameI === -1) {
		// insert
		const l_precedingChild = this.childrenList[this.childrenList.length-2]
		const ln_precedingChildIndex = leafFrameList.indexOf(l_precedingChild)
		if (ln_precedingChildIndex === -1) throw 'Bug: frame not found'
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
	if (this.parent && this.parent.childrenList.length == 0) {
		throw 'Error (bug): childrenList of parent is empty'
	} else if (this.parent && this.parent.childrenList.length == 1) {
		// replace
		//~ console.log('replace leaf')
		leafFrameList.splice(ln_leafChildFrameI, 1, this.parent)
	} else {
		// remove
		//~ console.log('remove leaf')
		leafFrameList.splice(ln_leafChildFrameI, 1)
	}
	
	if (this.parent) {
		const ln_childrenFrameI = this.parent.childrenList.indexOf(this)
		if (ln_childrenFrameI === -1) throw 'Bug: child frame not found'
		
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
	if (this.code.type === 'expression') {
		//~ console.log('est expression', this.toString() )
		const l_content = this.code.content
	
		// errors
		//==========
		if (! l_content instanceof Array) throw 'Bug: expression not array'
		if (l_content.length === 0) throw 'Bug: exec empty array'
		if (l_content[0].content === undefined) throw 'Bug: exec undefined instr'
		if (! ['identifier', 'oper'].includes(l_content[0].type)) throw 'Error (prog): cannot execute' + expressionToString(l_content[0])
		
		// get Instruction
		//======================
		const lInstruction = gDict_Instruct[l_content[0].content]
		if (lInstruction === undefined) throw 'Error (prog): undefined instruction' + expressionToString(this.code)
		
		// verif number of arg
		//====================
		if ( typeof lInstruction.nbArg === 'number' ) {
			if (l_content.length !== lInstruction.nbArg+1) throw 'Error (prog): wrong number of arguments' + expressionToString(this.code)
		} else {
			if (! lInstruction.nbArg(l_content.length-1)) throw 'Error (prog): invalid number of arguments' + expressionToString(this.code)
		}
		
		// finished ?
		//===============
		let lb_finished
		if (l_content[0].content === 'seq') {
			lb_finished = (this.instrPointer >= l_content.length)
		} else if (l_content[0].content === 'if') {
			lb_finished = (this.instrPointer > 3)
		} else if ( lInstruction.postExec ) {
			lb_finished = (this.instrPointer > 2)
		} else {
			//~ console.log('autre finished')
			lb_finished = true // finished
		}
		
		// exec instructions
		//===============
		if (! lb_finished) lInstruction.exec(this, l_content)
		
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

function exec(code) {
	const mainFrame = new Frame(code, null)
	leafFrameList.push(mainFrame)
	console.log(mainFrame)
	while (  leafFrameList.some( elt=>elt.awake )  ) {
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
				l_scope.get(l_var).currBip = false
			}
		}
	}
}

function parentize(code) {
	if (code.content instanceof Array) {
		for (let child of code.content) {
			child.context.parent = code.context
			parentize(child)
		}
	} else if (code.content !== undefined && code.content.context !== undefined) {
		code.content.context.parent = code.context
		parentize(code.content)
	}
}

//~ o = peg.parse(`
//~ {seq
	//~ :set n_aRandomNumber :randomNumber 1 31
	//~ .print "Essayez un nombre : "
	//~ :set s_essai !getFromUser
	//~ :set n_essai .stringToInt s_essai
//~ }
//~ `)
//~ o = peg.parse(`
//~ {print 'ert'}
//~ `)

//~ const o = peg.parse(`
//~ {seq
	//~ .var 'ert'
	//~ .print '======> OK'
	//~ .var 45
	//~ .get 77
	//~ :set 'ert' 555
	//~ :set 'ert' 777
	//~ #(seq .print '-------#1' .print '-------#2' .print '-------#3')
	//~ .print '======> END'
//~ }
//~ `)

//~ const o = peg.parse(`
//~ {seq
	//~ .print '======> START'
	//~ .var 'ert'
	//~ .var 45
	//~ :set 'ert' 555
	//~ :set 'ert' 777
	//~ .print '======> 77a'
	//~ .print .get 'ert'
	//~ .print '======> 77b'
	//~ #(seq .print '-------#1' .print '-------#2' .print '-------#3')
	//~ .print '======> END'
//~ }
//~ `)

const o = peg.parse(`
{seq
	.print '======> START'
	.var ert
	.var aze
	:set ert 5
	:set aze 7
	{par
		.print 'qsdf'
		.print 'wxcv'
		.bip aze
		:set ert 8
		:set ert 4
	}
	{if (par true false)
		.print 'un'
		.print 'deux'
	}
	.print :+ .get ert .get aze
	#(seq .print '-------#1' .print '-------#2' .print '-------#3')
	.print '======> END'
}
`)

parentize(o)
console.log(o)
exec(o.content)
