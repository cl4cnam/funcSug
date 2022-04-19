.var dummy
%deffunc getClick (p_idElt p_evtSug)
	{ext ($p_idElt) `
		const lElt = document.getElementById(args[0])
		const l_react = function(evt) {
			lElt.removeEventListener('click', l_react)
			output()
		};
		lElt.addEventListener('click', l_react)
	` $p_evtSug}
%deffunc awaitClickBip (p_idElt)
	{seq
		.var evtSug
		(&getClick $p_idElt evtSug)
		:await evtSug bip
	}
%deffunc awaitClickBeep (p_idElt)
	{seq
		.var evtSug
		(&getClick $p_idElt evtSug)
		:await evtSug beep
	}
%deffunc displayMessage (p_message)
	{ext ($p_message) `
		const lElt = document.createElement('p')
		lElt.classList.add('display')
		lElt.classList.add('other')
		lElt.innerHTML = args[0]
		document.body.appendChild(lElt)
		lElt.scrollIntoView()
	` dummy}
%deffunc inputText (p_evtSugB)
	{ext () `
		const lElt = document.createElement('p')
		//const lElt = document.createElement('input')
		lElt.classList.add('entry')
		lElt.classList.add('self')
		lElt.setAttribute('contentEditable', 'true')
		setTimeout(O=>lElt.focus(), 0)
		const l_react = function(evt) {
			if (evt.inputType==="insertParagraph") {
				lElt.removeEventListener('beforeinput', l_react)
				lElt.setAttribute('contentEditable', 'false')
				lElt.classList.replace('entry', 'display')
				evt.preventDefault()
				//console.log('OK', evt.target.textContent)
				output(evt.target.textContent)
			}
		}
		lElt.addEventListener('beforeinput', l_react)
		document.body.appendChild(lElt)
	` $p_evtSugB}
%deffunc awaitHumanText ()
	{seq
		.var evtSugA
		(&inputText evtSugA)
		:await evtSugA beep
	}
