.var dummy

#====================================
# Click functions
#====================================

%deffunc getClick (p_idElt p_evtSug)
#        --------
	{ext ($p_idElt) `
		const lElt = document.querySelector(args[0])
		lElt.disabled = false
		if (lElt===null) console.log("ERROR !!! libDOM.fs/getClick '" + args[0] + "' selector references no element!")
		const l_react = function(evt) {
			lElt.removeEventListener('click', l_react)
			lElt.disabled = false
			output()
		};
		lElt.addEventListener('click', l_react)
	` $p_evtSug}

%deffunc awaitClickBip (p_idElt)
#        -------------
	{seq
		.var evtSug
		(&getClick $p_idElt evtSug)
		:await evtSug bip
	}

%deffunc awaitClickBeep (p_idElt)
#        --------------
	{seq
		.var evtSug
		(&getClick $p_idElt evtSug)
		:await evtSug beep
	}

#====================================
# Display functions
#====================================

%deffunc displayNewMessageIn (p_message p_idAnchor)
#        -------------------
	{ext ($p_message $p_idAnchor) `
		const lList_idAnchor = args[1].split('/')
		const ls_idAnchor = lList_idAnchor[0]
		const ls_class = (lList_idAnchor.length>1) ? lList_idAnchor[1] : 'other'
		const lElt_anchor = document.querySelector(ls_idAnchor)
		if (lElt_anchor===null) console.log("ERROR !!! libDOM.fs/displayNewMessageIn '" + ls_idAnchor + "' selector references no element!")
		const lElt = document.createElement('p')
		lElt.classList.add('display')
		lElt.classList.add(ls_class)
		lElt.innerHTML = args[0]
		lElt_anchor.appendChild(lElt)
		lElt.scrollIntoView()
	` dummy}

%deffunc displayNewMessage (p_message)
#        -----------------
	(&displayNewMessageIn $p_message 'body')

%deffunc displayMessageIn (p_message p_idAnchor)
#        ----------------
	{ext ($p_message $p_idAnchor) `
		const lElt_anchor = document.querySelector(args[1])
		if (lElt_anchor===null) console.log("ERROR !!! libDOM.fs/displayMessageIn '" + args[1] + "' selector references no element!")
		lElt_anchor.innerHTML = args[0]
		lElt_anchor.scrollIntoView()
	` dummy}

#====================================
# Input functions
#====================================

%deffunc inputNewHumanTextIn (p_evtSugB p_idAnchor)
#        -------------------
	{ext ($p_idAnchor) `
		const lElt_anchor = document.querySelector(args[0])
		if (lElt_anchor===null) console.log("ERROR !!! libDOM.fs/inputNewHumanTextIn '" + args[0] + "' selector references no element!")
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
		lElt_anchor.appendChild(lElt)
	` $p_evtSugB}

%deffunc inputNewHumanText (p_evtSugB)
#        -----------------
	(&inputNewHumanTextIn $p_evtSugB 'body')

%deffunc awaitNewHumanTextIn (p_idAnchor)
#        -------------------
	{seq
		.var evtSugA
		(&inputNewHumanTextIn evtSugA $p_idAnchor)
		:await evtSugA beep
	}

%deffunc awaitHumanText ()
#        --------------
	{seq
		.var evtSugA
		(&inputNewHumanText evtSugA)
		:await evtSugA beep
	}
