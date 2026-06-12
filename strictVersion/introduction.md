# Introduction
In FuncSug, there are no asynchronous call. So, each call is awaited its end. In FuncSug_strict, I took it a step further: each side-effect instruction is awaited the end of its side-effect ('end' in the sense of its cancellation!). This seems foolish but it works.
## Central point
This language supports instruction‑level temporary mutation and no other mutations.
## Examples
If you execute the python program:
```python
print('Hello world!')
print('Hello the others!')
```
The second instruction is executed despite that 'Hello world!' continues to be displayed. This seems natural to all programmers but, if you're thinking about it, you can find it analogous of an asynchronous call.

In FuncSug_strict, the state after the termination of any block of instructions is identical to the state before it. So, there is no equivalent of the classical assignment or the `print` instruction.

In place of the classical assignment instruction, there is a perpetual assignment instruction (written `var <= expr`) so that in `a <= 5; b <= 3`, the instruction `b <= 3` is never executed. This seems foolish but with an interruption mechanism, this becomes interesting.

The first example will be written:
```python
parallel:
	display <= 'Hello world!'
	display <= 'Hello the others!'
```

To write `Hello world!` during 5 seconds and then (the first message disappears) `Hello the others!`, you will write:
```python
parallel exitAfter 1 finished:
	display <= 'Hello world!'
	await(seconds, 5)
display <= 'Hello the others!'
```
If you want to keep the first message, you will write:
```python
parallel:
	display <= 'Hello world!'
	sequence:
		await(seconds, 5)
		display <= 'Hello the others!'
```