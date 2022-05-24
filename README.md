# funcSug
Loosely based on https://github.com/LordManta/SugarCubesJS of Jean-Ferdy Susini.

Now, interactiveTest.html and guessTheNumber.html require a http server (for example, "php -S 127.0.0.1:8000" and go to http://127.0.0.1:8000/interactiveTest.html and http://127.0.0.1:8000/guessTheNumber.html).

This language has no syntax highlighting, but if you choose that of zephir (or nsis, powershell, ruby) it can be pleasant.

## Syntax elements
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

In progress.
