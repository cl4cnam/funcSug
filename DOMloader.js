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
			let lastInfo = undefined
			for (const info of p_infoTexts) {
				const prevLinesTotal = linesTotal
				linesTotal += info.len
				lastInfo = info
				if (pn_lineNumber<=linesTotal) {
					return {
						source: info.source,
						line: pn_lineNumber - prevLinesTotal
					}
				} 
			}
			return {
				source: (lastInfo===undefined) ? '?' : '!!beyond ' + lastInfo.source + ' in end of added code "{seq ... }"!!',
				line: pn_lineNumber - linesTotal
			}
		}
		const completeText = '{seq \n' + l_texts.join('\n') + '\n }'
		execProg(completeText, f_getLocation, true)
	})
})
//~ Promise.allSettled(scriptPromises).then((values)=>{
	//~ console.log(values)
//~ })
