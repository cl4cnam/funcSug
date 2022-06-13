# **funcSug**

This is a new programming language (in progress) loosely based on https://github.com/LordManta/SugarCubesJS of Jean-Ferdy Susini.

### Note

Now, interactiveTest.html and guessTheNumber.html require a http server (for example, "php -S 127.0.0.1:8000" and go to http://127.0.0.1:8000/interactiveTest.html and http://127.0.0.1:8000/guessTheNumber.html).

This language has no syntax highlighting, but if you choose that of zephir (or nsis, powershell, ruby), it can be pleasant.

The file ```parser.js``` has been generated online from the file ```funcSug.peggyjs``` on the site https://peggyjs.org/online.html with "parser variable" set to "peg".

### Use

In your ```myProgram.html``` in the end of the body element, include the lines:
```
		<script src="libStd.fg" type="application/funcsug"></script>
		<script src="libDOM.fg" type="application/funcsug"></script>
		<script src="myProgram.fg" type="application/funcsug"></script>
		<script src="parser.js"></script>
		<script src="interpreter.js"></script>
		<script src="DOMloader.js"></script>
```
Write your code in the file ```myProgram.fg```.
Put the files ```libStd.fg```, ```libDOM.fg```, ```myProgram.fg```, ```parser.js```, ```interpreter.js```, ```DOMloader.js``` in your directory.
(For now, ```libStd.fg``` is useless)

### Syntax elements

In many language, a function call is expressed by added parentheses at right:
```functionName(arg1, ..., argN)```.<br>
In this language too, a function call is expressed by added parentheses but around:
```(functionName arg1 ... argN)```.<br>
You can replace parentheses with curly braces "{}".

To avoid too many parentheses, there are a few shortcuts:<br>
- ```!functionName``` is a shortcut for ```(functionName)```
- ```.functionName arg1``` is a shortcut for ```(functionName arg1)```
- ```:functionName arg1 arg2``` is a shortcut for ```(functionName arg1 arg2)```
- ```%functionName arg1 arg2 arg3``` is a shortcut for ```(functionName arg1 arg2 arg3)```

A syntax variant:
```[arg1 functionName arg2]``` is ```(functionName arg1 arg2)```

In any expression, you can insert ``` @label ``` just after the function name to label the expression (This is useful for the ```break``` instruction).

### A few instructions/expressions (loose description)

```.print value``` writes ```value``` onto the console.

```.var variableName``` declares a new local variable.

```[variableName <- value]``` assigns  ```value``` to ```variableName```.

```$variableName``` returns the value of ```variableName```.

```[value1 + value2]``` returns the sum/concatenation of the two values (idem for `-`,`*`,`/`,`mod`).

```[value1 < value2]``` returns the truth value of ```value1 < value2``` (idem for `<=`,`=`,`/=`, `and`, `or`).

```:randomIntBetween value1 value2``` returns a random integer between ```value1``` and ```value2```.

```{if condition thenBranch else elseBranch}``` acts as usual (```else elseBranch``` is optional).

```{while condition instruction}``` repeats ```instruction``` while ```condition``` returns true.

```{seq expression1 ... expressionN}``` executes the expressions in sequence and returns the value of the last.

```{par expression1 ... expressionN}``` executes the expressions in parallel.

```.break label``` interrupts the execution of the expression labelled by ```label```.

```%deffunc functionName parameterList expression``` defines the custom function ```functionName```.

```(&functionName arg1 ... argN)``` executes the custom function ```functionName``` and returns its value.

In progress.
