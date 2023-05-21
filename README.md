
# **FuncSug**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;![logo](https://github.com/cl4cnam/funcSug/assets/40176886/2d4c08b3-6f96-4acd-b993-b9bbe0df6b91)

This is a new concurrent programming language (in progress, but it already works) loosely based on [SugarCubes](https://github.com/LordManta/SugarCubesJS) of Jean-Ferdy Susini.
It adheres to "[structured concurrency](https://en.wikipedia.org/wiki/Structured_concurrency)" principles. It doesn't use OS threads.

The goal of the language is to enable a better structure of code, that is, a more natural and more readable structure.

For now, it's just a quick and dirty interpreter but it works enough to be appreciated.

## Features

### Parallel construct
> Beware that this is just a logical parallelism.

You can write
```
{par
    <parallelBranch1>
    <parallelBranch2>
}
```
to execute ```parallelBranch1``` and ```parallelBranch2``` concurrently.

You can also add a branch dynamically.

### Interruptible sequence
You can interrupt (`.break`), pause (`.pause`), resume (`.resume`) or restart (`.restart`) a block. For example:
```
{par
    {seq @myBlock
        <instruction1>
        <instruction2>
    }
    {seq
        .break myBlock
    }
}
```
### Reaction to a change of a variable
You can react to a change of a variable, for example, like this:
```
{seq
    :await myVariable beep
    <whatToDoInThisCase>
}
```

## Get a taste of the language
See [the 'Guess the Number' code](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumber.fg)
and [test it](https://cl4cnam.github.io/Guess_the_number/guessTheNumber.html).

You may also want to have a look at:
- [the 'Breakout' code](https://github.com/cl4cnam/breakout/blob/main/breakout.fg)
and [test it](https://cl4cnam.github.io/breakout/breakout.html).
- [the 'Mini Sweet' code](https://github.com/cl4cnam/miniSweet/blob/main/miniSweet.fg)
and [test it](https://cl4cnam.github.io/miniSweet/miniSweet.html).
- [the 'Aquarium' code](https://github.com/cl4cnam/aquarium/blob/main/aquarium.fg)
and [test it](https://cl4cnam.github.io/aquarium/aquarium.html).

Don't look too hard at my syntax (I intend to change it into a pythonic syntax). Look instead at the [global structure of the code](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumber.fg): One cannot follow this structure in usual programming language.
- In ['Guess the Number'](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumber.fg), ```gameCourse``` is just a function. The line just after the call of ```gameCourse``` is executed only when the player has found the number, that is only when ```gameCourse``` has returned, just like any classical function call.
- In ['Breakout'](https://github.com/cl4cnam/breakout/blob/main/breakout.fg), ```lifeOfBrick``` is just a function. The line just after the call of ```lifeOfBrick``` is executed only when the brick is broken. The same goes for the ```lifeOfBall``` function.

## Note

This language has [syntax highlighting for Geany](https://github.com/cl4cnam/funcSug/tree/main/tools/forGeany); otherwise, with Geany, if you choose that of zephir (or nsis, powershell, ruby), it can be pleasant.

The file ```parser.js``` has been generated online from the file ```funcSug.peggyjs``` on the site https://peggyjs.org/online.html with "parser variable" set to "peg".

## Use

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

## Syntax elements

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

## A few instructions/expressions (loose description)

```.print value``` writes ```value``` onto the console.

```.var variableName``` declares a new local variable.

```[variableName <-- value]``` assigns  ```value``` to ```variableName```.

```variableName <-- value``` (on its own line) assigns  ```value``` to ```variableName```.

```variableName <-- [+ value]``` (on its own line) increments  ```variableName``` by ```value``` (also for `-`,`*`,`/` operators).

```$variableName``` returns the value of ```variableName```.

```true``` and ```false``` returns the boolean value 'true' and 'false' respectively.

```[value1 + value2]``` returns the sum/concatenation of the two values (also for `-`,`*`,`/`,`mod`).

```[value1 < value2]``` returns the truth value of ```value1 < value2``` (also for `<=`,`=`,`/=`, `and`, `or`).

```:randomIntBetween value1 value2``` returns a random integer between ```value1``` and ```value2```.

```{if condition thenBranch else elseBranch}``` acts as usual (```else elseBranch``` is optional).

```{while condition instruction1 ... instructionN}``` repeats ```instruction1 ... instructionN``` while ```condition``` returns true.

```{seq expression1 ... expressionN}``` executes the expressions in sequence and returns the value of the last.

```{par expression1 ... expressionN}``` executes the expressions in parallel.

```.break label``` interrupts the execution of the expression labelled by ```label```.

```~ expression``` executes ```expression``` if the preceding expression is interrupted.

```{deffunc functionName parameterList instruction1 ... instructionN}``` defines the custom function ```functionName```.

```{js (variable1 ... variableN) jsString}``` executes the code in ```jsString``` (in which ```variable1 ... variableN``` can be used).

```:displayNewMessageIn text cssSelector``` displays a new message ```text``` into the DOM element identified by ```cssSelector```.

```:displayNewMessageIn text cssSelector/cssClass``` displays a new message ```text``` into the DOM element identified by ```cssSelector``` and assigns ```cssClass``` to it.

```.awaitNewHumanNumberIn cssSelector``` awaits a number from user in the DOM element identified by ```cssSelector```.

```.awaitClickBeep cssSelector``` awaits a click from user in the DOM element identified by ```cssSelector```.

Work in progress.
