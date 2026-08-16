/**
 * Populates Module 1 — Welcome to Python & Setup (Week 1).
 * Run with: npx ts-node prisma/enrich-pzth-module1.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, findSublesson, writeLessonContent, attachLab, writeQuiz } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 1";

async function main() {
  console.log("🌱  Populating Module 1…\n");

  // ── Lesson 1: Welcome to Python ────────────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Welcome to Python");
    const { blocks } = await writeLessonContent(prisma, l.id, `
Welcome. Over the next 10 weeks you're going to learn to write real, working software — no shortcuts, no fluff, just the same skills professional programmers use every day, taught from absolute zero.

**You do not need any previous programming experience.** If you've never opened a terminal, never installed a programming language, and don't know what a "variable" is, you're exactly who this course is for.

## What You'll Be Able to Build

By the end of Week 10, you'll have written calculators, interactive quizzes, text-based games, a to-do list app, a gradebook, and a capstone project you design yourself — a real Python application you can show someone and say "I built this."

## How the Course Works

Each week is one **Module**, built around one theme. Every module follows the same rhythm:

- **Learn** a new idea, explained in plain language with a real-world comparison
- **See** it work in a real, working example
- **Try** modifying that example yourself
- **Build** something with it in an in-browser coding **Lab** — real Python, running in your browser, no installation required to get started
- **Break** something on purpose and **debug** it — professional programmers spend enormous amounts of time fixing errors, and you'll practice that skill deliberately from Week 1
- Finish with a **Challenge**, a short **Quiz**, and a **Summary**

## How Labs Work

Wherever you see a lab, you'll get a code editor right inside the lesson with a **Run** button. You write Python, click Run, and see the real output — immediately, in your browser. If your own computer isn't set up yet, that's fine: the lab works either way, and we'll walk through installing Python locally in the next lesson so you can practice outside the course too.

## How Missions Work

Each week has a themed **Mission** — this week it's 🚀 *Launch Python*. Missions are just a fun way to frame the week's goal; think of them as a checkpoint for "what does success look like by Sunday."

## One More Thing

Your code does not need to be perfect. It will not be perfect. That's normal — it's normal for every programmer, at every level, forever. Your job this week isn't to avoid mistakes. It's to write your first line of code, run it, and see what happens.

Let's go.
`);
    console.log(`✓ Welcome to Python (${blocks} blocks)`);
  }

  // ── Lesson 2: What Is Programming? ─────────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "What Is Programming?");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Idea

A **program** is a list of exact instructions that a computer follows, one at a time, in order. **Programming** is the act of writing those instructions. The instructions themselves are called **code**.

Computers are extremely fast and extremely obedient, but they are not clever. A computer will not guess what you meant — it will do exactly, precisely, literally what you told it to do. That's both the challenge and the power of programming: once you learn to give exact instructions, the computer will carry them out flawlessly, thousands of times a second, without ever getting bored or tired.

## A Real-World Comparison

Think about a **recipe**. A recipe doesn't say "make dinner" — it says "preheat the oven to 350°F," then "mix two cups of flour with one egg," then "bake for 25 minutes." Each step is small, specific, and happens in a fixed order. Skip a step, or do them out of order, and the result changes.

A few other everyday examples of "programs" you already understand:

- **GPS directions**: "turn left in 500 feet," "continue for 2 miles," "your destination is on the right" — a precise, ordered sequence.
- **A vending machine**: insert coin → select item → dispense item → return change. If you press the button before inserting a coin, nothing happens — the machine is following its instructions exactly, in order, even when that's not what you wanted.

Python programs work the same way: a sequence of exact steps, followed in order, with no assumptions and no guessing.

## Why Programming Languages Exist

Computers, underneath everything, only understand streams of 1s and 0s. Nobody wants to write software that way, so people invented **programming languages** — readable, structured ways of writing instructions that get translated into something the computer's hardware can actually run. Python is one such language, and it was specifically designed to read almost like plain English.

## Check Your Understanding

Before moving on, try explaining "what is a program?" out loud, in your own words, using the recipe or GPS comparison. If you can explain it simply, you understand it.
`);
    console.log(`✓ What Is Programming? (${blocks} blocks)`);
  }

  // ── Lesson 3: What Is Python? ───────────────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "What Is Python?");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is Python?

Python is a programming language created in 1991 by Guido van Rossum, specifically designed to be **readable** — Python code often looks close enough to plain English that you can guess what it does before you even know the language. That readability is exactly why it's one of the best languages to learn first.

\`\`\`python
if age >= 18:
    print("You can vote.")
\`\`\`

Even without knowing any Python yet, you can probably guess what that code does.

## Why Python Is So Popular

Python is one of the most widely used programming languages in the world, and it's used in an enormous range of fields:

- **Data analytics** — analyzing spreadsheets, sales data, and business metrics
- **Artificial intelligence & machine learning** — the majority of AI research and tools are written in Python
- **Web development** — powering the backend of sites like Instagram and Spotify
- **Automation** — writing small scripts that do boring, repetitive tasks automatically
- **Scientific computing** — used by physicists, biologists, and researchers to analyze data
- **Business applications** — everything from financial modeling to internal tools

The same core language you're learning this week — variables, loops, functions — is the exact foundation all of those fields are built on.

## Why We're Starting Here

You won't touch AI or web frameworks in this course. You're going to build a rock-solid foundation in the language itself — the part that every single one of those fields depends on. Everything you learn in the next 10 weeks transfers directly, no matter which direction you go next.
`);
    console.log(`✓ What Is Python? (${blocks} blocks)`);
  }

  // ── Lesson 4: Installing Python (+ 2 sublessons) ────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Installing Python");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Before You Install Anything

Your computer runs an **operating system** (OS) — Windows or macOS being the two you're most likely using. Python isn't built into either one by default, so we need to install it.

## What "Installing Python" Actually Means

When you "install Python," you're installing a program called the **Python interpreter** — the piece of software that reads your Python code and actually carries out the instructions. Without it, a \`.py\` file is just a text file; the interpreter is what brings it to life.

## Pick Your Operating System

Open the sublesson below that matches your computer, follow it step by step, then come back here.

- **Windows** users: open the "Installing Python on Windows" sublesson
- **macOS** users: open the "Installing Python on macOS" sublesson

## After You've Installed Python

Whichever platform you're on, you'll end this lesson by running one command that prints your installed Python version, something like:

\`\`\`text
Python 3.12.1
\`\`\`

If you see a version number starting with "3," you're ready for the next lesson. If you see an error instead, don't worry — the "Troubleshooting Python Installation" lesson later this week covers the most common problems and exactly how to fix them. And remember: even if local installation gives you trouble, every lab in this course also runs directly in your browser, so nothing here will block your progress.
`);
    console.log(`✓ Installing Python (${blocks} blocks)`);

    const win = await findSublesson(prisma, SLUG, MOD, "Installing Python", "Installing Python on Windows");
    const { blocks: winBlocks } = await writeLessonContent(prisma, win.id, `
## Installing Python on Windows

**Step 1 — Open the Python download page.** Go to python.org/downloads in your browser.

**Step 2 — Download Python 3.** The site will detect Windows and offer a "Download Python 3.x.x" button. Click it — this downloads an installer file (something like \`python-3.12.1-amd64.exe\`).

**Step 3 — Start the installation.** Find the downloaded file (usually in your Downloads folder) and double-click it.

**Step 4 — The most important checkbox in this whole lesson.** On the very first installer screen, there's a checkbox at the bottom labeled **"Add python.exe to PATH"** (older versions say "Add Python to PATH"). **Check this box before clicking Install.** This is what lets you type \`python\` from any folder in a terminal — skipping it is the single most common reason Windows installs "don't work" afterward.

**Step 5 — Click "Install Now"** and let the installer finish. This takes a minute or two.

**Step 6 — Open Command Prompt.** Press the Windows key, type \`cmd\`, and press Enter.

**Step 7 — Verify the installation.** In the black Command Prompt window, type:

\`\`\`bash
python --version
\`\`\`

and press Enter. You should see something like \`Python 3.12.1\` printed back. That's the interpreter confirming it's installed and ready.

**If nothing prints, or you get an error** like \`'python' is not recognized\`, the most likely cause is that "Add to PATH" checkbox from Step 4 — see the Troubleshooting lesson later this week for the exact fix (it doesn't require reinstalling).
`);
    console.log(`  ↳ Installing Python on Windows (${winBlocks} blocks)`);

    const mac = await findSublesson(prisma, SLUG, MOD, "Installing Python", "Installing Python on macOS");
    const { blocks: macBlocks } = await writeLessonContent(prisma, mac.id, `
## Installing Python on macOS

**Step 1 — Open Terminal.** Press Cmd+Space to open Spotlight, type "Terminal," and press Enter.

**Step 2 — Check whether Python is already available.** Many Macs ship with some version of Python pre-installed. Type:

\`\`\`bash
python3 --version
\`\`\`

**Step 3 — Read the result.** If you see something like \`Python 3.12.1\`, you already have Python 3 and can skip the rest of this sublesson. If you get an error, or the version starts with "2" (an old, unsupported version), you'll need to install Python 3 — go to python.org/downloads, download the macOS installer, open it, and follow the on-screen installer steps (click through the default options).

**Step 4 — Verify again** after installing:

\`\`\`bash
python3 --version
\`\`\`

## Why \`python3\`, Not \`python\`, on macOS

On macOS, the command \`python\` is often missing or points to an old, unsupported version, while Python 3 specifically is accessed with \`python3\`. Throughout this course, if you're on a Mac and a lesson shows \`python something.py\`, mentally read that as \`python3 something.py\` instead. We'll always call this out explicitly when it matters.
`);
    console.log(`  ↳ Installing Python on macOS (${macBlocks} blocks)`);
  }

  // ── Lesson 5: Understanding the Terminal ────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Understanding the Terminal");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is a Terminal?

A **terminal** is a program where you type text commands instead of clicking buttons — you type a command, press Enter, and the computer carries it out and (usually) prints a response. It looks intimidating the first time you see it, but it's really just a very direct way of talking to your computer.

You may see a few different names for basically the same idea:

- **Command Prompt** — Windows' classic terminal (\`cmd\`)
- **PowerShell** — a more modern Windows terminal, more powerful than Command Prompt
- **Terminal** — macOS's terminal application

For this course, any of these will work fine.

## Folders and "Where You Are"

Just like Windows Explorer or macOS Finder show you folders visually, the terminal has a concept of **your current location** — the folder you're "in" right now. Commands you run generally act on whatever's in that folder. You can see your current location and move between folders with commands like \`cd\` ("change directory"), though for this course we'll mostly work from wherever your terminal opens by default.

## Running Programs From a Terminal

When you type \`python hello.py\` and press Enter, you're telling the terminal: "run the program called \`python\`, and give it \`hello.py\` as an input." The terminal finds the \`python\` program (the interpreter you installed), hands it your file, and the interpreter reads and executes your code.

## Try It

Open your terminal (Command Prompt, PowerShell, or Terminal) right now and type this, then press Enter:

\`\`\`bash
echo Hello from the terminal
\`\`\`

You should see \`Hello from the terminal\` printed back. \`echo\` is a simple command that just prints whatever text you give it — a good first taste of "type a command, get a response."
`);
    console.log(`✓ Understanding the Terminal (${blocks} blocks)`);
  }

  // ── Lesson 6: Running Python ─────────────────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Running Python");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Launching the Python Interpreter

You can talk to Python directly, one line at a time, without writing a file at all. This is called the **interactive interpreter** (sometimes nicknamed the "REPL"). Open your terminal and type:

\`\`\`bash
python
\`\`\`

(On macOS, use \`python3\` instead.)

## Reading the Python Prompt

You should see a few lines about your Python version, followed by:

\`\`\`text
>>>
\`\`\`

That \`>>>\` is the **Python prompt** — it means Python is waiting for you to type a line of Python code, execute it immediately, and show you the result.

## Try It

At the \`>>>\` prompt, type:

\`\`\`python
print("Hello, Python!")
\`\`\`

and press Enter. Python immediately runs that line and prints:

\`\`\`text
Hello, Python!
\`\`\`

Try typing \`2 + 2\` and pressing Enter too — Python will evaluate it and print \`4\` right back at you, without even needing \`print()\`. The interactive interpreter is a great scratchpad for quickly trying small snippets of Python.

## Exiting Python

To leave the interactive interpreter and return to your normal terminal, type:

\`\`\`python
exit()
\`\`\`

and press Enter.

## Why We Won't Live Here

The interactive interpreter is great for quick experiments, but it forgets everything the moment you close it — not useful for building a real program you can run again later. That's what the next lesson covers: saving your code in a file so it's permanent.
`);
    console.log(`✓ Running Python (${blocks} blocks)`);
  }

  // ── Lesson 7: Creating Your First Python File ───────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Creating Your First Python File");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is a \`.py\` File?

A \`.py\` file is just a plain text file — you could open it in Notepad — that contains Python code. The \`.py\` extension is how your computer (and Python itself) recognizes it as Python source code rather than an ordinary text document.

## Three Separate Steps

It helps to think of these as three genuinely different actions:

1. **Writing code** — typing Python instructions into a text editor
2. **Saving code** — storing those instructions permanently as a \`.py\` file on disk
3. **Running code** — telling the Python interpreter to read that file and carry out its instructions

Beginners often blur these together, but keeping them separate in your head helps a lot when something goes wrong — you can ask "did I save it? did I run the right file?" as two very different questions.

## Try It

Using any text editor (Notepad on Windows, TextEdit on macOS — set to plain text mode — or a code editor if you have one), create a new file, type this single line:

\`\`\`python
print("Hello, Python!")
\`\`\`

and save it as \`hello.py\` somewhere you can find it easily, like your Desktop.

## Running Your File

Open your terminal, navigate to the folder where you saved \`hello.py\` (on Windows, you can often right-click the folder in Explorer and choose "Open in Terminal"), and run:

\`\`\`bash
python hello.py
\`\`\`

On macOS:

\`\`\`bash
python3 hello.py
\`\`\`

You should see \`Hello, Python!\` printed in your terminal. You just wrote, saved, and ran your first Python program from a real file.
`);
    console.log(`✓ Creating Your First Python File (${blocks} blocks)`);
  }

  // ── Lesson 8: Your First Python Program ─────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Your First Python Program");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Meet \`print()\`

\`\`\`python
print("Hello, Python!")
\`\`\`

\`print()\` is a Python **function** — a named, reusable action — whose job is to display text on the screen. Let's break down every piece of that one line, because every piece matters:

- \`print\` is the name of the function you're using
- \`(\` and \`)\` are **parentheses** — they contain whatever you're giving to the function
- \`"Hello, Python!"\` is a **string** — text data, always wrapped in quotation marks so Python knows where the text starts and ends

## Try It — Multiple Lines

Create a new file called \`intro.py\` and write:

\`\`\`python
print("My name is Alex.")
print("I am learning Python!")
print("This is my first program.")
\`\`\`

Run it with \`python intro.py\` (or \`python3 intro.py\` on macOS). Each \`print()\` call runs in order, top to bottom, printing one line each — three separate instructions, followed exactly, one after another.

## Experiment

Change \`"Alex"\` to your own name and add a fourth \`print()\` line with anything you want. Run it again. This is the whole loop you'll repeat for the rest of the course: write code, run it, see what happens, change it, run it again.

## Quotation Marks Matter

Python needs quotation marks to know that \`Hello, Python!\` is text, not a command. Both single quotes (\`'like this'\`) and double quotes (\`"like this"\`) work — just be consistent about opening and closing with the same kind.
`);
    console.log(`✓ Your First Python Program (${blocks} blocks)`);
  }

  // ── Lesson 9: Comments ──────────────────────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Comments");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is a Comment?

\`\`\`python
# This is a comment
print("This is not a comment")
\`\`\`

A line starting with \`#\` is a **comment** — Python completely ignores it when running your program. Comments exist purely for humans: you, six months from now, or someone else reading your code.

## Why Comments Are Useful

\`\`\`python
# Calculate the total price including 8% sales tax
price = 19.99
total = price * 1.08
print(total)
\`\`\`

Without the comment, a reader has to work out what \`* 1.08\` means. With it, the intent is obvious immediately. Good comments explain **why** you did something, not just **what** the code does — the code itself already shows what it does.

## Try It

Open any file you've already written this week and add a comment above one of the lines, explaining in your own words what that line does. Run the file again — you'll see the output is completely unchanged, because Python skips comments entirely.

## A Word of Caution

It's possible to over-comment. A comment on every single line, restating the obvious, makes code harder to read, not easier. You'll get a feel for the right amount as you go — for now, just know the tool exists.
`);
    console.log(`✓ Comments (${blocks} blocks)`);
  }

  // ── Lesson 10: Lab — Your First Python Program ──────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Your First Python Program");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Your First Python Lab

Time to actually write and run code. Use the interactive lab below — it's a real Python environment running right in your browser.

Follow these steps, in order:

1. **Run the starter code** exactly as it is. Click Run and read the output.
2. **Modify the text** inside the \`print()\` call — change the message to something of your own.
3. **Add a new \`print()\` line** underneath it, with a different message.
4. **Run the program again** and confirm both lines print.
5. **Break it on purpose.** Delete one of the closing quotation marks so the line looks like \`print("Hello!)\` and run it.
6. **Read the error message** Python gives you. It will point roughly at the problem — don't panic, this is completely normal.
7. **Fix the error** by putting the quotation mark back, and run it successfully one more time.

## Errors Are Normal

Every programmer, at every skill level, sees error messages constantly — including the people who wrote Python itself. An error is not a sign that you did something wrong as a person; it's Python telling you exactly where it got confused. Learning to read an error message calmly and fix it is one of the single most valuable skills you'll build in this course, and you just practiced it on purpose.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Run this starter code, then follow the steps above: modify the message, add a new print() line, break it on purpose, read the error, and fix it.",
        code: `print("Hello, Python!")\n`,
      },
    ]);
    console.log(`✓ Lab: Your First Python Program (${blocks} blocks, lab attached)`);
  }

  // ── Lesson 11: Troubleshooting Python Installation ──────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Troubleshooting Python Installation");
    const { blocks } = await writeLessonContent(prisma, l.id, `
Every one of these problems is common, well-understood, and fixable. Find the one that matches what you're seeing.

## "python" command not found (Windows)

**What happened:** typing \`python --version\` gives an error like \`'python' is not recognized as an internal or external command\`.

**Why:** during installation, the "Add python.exe to PATH" checkbox wasn't checked, so Windows doesn't know where to find the \`python\` program.

**How to fix it:** re-run the Python installer, choose "Modify," and make sure "Add python.exe to PATH" is checked this time — you don't need to fully uninstall first. Close and reopen your terminal afterward (PATH changes only apply to new terminal windows).

## "python" doesn't work, but "python3" does (macOS/Linux)

**What happened:** \`python --version\` fails, but \`python3 --version\` works fine.

**Why:** on macOS (and Linux), \`python\` is often not linked to Python 3 at all, while \`python3\` always is.

**How to fix it:** nothing to fix — just use \`python3\` instead of \`python\` for every command in this course while on macOS.

## Incorrect file extension

**What happened:** you try to run your file and get an error like "can't find file," even though you're sure you saved it.

**Why:** some text editors (especially Notepad) save files as \`hello.py.txt\` by default, silently adding an extra extension.

**How to fix it:** in File Explorer/Finder, make sure file extensions are visible (a settings option), find your file, and rename it to remove the extra \`.txt\` so it ends in exactly \`.py\`.

## Wrong directory

**What happened:** running \`python hello.py\` gives "No such file or directory," even though the file definitely exists.

**Why:** your terminal's current location isn't the folder where you saved the file.

**How to fix it:** use \`cd\` to move into the correct folder first (e.g. \`cd Desktop\`), or navigate there in File Explorer/Finder and open a terminal directly from that folder.

## Syntax errors: missing quotation marks or parentheses

**What happened:** Python shows a \`SyntaxError\`, often pointing near the end of a line.

**Why:** every opening quote or parenthesis needs a matching closing one — \`print("Hello!)\` is missing its closing quote, for example.

**How to fix it:** carefully re-read the line Python points to (and often the line just before it) and check every quote and parenthesis has a partner. This is exactly the debugging exercise from the lab you just completed.

## General Rule

**What happened → Why → How to fix it** is the exact pattern you'll use for every error you ever encounter. Panic is optional; reading the message carefully is not.
`);
    console.log(`✓ Troubleshooting Python Installation (${blocks} blocks)`);
  }

  // ── Module 1 Challenge ───────────────────────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Mission: Write Your First Program");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🚀 Mission: Write Your First Program

Time to put this week's skills together into something that's genuinely yours.

## Your Task

Write a Python program called \`about_me.py\` that uses \`print()\` statements to display:

1. **Your name**
2. **Something you're interested in**
3. **Why you're learning Python**
4. **One goal you have** for this course

That's four \`print()\` lines minimum — feel free to add more, use comments to organize the sections, or get creative with formatting.

## Use the Lab Below

Write and run your program in the lab. When it runs correctly and prints all four pieces of information, you've completed Week 1's mission. 🎉
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Write your About Me program here. It should print your name, an interest, why you're learning Python, and one goal.",
        code: `# About Me\n\nprint("Name: ")\nprint("Interest: ")\nprint("Why I'm learning Python: ")\nprint("My goal: ")\n`,
      },
    ]);
    console.log(`✓ Mission: Write Your First Program (${blocks} blocks, lab attached)`);
  }

  // ── Module 1 Quiz ─────────────────────────────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 1 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What is a program?", options: ["A type of computer", "A list of exact instructions a computer follows in order", "A programming language", "A file extension"], correct_index: 1, explanation: "A program is a sequence of exact instructions, followed in order — like a recipe or GPS directions." },
      { question_text: "What does the Python interpreter do?", options: ["Translates English into Spanish", "Reads and carries out your Python code", "Deletes files", "Designs the terminal"], correct_index: 1, explanation: "The interpreter is the program that reads a .py file's instructions and actually executes them." },
      { question_text: "On Windows, which checkbox during installation is most important to avoid a 'python not recognized' error later?", options: ["'Install for all users'", "'Add python.exe to PATH'", "'Install pip'", "'Create desktop shortcut'"], correct_index: 1, explanation: "Adding Python to PATH is what lets you run 'python' from any terminal window." },
      { question_text: "On macOS, which command reliably runs Python 3?", options: ["python", "py", "python3", "run"], correct_index: 2, explanation: "On macOS, 'python' is often missing or outdated — 'python3' is the reliable command." },
      { question_text: "What file extension does a Python source file use?", options: [".python", ".py", ".pt", ".pyt"], correct_index: 1, explanation: "Python source files use the .py extension." },
      { question_text: "What does print(\"Hello!\") do?", options: ["Saves the text to a file", "Displays the text Hello! on the screen", "Deletes the text Hello!", "Asks the user a question"], correct_index: 1, explanation: "print() displays text output on the screen." },
      { question_text: "What happens when Python runs a line starting with #?", options: ["It raises an error", "It ignores the line — it's a comment", "It prints the line", "It saves the line to a file"], correct_index: 1, explanation: "Lines starting with # are comments; Python ignores them completely when running." },
      { question_text: "You get a SyntaxError after writing print(\"Hi!). What's the most likely cause?", options: ["The computer is broken", "A missing closing quotation mark", "print() doesn't exist", "The file wasn't saved"], correct_index: 1, explanation: "The line is missing its closing quotation mark — print(\"Hi!) never closes the string." },
      { question_text: "What is the terminal?", options: ["A type of programming language", "A program where you type text commands instead of clicking buttons", "Another name for Python", "A code editor"], correct_index: 1, explanation: "The terminal lets you type commands directly instead of using a graphical interface." },
      { question_text: "True or false: making mistakes and seeing error messages means you're bad at programming.", options: ["True", "False — errors are a normal, constant part of programming at every skill level"], correct_index: 1, explanation: "Every programmer, no matter how experienced, sees error messages constantly. It's a normal part of the process, not a sign of failure." },
    ]);
    console.log(`✓ Module 1 Quiz (10 questions)`);
  }

  // ── Module 1 doesn't have a separate summary lesson in the spec —
  // covered by the transition into Module 2's mission briefing instead.

  console.log("\n✅  Module 1 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
