const $ = document.getElementById.bind(document)
function switchState(versRestart) {
	$('button1').disabled = versRestart
	$('button2').disabled = versRestart
	$('restart').disabled = ! versRestart
}

switchState(false)
$('button1').addEventListener('click', evt=>{
	$('reponse').innerHTML = 'Des chaussettes'
	switchState(true)
});
$('button2').addEventListener('click', evt=>{
	$('reponse').innerHTML = 'Des gants'
	switchState(true)
});
$('restart').addEventListener('click', evt=>{
	$('reponse').innerHTML = 'Choisis ta question !'
	switchState(false)
});
