'use strict'

const $ = document.querySelector.bind(document) 

function adaptString(p_text) {
	const ls_text = p_text.replaceAll()
	return ls_text
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
			//~ console.warn(value)
			for (const elt of value) {
				lElt_anchor.insertAdjacentHTML('beforeend', elt)
			}
		}
	}
}

function inputHook(ps_genus, ps_species) {
	//~ console.log(ps_genus, ps_species)
	if (ps_genus === 'seconds') {
		setTimeout(function() {
			runBurst({
				type: {genus: ps_genus, species: ps_species},
				value: undefined
			})
		}, ps_species * 1000)
	} else if (ps_genus === 'textIsEntered') {
			const react = function(evt) {
				if (evt.inputType==="insertParagraph") {
					evt.target.removeEventListener('beforeinput', react)
					evt.target.setAttribute('contentEditable', 'false')
					evt.target.classList.replace('entry', 'display')
					//~ console.log(evt.target.innerHTML)
					evt.preventDefault()
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
	} else {
		const react = function(evt) {
			runBurst({
				type: {genus: ps_genus, species: ps_species},
				value: evt
			})
		}
		//~ $(ps_species).addEventListener(ps_genus.slice(2, -2), react, {once: true})
		$(ps_species).addEventListener(ps_genus, react, {once: true})
	}
}
