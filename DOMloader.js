'use strict'

const theScripts = document.querySelectorAll('script[type="application/funcsug"]')
const scriptPromises = Array.from(theScripts).map(scriptElt=>fetch(scriptElt.src))
Promise.all(scriptPromises).then((values)=>{
	const valPromises =    values.map(  val  =>  (val.text())  )
	Promise.all(valPromises).then((texts)=>{
		const l_texts = texts.filter(elt => ! elt.startsWith('<!doctype'))
		const l_infoTexts = l_texts.map((text,idx)=>({
			source: values[idx].url.split(/\//).pop(),
			len: text.split(/\r\n|\r|\n/).length
		}))
		const f_getLocation = function(pn_lineNumber, p_infoTexts=l_infoTexts) {
			let linesTotal = 1
			for (const info of p_infoTexts) {
				const prevLinesTotal = linesTotal
				linesTotal += info.len
				if (pn_lineNumber<=linesTotal) {
					return {
						source: info.source,
						line: pn_lineNumber - prevLinesTotal
					}
				} 
			}
			return {
				source: '?', 
				line: pn_lineNumber
			}
		}
		//~ const completeText = '{seq \n' + texts.join('\n') + '\n }'
		const completeText = '{seq \n' + l_texts.join('\n') + '\n }'
		execProg(completeText, f_getLocation)
	})
})
//~ Promise.allSettled(scriptPromises).then((values)=>{
	//~ console.log(values)
//~ })
