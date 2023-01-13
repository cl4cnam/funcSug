# **funcSug**

This is a new concurrent programming language (in progress, but it already works) loosely based on https://github.com/LordManta/SugarCubesJS of Jean-Ferdy Susini.

In this language, you can write
```
{par
    <parallelBranch1>
    <parallelBranch2>
}
```
to execute ```parallelBranch1``` and ```parallelBranch2``` concurrently.

### Get a taste of the language
See [the 'Guess the Number' code](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumber.fg)
and [test it](https://cl4cnam.github.io/Guess_the_number/guessTheNumber.html).

You may also want to have a look at:
- [the 'Breakout' code](https://github.com/cl4cnam/breakout/blob/main/breakout.fg)
and [test it](https://cl4cnam.github.io/breakout/breakout.html).
- [the 'Mini Sweet' code](https://github.com/cl4cnam/miniSweet/blob/main/miniSweet.fg)
and [test it](https://cl4cnam.github.io/miniSweet/miniSweet.html).

Don't look too hard at my syntax (I intend to change it into a pythonic syntax). Look instead at the [global structure of the code](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumber.fg): One cannot follow this structure in usual programming language.
- In ['Guess the Number'](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumber.fg), ```gameCourse``` is just a function that returns only when the player has found the number. At that moment, ```gameCourse``` returns the number of steps.
- In ['Breakout'](https://github.com/cl4cnam/breakout/blob/main/breakout.fg), ```lifeOfBrick``` is just a function that returns only when the brick is broken. The same goes for the ```lifeOfBall``` function.

### Note

For now, this language has no syntax highlighting, but if you choose that of zephir (or nsis, powershell, ruby), it can be pleasant.

The file ```parser.js``` has been generated online from the file ```funcSug.peggyjs``` on the site https://peggyjs.org/online.html with "parser variable" set to "peg".

### Use

In your ```myProgram.html```, in the end of the body element, include the lines:
```
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/libStd.fg" type="application/funcsug"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/libDOM.fg" type="application/funcsug"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/libDOMSVG.fg" type="application/funcsug"></script>
  <script src="myProgram.fg" type="application/funcsug"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/parser.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/interpreter.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/DOMloader.js"></script>
```
Write your code in the file ```myProgram.fg```.

### Syntax elements

In many language, a function call is expressed by adding parentheses at right:
```functionName(arg1, ..., argN)```.<br>
In this language too, a function call is expressed by adding parentheses but around:
```(functionName arg1 ... argN)``` (Yes, this is lisp syntax).<br>
You can replace parentheses with curly braces "{}".

To avoid too many parentheses, there are a few shortcuts:<br>
- ```!functionName``` is a shortcut for ```(functionName)```
- ```.functionName arg1``` is a shortcut for ```(functionName arg1)```
- ```:functionName arg1 arg2``` is a shortcut for ```(functionName arg1 arg2)```
- ```%functionName arg1 arg2 arg3``` is a shortcut for ```(functionName arg1 arg2 arg3)```

Here is a syntax variant:<br>
```[arg1 ... argN functionName arg(N+1)]``` is ```(functionName arg1 ... argN arg(N+1))```

To get the value of a variable, precede it by the '$' sign'.

In any expression, you can insert ``` @label ``` just after the function name to label the expression (This is useful for the ```break``` instruction).
This 'label' must be a declared variable.

### A few instructions/expressions (loose description)

```.print value``` writes ```value``` onto the console.

```.var variableName``` declares a new local variable.

```[variableName <-- value]``` assigns  ```value``` to ```variableName```.

```variableName <-- value``` (on its own line) assigns  ```value``` to ```variableName```.

```variableName <-- [+ value]``` (on its own line) increments  ```variableName``` by ```value``` (also for `-`,`*`,`/` operators).

```$variableName``` returns the value of ```variableName```.

```[value1 + value2]``` returns the sum/concatenation of the two values (also for `-`,`*`,`/`,`mod`).

```[value1 < value2]``` returns the truth value of ```value1 < value2``` (also for `<=`,`=`,`/=`, `and`, `or`).

```:randomIntBetween value1 value2``` returns a random integer between ```value1``` and ```value2```.

```{if condition thenBranch else elseBranch}``` acts as usual (```else elseBranch``` is optional).

```{while condition instruction1 ... instructionN}``` repeats ```instruction1 ... instructionN``` while ```condition``` returns true.

```{seq expression1 ... expressionN}``` executes the expressions in sequence and returns the value of the last.

```{par expression1 ... expressionN}``` executes the expressions in parallel.

```{mix expression1 ... expressionN}``` executes the expressions in parallel but variable values does not split.

```.break label``` interrupts the execution of the expression labelled by ```label```.

```~ expression``` executes ```expression``` if the preceding expression is interrupted.

```{deffunc functionName parameterList instruction1 ... instructionN}``` defines the custom function ```functionName```.

```{short (variable1 ... variableN) jsString}``` executes the code in ```jsString``` (in which ```variable1 ... variableN``` can be used).

```:displayNewMessageIn text cssSelector``` displays a new message ```text``` into the DOM element identified by ```cssSelector```.

```:displayNewMessageIn text cssSelector/cssClass``` displays a new message ```text``` into the DOM element identified by ```cssSelector``` and assigns ```cssClass``` to it.

```.awaitNewHumanNumberIn cssSelector``` awaits a number from user in the DOM element identified by ```cssSelector```.

```.awaitClickBeep cssSelector``` awaits a click from user in the DOM element identified by ```cssSelector```.

In progress.
