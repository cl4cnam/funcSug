
# **FuncSug**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;![logo](https://github.com/cl4cnam/funcSug/assets/40176886/2d4c08b3-6f96-4acd-b993-b9bbe0df6b91)

The goal of this programming language is *merely* facilitating **GUI programming** (in client-side web programming).

**Advantages:**
- It avoids "callback hell"
- and enables you to program as if you make a console application
- without losing the multiple possibilities of interaction
- and without freezing the user interface.
- It **eliminates** the need to manage **all the combinations** of component states.

[**Tutorial**](https://github.com/cl4cnam/funcSug/wiki) - [**Examples**](https://github.com/cl4cnam/funcSug#get-a-taste-of-the-language) - [**REPL**](https://cl4cnam.github.io/FuncSugREPL/replPy.html)

> [!NOTE]
> **Goal**: facilitating **GUI programming** (in fact, the interactivity aspect)<br>
> **Non-goals**: improving speed of execution, facilitating data structuration, object management, mutability, types

For this aim, it uses the "**concurrent way**" or more exactly the "**logically parallel way**". That is, it introduces explicit concurrency where no concurrency seems present or mandatory. The concurrency is reputed to be very difficult. However, amazingly, many cases are simpler with explicit concurrency!

With this style, you can program **as you program for the console** without users losing the multiple possibilities of interaction (Indeed, this style suppresses the *inversion of control* of the callback style of event-driven programming).

This "**concurrent way**" is expressed thanks to additional control flow instructions (beyond `if`, `while`, `for`,...):
- `parallel` / `parallel exitAfter ... finished` / `parallel(select ...)` / `parallel(for ... in ...)`,
- `select`,
- `spawn`,
- `whileTrue_dependsOn` / `whileTrueAwaitFrame_js` / `whileTrueAwaitDom_js`,
- ...
- `repeat`,
- `sequence`

and with new modifiers (beyond `break`, `return`): `restart`, `pause`, `resume`.

That enables a better **structure of code** (that is, a more natural and more readable structure).

If you're curious, you can read the [the 'Memory' code](https://github.com/cl4cnam/Memory2/blob/main/memory.fg)
(and [test it](https://cl4cnam.github.io/Memory2/memory.html)) or read this [post](https://trio.discourse.group/t/structured-concurrency-for-gui-programming-without-concurrency/488).

It's loosely based on [SugarCubes](https://github.com/LordManta/SugarCubesJS) of Jean-Ferdy Susini. It adheres to "[structured concurrency](https://en.wikipedia.org/wiki/Structured_concurrency)" principles. It doesn't use OS threads. It doesn't aim to improve speed of execution.

## Compare
<table>
<tr>
<th align="center">JavaScript</th>
<th align="center">FuncSug</th>
</tr>
<tr>
<td>

```javascript
let numberOfClick
function $(id) {
   return document.getElementById(id)
}
function launch() {
   $('launch').removeEventListener('click', launch)
   setTimeout(
      ()=>{
         $('clickZone')
         .removeEventListener('click', clickZone)
         console.log("Good job! See you soon!")
      },
      30000
   )
   numberOfClick = 0
   $('clickZone')
   .addEventListener('click', clickZone)
}
let timeoutID
function clickZone() {
   if (numberOfClick == 0) {
      timeoutID = setTimeout(
         ()=>{
            if (numberOfClick < 3) {
               numberOfClick = 0
               console.log("Non-triple click")
            }
         },
         2000
      )
   }
   numberOfClick += 1
   if (numberOfClick == 3) {
      numberOfClick = 0
      console.log("Triple click")
      clearTimeout(timeoutID)
   }
}
$('launch').addEventListener('click', launch)
```

</td>
<td>

```python
awaitClickBeep('#launch')
parallel exitAfter 1 finished ||
   waitSeconds(30)
||
   while true:
      awaitClickBeep('#clickZone')
      parallel exitAfter 1 finished ||
         awaitClickBeep('#clickZone')
         awaitClickBeep('#clickZone')
         print("Triple click")
      ||
         waitSeconds(2)
         print("Non-triple click")
print("Good job! See you soon!")
```

</td>
</tr>
</table>

## Some features

### Parallel construct
> Beware that this is just a logical parallelism.

You can write
```
parallel:
    <parallelBranch1>
    <parallelBranch2>
```
to execute ```parallelBranch1``` and ```parallelBranch2``` concurrently.

You can also:
- add a branch dynamically,
- select parallel branch(es) according to event(s).

### Interruptible block
You can interrupt (`break`), pause (`pause`), resume (`resume`) or restart (`restart`) a block. For example:
```
parallel:
    sequence: @myBlock
        <instruction1>
        <instruction2>
    sequence:
        break myBlock
```
### Reaction to a change of a variable
You can react to a change of a variable, for example, like this:
```
while true:
    awaitBeep myVariable
    <whatToDoInThisCase>
```

## Get a taste of the language
See [the 'Make Gems' code](https://github.com/cl4cnam/make_gems/blob/main/makegemPhaserPy.fg)
and [test it](https://cl4cnam.github.io/make_gems/makegemPhaserPy.html).

You may also want to have a look at:
- ['Guess the Number' code](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumberPy.fg)
and [test it](https://cl4cnam.github.io/Guess_the_number/guessTheNumberPy.html).
- ['Mini Sweet' code](https://github.com/cl4cnam/miniSweet/blob/main/miniSweetPy.fg)
and [test it](https://cl4cnam.github.io/miniSweet/miniSweetPy.html).
- ['Aquarium' code](https://github.com/cl4cnam/aquarium/blob/main/aquariumPy.fg)
and [test it](https://cl4cnam.github.io/aquarium/aquariumPy.html).
- ['Memory' code](https://github.com/cl4cnam/Memory/blob/main/memory.fg)
and [test it](https://cl4cnam.github.io/Memory/memory.html).
- ['Memory2' code](https://github.com/cl4cnam/Memory2/blob/main/memory.fg)
and [test it](https://cl4cnam.github.io/Memory2/memory.html).
- ['Hypertext fiction' code](https://github.com/cl4cnam/hypertextFictionExample/blob/main/hypertextFictionExample.fg)
and [test it](https://cl4cnam.github.io/hypertextFictionExample/hypertextFictionExample.html).

Look at the **global structure of the code**: One cannot follow this structure in usual programming language.

Let's take, for example, [the 'Make Gems' code](https://github.com/cl4cnam/make_gems/blob/main/makegemPhaserPy.fg):

In this language, there is no need to build a ball object, just call a function ```lifeOfBall```.
You just run multiple ```lifeOfBall```, ```birthOfGem``` and a ```lifeOfPaddle``` in parallel.
These functions do not build objects: they are just like any classical function.
<br>
In the body of ```lifeOfPaddle```, just code the various behaviors of the ball in parallel.

In ['Guess the Number'](https://github.com/cl4cnam/Guess_the_number/blob/main/guessTheNumber.fg), ```gameCourse``` is just a function. The line just after the call of ```gameCourse``` is executed only when the player has found the number, that is only when ```gameCourse``` has returned, just like any classical function call.

You can also test snippets [here](https://cl4cnam.github.io/FuncSugREPL/replPy.html).

## Note

This language has [syntax highlighting for Geany](https://github.com/cl4cnam/funcSug/tree/main/tools/forGeany); otherwise, with Geany, if you choose that of zephir (or nsis, powershell, ruby), it can be pleasant.

The file ```parserPy.js``` has been generated online from the file ```funcSugPy.peggyjs``` on the site https://peggyjs.org/online.html with "parser variable" set to "pegPy".

For now, this implementation consists just in a quick and dirty interpreter but it works enough to be appreciated.

## Use without phaser_ce

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

## Use with phaser_ce

In your ```myProgram.html```, in the end of the body element, include the lines:
```
  <script src="https://cdn.jsdelivr.net/gh/photonstorm/phaser-ce/build/phaser.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/libStd.fg" type="application/funcsug"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/libDOM.fg" type="application/funcsug"></script>
  <script src="https://cdn.jsdelivr.net/gh/cl4cnam/funcSug/libPhaser.fg" type="application/funcsug"></script>
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
