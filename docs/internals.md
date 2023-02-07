(in progress)

Concepts
==========

The execution of the program is divided into **super-step(s)** also called **burst(s)**.
Each **super-step** is divided into **micro-step(s)**.

The program is executed using a **Frame Tree** (**FT**).
The concept of **Frame Tree** is just an extension of the concept of Frame Stack (more commonly known as Call Stack).

Each frame contains:

- a copy of a part of the AST, its code (**FrameCode**)
- a **local namespace** (LN)
- the **multivalue** to be returned to the parent frame
- the **multivalues** returned by the child frames
- the awake state of the Frame (**Awake**)
- a step counter (independent of micro-steps and super-steps) (Step Counter: **SCNT**)
- a description of the path in FT from the root node to this node (Path of Execution: **POE**)
- other information relevant to the execution

The execution is done by "activating" some FT nodes and executing leaf nodes.

The execution of some nodes may cause the addition of child nodes.
When a node has completely finished its execution, it is removed from FT and the **multivalue** to be returned is set in the parent frame.

The variables are distributed in the **local namespaces** during the execution of the program.
A variable consists of an association between a label and a **LiveBox**.

Return **multivalues** don't use a **LiveBox**.

A **LiveBox** includes:

- a **multivalue** called **previous multivalue**
- a **stamped multivalue** called **current multivalue**
- a boolean called **previous bip state**
- a boolean called **previous beep state**
- a boolean called **current bip state**
- a boolean called **current beep state**

There are two types of **LiveBox**: **simple** (the most common type) and **special**.

A **multivalue** is a list of values.
A **stamped multivalue** is a list of (value, **stamp**) pairs
Each pair is called **stamped value**.
The **stamp** is the **POE** of the Frame that caused this value to be added.

The content of a **LiveBox** can be modified by an **assignment**.
An **assignment** has two parameters:

- a **LiveBox** *lb*
- a value *v* (TODO I have to specify the value types)

An **assignment** is performed by a Frame *f* as follows:

- For each **stamped value** *(v', e')* of the **current multivalue** of *lb*:

	- If *lb* is **simple** or if the **FrameCode** of the last node of the intersection of the **POE** of the Frame *f* and the stamp *e'* is one of the instructions "seq", "while", "mix"
	- then the **stamped value** *(v', e')* is removed from the **current multivalue** of *lb*
- The pair *(v, **POE** of f)* is added to the **current multivalue** of *lb*

Execution of a program
======================

The program is executed as follows:

- At the beginning of the execution, **FT** contains only one node: a Frame containing a copy of the root of the AST.
- Then a **burst** is executed.
- The following **bursts** will be executed thanks to the "ext" instructions.

A **burst** is executed as follows:

- As long as there is a **FT** leaf in the **Awake** state:
	- execute a **micro-step**

A **micro-step** is executed as follows:

- All "cancellableExec" frames are activated
- All "dynamicPar" frames are activated
- All leaf frame are executed
- All non **frozen** **LiveBoxes** are updated

Updating a **LiveBox** is done as follows:

- the **previous multivalue** becomes a copy of the **current multivalue** without the **stamps**
- the **previous bip state** becomes a copy of the **current bip state**
- the **previous beep state** becomes a copy of the **current beep state**
- the **current bip state** is set to false (the **current beep state** is not modified)

An "execution" of a node f is executed differently depending on the instuction of the **FrameCode** of the node.

To be continued...
