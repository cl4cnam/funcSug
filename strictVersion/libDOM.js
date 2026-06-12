'use strict'

const $ = document.querySelector.bind(document) 

function adaptString(ps_text) {
	const ls_text = ps_text.replaceAll('{', '<p class="display other">').replaceAll('}', '</p>').replaceAll('___', '<p class="display self"></p>')
	return ls_text
}

function getHostFunc() {
	return `function other(ps_text) {return '<p class="display other">' + ps_text + '</p>'};`
}

function outputHook(pState) {
	$('body').innerHTML = ''
	//~ console.warn(pState)
	for (const [key, value] of pState) {
		//~ if (key.genus === 'display') {
		if (key.split('$$$')[0] === 'display') {
			//~ const ls_anchorSelector = key.species
			const ls_anchorSelector = key.split('$$$')[1]
			const lElt_anchor = $(ls_anchorSelector)
			//~ console.warn('value', value)
			//~ l_value = (value instanceof Array) ? value : [value]
			for (const elt of value) {
				//~ console.log('elt', elt)
				lElt_anchor.insertAdjacentHTML('beforeend', adaptString(elt))
			}
		}
	}
}

function clearInputHook(pAst) {
	if (pAst?.type === 'expression') {
		//~ console.warn('----', pAst)
		if (pAst.reaction) {
			//~ console.warn('++++')
			if (pAst.reaction.type = 'timeout') clearTimeout(pAst.reaction.value)
			else if(pAst.reaction.type = 'listener') pAst.reaction.value[0].removeEventListener(...pAst.reaction.value.slice(1))
		}
		if (pAst.type === 'expression') {
			for (const ast of pAst.content) {
				clearInputHook(ast)
			}
		}
	}
}

function inputHook(ps_genus, ps_species, pAst) {
	//~ console.log(ps_genus, ps_species)
	if (ps_genus === 'seconds') {
		const timeoutId = setTimeout(function() {
			//~ console.warn('timeout', pAst)
			pAst.reaction = undefined
			runBurst({
				type: {genus: ps_genus, species: ps_species},
				value: undefined
			})
		}, ps_species * 1000)
		pAst.reaction = {type: 'timeout', value: timeoutId}
	} else if (ps_genus === 'textIsEntered') {
			const react = function(evt) {
				if (evt.inputType==="insertParagraph") {
					evt.target.removeEventListener('beforeinput', react)
					evt.target.setAttribute('contentEditable', 'false')
					evt.target.classList.replace('entry', 'display')
					//~ console.log('innerHTML', evt.target.innerHTML)
					evt.preventDefault()
					//~ console.warn('listener', pAst)
					pAst.reaction = undefined
					runBurst({
						type: {genus: ps_genus, species: ps_species},
						value: evt.target.innerHTML
					})
				}
			}
			setTimeout(O=>{
				$(ps_species).classList.add('entry')
				$(ps_species).setAttribute('contentEditable', 'true')
				$(ps_species).focus()
				$(ps_species).addEventListener('beforeinput', react)
			}, 0)
		pAst.reaction = {type: 'listener', value: [$(ps_species), 'beforeinput', react]}
	} else {
		const react = function(evt) {
			pAst.reaction = undefined
			runBurst({
				type: {genus: ps_genus, species: ps_species},
				value: evt
			})
		}
		//~ $(ps_species).addEventListener(ps_genus.slice(2, -2), react, {once: true})
		$(ps_species).addEventListener(ps_genus, react, {once: true})
		pAst.reaction = {type: 'listener', value: [$(ps_species), ps_genus, react, {once: true}]}
	}
}
