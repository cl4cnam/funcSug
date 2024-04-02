&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A NAIVE EXECUTION MODEL for CONCURRENCY
=======================================

Here is just a very naive execution model for concurrency. It describes the execution of a program written in a simplified language:

- It assumes there are external memory places named `m1`, `m2`, ...
- A program is an AST where each subtree is considered as an expression (it may return a value but can have side effects) that will be noted here in polish notation
- Instructions are (where p1, ..., pN are subtree):
	- &lt;literal&gt;: this covers various type of literals (They won't be determinated further here)
	- `get m`: return the value of the external memory `m`
	- `set m p`: set the external memory `m` to the value of `p`
	- &lt;op&gt; p1 p2: return *value of p1 &lt;op&gt; value of p2* (where &lt;op&gt; is `+`,`-`,`*`,`=`,`!=`,`<`,`>`,`<=`,`>=`,`or`,`and`,`not`,`car`,`cdr`,`cons`
	- `print p`: print the value of p to the console
	- `noop`: do nothing
	- `seq p1 ... pN`: executes p1, ..., pN in sequence and return the value of the last
	- `par p1 ... pN`: executes p1, ..., pN concurrently and, when all are terminated, returns the list [value of p1, ..., value of pN]
	- `if cond p1 p2`: like classical `if` and returns the value of *p1* or *p2* (according to *cond*)
	- `while cond p` : like classical `while` and returns the value of the last execution of *p* (or else undefined)

It's a very naive model:

- no coherence mechanism
- neither preemption nor cancellation
- only way of waiting: busy waiting

Note: It's a deterministic model.

Concepts
==========

In almost current programming languages, calls to subroutine are managed by a [call stack](https://en.wikipedia.org/wiki/Call_stack). This stack can be considered as a stack of frames. Each frame is just a cut in the address space of the stack and represents an active subroutine.

In this model, during the execution,

- each (sub-)expression will give birth to a reifyied frame,
- and these frames will be organized in a **Frame Tree** (**FT**) structure.

The concept of **Frame Tree** is just an extension of the concept of Frame Stack (more commonly known as Call Stack).

- In place of a linear Frame stack, a Frame Stack (called **Frame Tree**) that has a tree structure is used.
- Each sub-expression gives a node of the **Frame Tree**.
- The branches of the **Frame Tree** will be considered parallel (concurrent) branches. (As in the tradition of languages derived from Esterel, concurrent branches are called "parallel")

Each frame contains:

- a copy of a part of the AST, its code (**FrameCode**)
- the value to be returned to the parent frame (**ToReturn**)
- the associative array of values returned by the child frames (**ReturnedByChildren**)
- a string that indicates the reason why this frame has been added to the **Frame Tree** (**Reason**)
- a step counter (Step Counter: **SCNT**) (initial value: 1)

The execution is done by executing leaf nodes.

The execution of some nodes may cause the addition of child nodes.
When a node has completely finished its execution, it is removed from FT and the value to be returned (**ToReturn**) is set in the parent frame in **ReturnedByChildren**.

Execution of a program
======================

The program is executed as follows:

- At the beginning of the execution, **FT** contains only one node: a Frame containing a copy of the root of the AST.
- let **LEAFS** be a copy of the list of all **FT** leaves
- While **LEAFS** is not empty:
	- execute all elements of **LEAFS**

A leaf is executed differently depending on the root of the **FrameCode** of the node.

Execution of a node
====================

Each node (let it be *Nd*) is executed as follows:

- execution specific to the root of the **FrameCode** of the node
- if *Nd* is terminated
	- **ToReturn** is appended to **ReturnByChildren** of parent node (with key **Reason**)
	- *Nd* is remove from **FT**
- else
	- increment **SCNT** of *Nd*

`par p1 ... pN` **FrameCode** (N>0)
---------------------------

- if **SCNT** = 1,
	- stack new frames (with **FrameCode** `p1`,...,`pN`) each directly on top of this node (with **Reason** being 'arg1', ..., 'argN', resp.)
- else
	- **ToReturn** := the list [the value associated to 'arg1' in **ReturnByChildren**, ..., the value associated to 'argN' in **ReturnByChildren**]
	- set this node as terminated

![par](https://github.com/cl4cnam/funcSug/assets/40176886/184d12bb-ce09-4b1d-b4ac-ee12b0eaca75)

`seq p1 ... pN` **FrameCode** (N>0)
---------------------------

- if **SCNT** is not `N+1`,
	- stack a new frame (with **FrameCode** `'p'`+SCNT) on top of this node (with **Reason** being 'oneOfSequence')
- else
	- **ToReturn** := the value associated to 'oneOfSequence' in **ReturnByChildren**
	- set this node as terminated

![seq](https://github.com/cl4cnam/funcSug/assets/40176886/da014b24-51d1-4893-83e6-8b2c75077bcc)

`if cond p1 p2` **FrameCode**
---------------------------

- if **SCNT** = 1,
	- stack a new frame (with **FrameCode** `cond`) on top of this node (with **Reason** being 'ifCondition')
- else if **SCNT** = 2,
	- cond := the value associated to 'ifCondition' in **ReturnByChildren**
	- if cond is true
		- stack a new frame (with **FrameCode** `p1`) on top of this node (with **Reason** being 'ifBody')
	- else
		- stack a new frame (with **FrameCode** `p2`) on top of this node (with **Reason** being 'ifBody')
- else
	- **ToReturn** := the value associated to 'ifBody' in **ReturnByChildren**
	- set this node as terminated

`while cond p` **FrameCode**
---------------------------

- if **SCNT** is odd,
	- if **SCNT** = 1
		- lastResult := undefined
	- else
		- lastResult := the value associated to 'whileBody' in **ReturnByChildren**
	- stack a new frame (with **FrameCode** `cond`) on top of this node (with **Reason** being 'whileCondition')
- else
	- cond := the value associated to 'whileCondition' in **ReturnByChildren**
	- if true is in cond
		- stack a new frame (with **FrameCode** `p`) on top of this node (with **Reason** being 'whileBody')
	- else
		- **ToReturn** := lastResult
		- set this node as terminated

`+ p1 p2` **FrameCode**
---------------------------

- if **SCNT** = 1,
	- stack new frames (with **FrameCode** `p1`,`p2`) each directly on top of this node (with **Reason** being 'arg1','arg2', resp.)
- else
	- **ToReturn** := (the value associated to 'arg1' in **ReturnByChildren**) + (the value associated to 'arg2' in **ReturnByChildren**)
	- set this node as terminated

Ditto for `-`,`*`,`=`,`!=`,`<`,`>`,`<=`,`>=`,`or`,`and`,`not`,`car`,`cdr`,`cons`

Note: The arguments are executed concurrently.

&lt;literal&gt; **FrameCode**
-------------------

- **ToReturn** := value of the literal
- set this node as terminated

`get m` **FrameCode**
-------------------

- **ToReturn** := value of the external memory *m*
- set this node as terminated

`set m p` **FrameCode**
-------------------

- if **SCNT** = 1,
	- stack a new frame (with **FrameCode** `p`) on top of this node (with **Reason** being 'value')
- else
	- set the external memory *m* to the value associated to 'value' in **ReturnByChildren**
	- set this node as terminated

`print p` **FrameCode**
-------------------

- if **SCNT** = 1,
	- stack a new frame (with **FrameCode** `p`) on top of this node (with **Reason** being 'arg1')
- else
	- print the value associated to 'arg1' in **ReturnByChildren**
	- set this node as terminated

`noop` **FrameCode**
---------------------------

- set this node as terminated

