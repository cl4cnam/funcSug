.var numberToGuess
.var tryNumber
:set numberToGuess :randomIntBetween 0 255
:set tryNumber 'not_defined'
.print $numberToGuess

(&displayMessage 'Guess my number (between 0 and 255)!')
{while :/= $tryNumber $numberToGuess
	{seq
		:set tryNumber (&awaitHumanText)
		{if :< $tryNumber $numberToGuess (&displayMessage 'Too low! Try again!')}
		{if :> $tryNumber $numberToGuess (&displayMessage 'Too high! Try again!')}
		{if := $tryNumber $numberToGuess (&displayMessage 'Well Done!')}
	}
}
