
# **FuncSug**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;![logo](https://github.com/cl4cnam/funcSug/assets/40176886/2d4c08b3-6f96-4acd-b993-b9bbe0df6b91)

This is a new programming language. Its goal is to enable a specific better **structure of code** (that is, a more natural and more readable structure): **the concurrent way**. If you're curious, you can read the [breakout example code](https://github.com/cl4cnam/breakout/blob/main/breakoutPy.fg).

It's loosely based on [SugarCubes](https://github.com/LordManta/SugarCubesJS) of Jean-Ferdy Susini. It adheres to "[structured concurrency](https://en.wikipedia.org/wiki/Structured_concurrency)" principles. It doesn't use OS threads.

For now, it's just a quick and dirty interpreter but it works enough to be appreciated.

## Features

### Parallel construct
> Beware that this is just a logical parallelism.

You can write
```
par:
    <parallelBranch1>
    <parallelBranch2>
```
to execute ```parallelBranch1``` and ```parallelBranch2``` concurrently.

You can also add a branch dynamically.

### Interruptible sequence
You can interrupt (`break`), pause (`pause`), resume (`resume`) or restart (`restart`) a block. For example:
```
par:
    seq: @myBlock
        <instruction1>
        <instruction2>
    seq:
        break myBlock
```
### Reaction to a change of a variable
You can react to a change of a variable, for example, like this:
```
seq:
    awaitBeep myVariable
    <whatToDoInThisCase>
```

## Get a taste of the language
See [the 'Breakout' code](https://github.com/cl4cnam/breakout/blob/main/breakoutPy.fg)
and [test it](https://cl4cnam.github.io/breakout/breakoutPy.html).

You may also want to have a look at:
- [the 'Guess the Number' code](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumberPy.fg)
and [test it](https://cl4cnam.github.io/Guess_the_number/guessTheNumberPy.html).
- [the 'Mini Sweet' code](https://github.com/cl4cnam/miniSweet/blob/main/miniSweetPy.fg)
and [test it](https://cl4cnam.github.io/miniSweet/miniSweetPy.html).
- [the 'Aquarium' code](https://github.com/cl4cnam/aquarium/blob/main/aquariumPy.fg)
and [test it](https://cl4cnam.github.io/aquarium/aquariumPy.html).

Look at the **global structure of the code**: One cannot follow this structure in usual programming language.

Let's take, for example, [the 'Breakout' code](https://github.com/cl4cnam/breakout/blob/main/breakoutPy.fg):

In this language, there is no need to build a brick object, just call a function ```lifeOfBrick```.
You just run multiple ```lifeOfBrick```, a ```lifeOfBall``` and a ```lifeOfPaddle``` in parallel.
These functions do not build objects: they are just like any classical function.
<br>(The line just after the call of ```lifeOfBrick``` is executed only when the brick is broken, that is only when ```lifeOfBrick``` has returned, just like any classical function call).<br>
In the body of ```lifeOfBrick```, just code the various behaviors of the brick in parallel.

In ['Guess the Number'](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumber.fg), ```gameCourse``` is just a function. The line just after the call of ```gameCourse``` is executed only when the player has found the number, that is only when ```gameCourse``` has returned, just like any classical function call.

You can also test snippets [here](https://cl4cnam.github.io/FuncSugREPL/replPy.html).

## Note

This language has [syntax highlighting for Geany](https://github.com/cl4cnam/funcSug/tree/main/tools/forGeany); otherwise, with Geany, if you choose that of zephir (or nsis, powershell, ruby), it can be pleasant.

The file ```parserPy.js``` has been generated online from the file ```funcSugPy.peggyjs``` on the site https://peggyjs.org/online.html with "parser variable" set to "pegPy".

## Use

In your ```myProgram.html```, in the end of the body element, include the lines:
```
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/libStd.fg" type="application/funcsug"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/libDOM.fg" type="application/funcsug"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/libDOMSVG.fg" type="application/funcsug"></script>
  <script src="myProgram.fg" type="application/funcsug"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/parser.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/parserPy.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/interpreter.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/DOMloader.js"></script>
```
Write your code in the file ```myProgram.fg```.

## Syntax elements

The syntax is very similar to that of Python.

After the colon ```:``` of some blocks, you can add ``` @label ``` just after the function name to label the expression (This is useful for the ```break``` instruction).
This 'label' must be a declared variable.

## A few instructions/expressions (loose description)

```print(value)``` writes ```value``` onto the console.

```var variableName``` declares a new local variable.

```variableName := value``` assigns  ```value``` to ```variableName```.

```variableName += value``` increments  ```variableName``` by ```value``` (also for `-`,`*`,`/` operators).

```true``` and ```false``` returns the boolean value 'true' and 'false' respectively.

```value1 + value2``` returns the sum/concatenation of the two values (also for `-`,`*`,`/`,`mod`).

```value1 < value2``` returns the truth value of ```value1 < value2``` (also for `<=`,`=`,`/=`, `and`, `or`).

```randomIntBetween(value1, value2)``` returns a random integer between ```value1``` and ```value2```.

```if```, ```while```, ```def``` acts as usual in Python.

```break label``` interrupts the execution of the expression labelled by ```label```.

```
seq:
	expression1
	...
	expressionN
```
executes the expressions in sequence and returns the value of the last.

```
par:
	expression1
	...
	expressionN
```
executes the expressions in parallel.

```
onBreak:
	expression
```
executes ```expression``` if the preceding expression is interrupted.

```
js (variable1, ..., variableN):
	jsString
```
executes the code in ```jsString``` (in which ```variable1 ... variableN``` can be used).

```displayNewMessageIn(text cssSelector)``` displays a new message ```text``` into the DOM element identified by ```cssSelector```.

```displayNewMessageIn(text cssSelector/cssClass)``` displays a new message ```text``` into the DOM element identified by ```cssSelector``` and assigns ```cssClass``` to it.

```awaitNewHumanNumberIn(cssSelector)``` awaits a number from user in the DOM element identified by ```cssSelector```.

```awaitClickBeep(cssSelector)``` awaits a click from user in the DOM element identified by ```cssSelector```.

Work in progress.
