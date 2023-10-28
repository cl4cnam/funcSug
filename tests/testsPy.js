'use strict'

const lesTests = [



{line: new Error().lineNumber, code:`
	seq:
		print('======> START')
`, result: `
	======> START
`,},

{line: new Error().lineNumber, code:`
	print(2 + print(4))
`, result: `
4
No value
`,},

{line: new Error().lineNumber, code:`
	seq:
		print(  allEqual( |5, 4, 4| )  )
		print(  allEqual( |4, 4, 4| )  )
`, result: `
	false
	true
`,},

{line: new Error().lineNumber, code:`
	seq:
		print( parToList ( |5, 4, 49| ) )
`, result: `
	5,4,49
`,},

{line: new Error().lineNumber, code:`
	seq:
		print ( || )
`, result: `
	No value
`,},

{line: new Error().lineNumber, code:`
	seq:
		print( isNovalue( || ) )
`, result: `
	true
`,},

{line: new Error().lineNumber, code:`
	seq:
		print ( isNovalue( |5| ) )
`, result: `
	false
`,},

{line: new Error().lineNumber, code:`
	seq:
		print ( valuesFrom (|3, 4, 5|, 'butNotFrom', |3, 6| )  )
`, result: `
	4
	5
`,},

{line: new Error().lineNumber, code:`
	seq:
		print(34)
		print(56)
`, result: `
34
56
`,},

{line: new Error().lineNumber, code:`
	par:
		print(34)
		print(56)
`, result: `
34
56
`,},

{line: new Error().lineNumber, code:`
	seq:
		seq:
			print(1)
			print(2)
		seq:
			print(3)
			print(4)
`, result: `
1
2
3
4
`,},

{line: new Error().lineNumber, code:`
	par:
		seq:
			print(1)
			print(2)
		seq:
			print(3)
			print(4)
`, result: `
1
3
2
4
`,},

{line: new Error().lineNumber, code:`
	print( seq(1, 2) )
`, result: `
2
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := seq:
			45
			67
		print(a)
`, result: `
67
`,},

{line: new Error().lineNumber, code:`
	print(par(1, 2))
`, result: `
1
2
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a3
		# a3 <-- 0
`, result: `
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a3
		a3 := 0
`, result: `
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := |23, 56, 76|
		print(first(a))
`, result: `
	23
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := |23, 56, 76|
		print(rest(a))
`, result: `
	56
	76
`,},

{line: new Error().lineNumber, code:`
	seq:
		varmul a
		a := 0
		a := 1
		par:
			a += 1
			a += 2
		print(a)
`, result: `
2
3
`,},

{line: new Error().lineNumber, code:`
	seq:
		varmul a
		a := 1
		par:
			a := a + 1
			a := get('a' + '') * 2
		print(a)
`, result: `
2
2
`,},

{line: new Error().lineNumber, code:`
	if par(true, seq(false,true)):
		print('c1')
	else:
		print('deux')
`, result: `
c1
`,},

//~ {line: new Error().lineNumber, code:`
	//~ if par(
		//~ true,
		//~ seq(false,true)
	//~ ):
		//~ print('c1')
	//~ else:
		//~ print('deux')
//~ `, result: `
//~ c1
//~ `,},

{line: new Error().lineNumber, code:`
	if false:
		print('c1')
	else:
		print('two')
		print('three')
`, result: `
two
three
`,},

{line: new Error().lineNumber, code:`
	seq:
		varmul a
		a := 0
		a := 1
		par:
			a := a + 1
			a := get('a' + '' + '') * 2
		print(a)
`, result: `
2
4
`,},

{line: new Error().lineNumber, code:`
	seq:
		varmul a5
		a5 := 0
		a5 := 1
		freeze('a5')
		par:
			a5 += 1
			a5 += 2
		next('a5')
		print(a5)
`, result: `
2
3
`,},

{line: new Error().lineNumber, code:`
	seq:
		varmul a
		a := 0
		a := 1
		freeze('a')
		par:
			a += 1
			a *= 2
		unfreeze('a')
		print(a)
`, result: `
2
2
`,},

{line: new Error().lineNumber, code:`
	seq:
		varmul a
		a := 0
		a := 1
		freeze('a')
		par:
			seq:
				a := 1
				next('a')
				aggregsum('a')
				next('a')
				aggregsum('a')
			seq:
				a := 2
				next('a')
				aggregprod('a')
				next('a')
				aggregprod('a')
		unfreeze('a')
		print(a)
`, result: `
5
6
`,},

{line: new Error().lineNumber, code:`
	seq:
		varmul a
		seq:
			set('a', 1)
			set('a', 2)
		print(a)
`, result: `
2
`,},

{line: new Error().lineNumber, code:`
	seq:
		varmul a
		par:
			set('a', 1)
			set('a', 2)
		print(a)
`, result: `
1
2
`,},

{line: new Error().lineNumber, code:`
	seq:
		print('======> START')
		print(456)
		print(-789)
		print('true')
		print('true'+1)
		print(true+1)
		print(4+5-1)
		print('tru'+'e'+1)
		print('5*4=' + 5*4)
		print(5 < 4)
		print(1 > 0)
		print('======> MID')
		varmul a
		varmul b
		par( set('a',20), set('a',30) )
		par( set('b',4), set('b',5) )
		print(a-b)
		print('======> END')
`, result: `
	======> START
	456
	-789
	true
	true1
	2
	8
	true1
	5*4=20
	false
	true
	======> MID
	16
	15
	26
	25
	======> END
`,},

{line: new Error().lineNumber, code:`
	seq:
		print('======> START')
		print(true and false)
		print(true or false)
		print(not true)
		print('======> END')
`, result: `
	======> START
	false
	true
	false
	======> END
`,},

{line: new Error().lineNumber, code:`
	if par(true,false):
		print('un')
	else:
		print('deux')
`, result: `
	un
	deux
`,},

{line: new Error().lineNumber, code:`
	if true:
		print('un')
`, result: `
	un
`,},

{line: new Error().lineNumber, code:`
	if false:
		print('un')
`, result: `
`,},

{line: new Error().lineNumber, code:`
	if true:
		print('un')
	else:
		print('deux')
`, result: `
	un
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 0
		var b := 1
		js(['a', 'b'], 'console.log("coucou")')
`, result: `
	coucou
`,},

{line: new Error().lineNumber, code:`
	seq:
		print( listToPar( short([],'return [5,6]') ) )
`, result: `
	5
	6
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 2
		var b := 5
		print( short( ['a', 'b'], 'return (b+1)*(a+3)') )
`, result: `
	30
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 0
		var b := 1
		ext( ['a', 'b'], 'console.log("coucou")' )
`, result: `
	coucou
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 0
		var b := 38
		ext( ['a', 'b'], 'console.log(b)' )
`, result: `
	38
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 0
		var b := 1
		ext( ['a', 'b'], 'output(45)', 'a')
		print(a)
`, result: `
0
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 0
		var b := 1
		var c
		ext( ['a', 'b'], 'output(45)', 'c')
		print( await( 'c', 'beep' ) )
		print( isBeep('c') )
`, result: `
	45
	false
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 0
		var b := 1
		var c
		ext( ['a', 'b'], 'output(45)', 'c')
		awaitBool(isBeep('c'))
		print(c)
		print( isBeep('c') )
`, result: `
	45
	true
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 0
		var b := 1
		var c
		ext( ['a', 'b'], 'output(45)', 'c')
		print(await('c', 'bip'))
		print(isBip('c'))
		print(isBeep('c'))
		stopBeep('c')
		print(isBeep('c'))
`, result: `
	45
	false
	true
	false
`,},

{line: new Error().lineNumber, code:`
	seq:
		var qwerty3
		seq: @qwerty3
			var boite
			set('boite', Namespace())
`, result: `
`,},

{line: new Error().lineNumber, code:`
	seq:
		var qwerty
		seq: @qwerty
			var boite
			set('boite',Namespace())
			setToNamespace(boite, 'a', 34)
			print(getFromNamespace(boite, 'a'))
			setToNamespace(boite, 'a', 56)
			print(getFromNamespace(boite, 'a'))
`, result: `
34
56
`,},

{line: new Error().lineNumber, code:`
	seq:
		var box
		set('box',Namespace())
		setToNamespace(box, 'a', 34)
		print(box:a)
`, result: `
34
`,},

{line: new Error().lineNumber, code:`
	seq:
		var box
		set('box',Namespace())
		setToNamespace(box, 'internBox', Namespace())
		setToNamespace( getFromNamespace(box, 'internBox'), 'a', 56 )
		print(box:internBox:a)
`, result: `
56
`,},

{line: new Error().lineNumber, code:`
	seq:
		var box
		set('box',Namespace())
		box:a := 34
		print(getFromNamespace(box, 'a'))
`, result: `
34
`,},

{line: new Error().lineNumber, code:`
	seq:
		var box
		set('box',Namespace())
		setToNamespace(box, 'internBox', Namespace())
		setToNamespace(box:internBox, 'a', 56)
		print( getFromNamespace(box:internBox, 'a') )
`, result: `
56
`,},

{line: new Error().lineNumber, code:`
	seq:
		var box
		set('box',Namespace())
		setToNamespace(box, 'internBox', Namespace())
		setToNamespace(box:internBox, 'a', 56)
		print( box:internBox:a )
`, result: `
56
`,},

{line: new Error().lineNumber, code:`
	seq:
		var box
		set('box', Namespace())
		setToNamespace(box, 'internBox', Namespace())
		box:internBox:a := 56
		print(box:internBox:a)
`, result: `
56
`,},

{line: new Error().lineNumber, code:`
	seq:
		def test():
			78
		print(test())
`, result: `
78
`,},

{line: new Error().lineNumber, code:`
	seq:
		def test(p_bool):
			if p_bool:
				78
			else:
				45
		print(test(false))
		print(test(true))
`, result: `
45
78
`,},

{line: new Error().lineNumber, code:`
	seq:
		def test(:parame):
			print(getFromNamespace(parame, 1))
			print(getFromNamespace(parame, 'PARAMLENGTH'))
		test(34, 57)
`, result: `
57
2
`,},

{line: new Error().lineNumber, code:`
	seq:
		def test(:parame):
			print(parame:1)
		test(34, 57)
`, result: `
57
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a:= seq:
			99
			4
			56
			309
		print(a)
`, result: `
309
`,},

{line: new Error().lineNumber, code:`
	seq:
		def plus(_x, p_y):
			_x  + p_y
		print(plus(5, 8))
`, result: `
13
`,},

{line: new Error().lineNumber, code:`
	seq:
		def ifa (p_cond, _action):
			if p_cond:
				_action
		blockCall1 ifa false:
			print(61)
`, result: `
`,},

{line: new Error().lineNumber, code:`
	seq:
		match 63:
			case 54:
				print('==NO==')
			case par(44, 63, 77):
				print('OK')
			case 2:
				print('--NO--')
`, result: `
OK
`,},

{line: new Error().lineNumber, code:`
	seq:
		match 63:
			case 54:
				print('==NO==')
			case par(44, 63, 77):
				print('OK')
				print('===')
			case 2:
				print('--NO--')
`, result: `
OK
===
`,},

{line: new Error().lineNumber, code:`
	seq:
		match 63:
			case 54:
				print('==NO==')
			case par(44, 63, 77):
				print('OK')
				print('===')
			case 3:
				print('--NO--')
				print('------')
			case 2:
				print('--NO NO--')
				print('---------')
`, result: `
OK
===
`,},

{line: new Error().lineNumber, code:`
	seq:
		var azer
		var qwertz
		seq: @azer
			var a
			set('a', 0)
			#{while :< $a 1000
			while a < 3:
				seq: @qwertz
					print(a)
					a := a + 1
					a
`, result: `
0
1
2
`,},

{line: new Error().lineNumber, code:`
	seq:
		var azerty
		var qwertz
		seq: @azerty
			var a
			set('a', 0)
			#.break azerty
			while a < 3:
				seq: @qwertz
					print(a)
					a := a + 1
					a
`, result: `
0
1
2
`,},

{line: new Error().lineNumber, code:`
	seq:
		var thePar5
		par: @thePar5
			awaitForever()
			break thePar5
		print(54)
`, result: `
54
`,},

{line: new Error().lineNumber, code:`
	seq:
		var thePar
		echo par: @thePar
			awaitForever()
			set('thePar', short([], 'return {returnValue: 92}') )
`, result: `
92
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theLoop
		var a
		set('a', 0)
		while a < 3: @theLoop
			print(a)
			break theLoop
			a := a + 1
			a
		var b
`, result: `
0
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 0
		while a < 3:
			var b := 'OK'
			print(a)
			print(b)
			a := a + 1
`, result: `
0
OK
1
OK
2
OK
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theSeq
		seq: @theSeq
			print(45)
			break theSeq
			print('x')
			print('y')
		onBreak:
			print('*')
`, result: `
45
*
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theSeq
		var a
		set('a', 0)
		while a < 3:
			seq: @theSeq
				print(a)
				a := a + 1
				break theSeq
				print('x')
				print('y')
			onBreak:
				print('*')
		var b
`, result: `
0
*
1
*
2
*
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theWhile
		var a
		set('a', 0)
		while a < 3: @theWhile
			print(a)
			a := a + 1
			break theWhile
			print('x')
			print('y')
		onBreak:
			print('*')
		var b
`, result: `
0
*
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theWhile
		var a
		set('a', 0)
		while a < 3: @theWhile
			print(a)
			a := a + 1
			break theWhile
			print('x')
			print('y')
		onBreak:
			print('*' + a)
		var b
`, result: `
0
*1
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theSeq
		seq: @theSeq
			var a
			set('a', 0)
			while a < 3:
				print(a)
				a := a + 1
				break theSeq
				print('x')
				print('y')
			onBreak:
				print('*')
			print('z')
		print('w')
`, result: `
0
*
w
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a
		set('a', par(4,7))
		print(a)
`, result: `
4
7
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := par(4,7)
		print(a)
`, result: `
4
7
`,},

{line: new Error().lineNumber, code:`
	seq:
		var nm := Namespace()
		nm:a := par(4,7)
		print(nm:a)
`, result: `
4
7
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := par(4, 7)
		par inside a:
			print(a)
`, result: `
4
7
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := par(4, 7)
		par inside a:
			print(a)
			print(a_N)
`, result: `
4
7
0
1
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theMix
		mix: @theMix
			while true:
				break theMix
		print(77)
`, result: `
77
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theMix
		var evt
		mix: @theMix
			awaitBeep evt
			awaitBeep evt
			break theMix
		print(77)
`, result: `
77
`,},

{line: new Error().lineNumber, code:`
	seq:
		var n := Namespace()
		n:a := 53
		echo awaitBeep n:a
`, result: `
53
`,},

{line: new Error().lineNumber, code:`
	seq:
		repeat 0:
			print(77)
`, result: `
`,},

{line: new Error().lineNumber, code:`
	seq:
		var w := short([], 'return window')
		#.print :getFromObject $w document
		setToObject(w, 'aa', 45)
		print(getFromObject(w, 'aa'))
`, result: `
	45
`,},

{line: new Error().lineNumber, code:`
	seq:
		repeat 1:
			print(77)
`, result: `
77
`,},

{line: new Error().lineNumber, code:`
	seq:
		repeat 3:
			print(77)
`, result: `
77
77
77
`,},

{line: new Error().lineNumber, code:`
	seq:
		def change(p_variable):
			set(p_variable, 45)
		var aVariable
		change('aVariable')
		print(aVariable)
`, result: `
45
`,},

{line: new Error().lineNumber, code:`
	seq:
		print(parRange(3, 5))
`, result: `
3
4
5
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := par(45)
		par inside a:
			print(a)
`, result: `
45
`,},

{line: new Error().lineNumber, code:`
	seq:
		print(listToPar(short([], 'return [76]')))
`, result: `
76
`,},

{line: new Error().lineNumber, code:`
	seq:
		print(listToPar(short([], 'return [76,54]')))
`, result: `
76
54
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := parallel||
			5
		||
			6
		print(a)
`, result: `
5
6
`,},

{line: new Error().lineNumber, code:`
	seq:
		var seqLabel
		var a := parallel ||
			@seqLabel
			5
		||
			6
		print(a)
`, result: `
6
5
`,},

{line: new Error().lineNumber, code:`
	seq:
		var seqLabel
		var seqLabel2
		var parLabel
		var a := parallel || @parLabel
			@seqLabel
			5
		||
			@seqLabel2
			6
		print(a)
`, result: `
5
6
`,},

{line: new Error().lineNumber, code:`
	seq:
		def par_race(:__par):
			var all
			par inside __par: @all
				__par
				break all
		blockCall0 par_race:
			seq:
				var a
				var b
				print('KO')
			seq:
				print('OK')
`, result: `
OK
`,},

{line: new Error().lineNumber, code:`
	seq:
		def foreach_race(p_vari, _expr):
			var all
			blockCall1 foreach p_vari: @all
				_expr
				break all
		var value := par(1, 2)
		blockCall1 foreach_race 'value':
			seq:
				if value = 1:
					var a
					var b
				print(value)
`, result: `
2
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theSeq
		var togglePause := 2
		par:
			seq: @theSeq
				print('A1')
				print('A2')
				print('A3')
				print('A4')
				print('A5')
				print('A6')
				print('A7')
			seq:
				print('B1')
				theSeq := togglePause
				print('Binter1')
				print('Binter2')
				print('Binter3')
				print('Binter4')
				print('Binter5')
				theSeq := togglePause
`, result: `
B1
A1
A2
Binter1
Binter2
Binter3
Binter4
Binter5
A3
A4
A5
A6
A7
`,},

{line: new Error().lineNumber, code:`
	seq:
		var theSeq
		par:
			seq: @theSeq
				print('A1')
				print('A2')
				print('A3')
			seq:
				print('B1')
				print('B2')
				theSeq := 1
`, result: `
B1
A1
B2
A2
A1
A2
A3
`,},

{line: new Error().lineNumber, code:`
	seq:
		var a := 3
		var suppl7
		par supplBranchBy suppl7:
			while a > 0:
				print(a)
				a -= 1
			spawn suppl7:
				print('Hello!')
`, result: `
Hello!
3
2
1
`,},

{line: new Error().lineNumber, code:`
	seq:
		def breakReturn (p_vari, p_valRet):
			set(p_vari, short( ['p_valRet'], 'return {returnValue: p_valRet}')  )
		def foreach_race_mult (p_vari, p_mult, _expr):
			var all
			varmul retValMul
			var mult
			blockCall1 foreach p_vari: @all
				set('retValMul', _expr)
				if multiplicity(retValMul) = p_mult:
					breakReturn('all', retValMul)
		#.setDebug 5
		var a := |2, 3, 4|
		echo blockCall2 foreach_race_mult 'a' 2:
			if a = 3:
				awaitForever()
			else:
				a
`, result: `
	2
	4
`,},

{line: new Error().lineNumber, code:`
	seq:
		def breakReturn (p_vari, p_valRet):
			blockCall1 set p_vari:
				#short( ['p_valRet'], 'return {returnValue: p_valRet}')
				js (p_valRet):
					return {returnValue: p_valRet}
		def foreach_race_mult (p_vari, p_mult, _expr):
			var all
			varmul retValMul
			var mult
			blockCall1 foreach p_vari: @all
				set('retValMul', _expr)
				if multiplicity(retValMul) = p_mult:
					breakReturn('all', retValMul)
		#.setDebug 5
		var a := |2, 3, 4|
		echo blockCall2 foreach_race_mult 'a' 2:
			if a = 3:
				awaitForever()
			else:
				a
`, result: `
	2
	4
`,},


]





async function main() {



{
	const oldLog = console.log
	let res = ''
	let diff = -1
	console.log = function(...args) {
		res += args + '\n'
	}
	
	for (const progTestIndex in lesTests) {
		//~ if (progTestIndex != lesTests.length - 1) continue
		const progTest = lesTests[progTestIndex]
		res = ''
		try {
			if (progTest.code!=='') {
				let startTime = performance.now()
				//~ oldLog('startTime', startTime)
				const lCode = progTest.code.replaceAll('\n\t','\n')
				execProg(lCode, undefined, true, pegPy)
				diff = performance.now() - startTime
				//~ oldLog('endTime', performance.now())
			}
		} catch (err) {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' line ' + progTest.line + ' : -------- SYNTAX ERROR OR BUG--------')
			oldLog(progTest.code)
			oldLog(progTest.result.replaceAll('\n\t','\n').trim())
			throw err
		}
		await new Promise(resolve=>{setTimeout(()=>{resolve(1)},0)})
		if (res.trim()===progTest.result.replaceAll('\n\t','\n').trim()) {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' line ' + progTest.line + ' : OK (time: ' + diff + ')')
		} else {
			oldLog('test ' + (parseInt(progTestIndex)+1) + ' line ' + progTest.line + ' : RESULT ERROR')
			oldLog(res.trim())
			oldLog(progTest.result.replaceAll('\n\t','\n').trim())
			break
		}
		await new Promise(resolve=>{setTimeout(()=>{resolve(1)},0)})
	}
	
	console.log = oldLog
}




}


main()

