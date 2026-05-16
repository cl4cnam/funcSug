'use strict'

const $ = document.querySelector.bind(document) 

function outputHook(pState) {
	const display = state.__display__
	$('body').innerHTML = ''
	if (display) {
		for (const elt of display) {
			const [ls_anchorSelector, ls_content] = elt.split('$$')
			const lElt_anchor = $(ls_anchorSelector)
			lElt_anchor.insertAdjacentHTML('beforeend', ls_content)
		}
	}
}

function inputHook(ps_genus, ps_species) {
	if (ps_genus === '__seconds__') {
		setTimeout(function() {
			runBurst({
				type: {genus: ps_genus, species: ps_species},
				value: undefined
			})
		}, ps_species * 1000)
	} else if ( ps_genus.startsWith('__') && ps_genus.endsWith('__') ) {
		const ls_evtType = ps_genus.slice(2, -2)
		if (ls_evtType === 'textIsEntered') {
			const react = function(evt) {
				if (evt.inputType==="insertParagraph") {
					evt.target.removeEventListener('beforeinput', react)
					evt.target.setAttribute('contentEditable', 'false')
					evt.target.classList.replace('entry', 'display')
					//~ console.log(evt.target.innerHTML)
					evt.preventDefault()
					runBurst({
						type: {genus: ps_genus, species: ps_species},
						value: evt
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
			$(ps_species).addEventListener(ps_genus.slice(2, -2), react, {once: true})
		}
	}
}
