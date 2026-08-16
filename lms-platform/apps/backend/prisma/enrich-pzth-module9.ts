/**
 * Populates Module 9 — Files, Errors & Debugging (Week 9).
 * Run with: npx ts-node prisma/enrich-pzth-module9.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 9";

async function main() {
  console.log("🌱  Populating Module 9…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 9 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🕵️ Mission: Become a Debugging Detective

Every program you've written so far forgets everything the moment it stops running. This week fixes that — and turns you into a much sharper debugger along the way.

## This Week You'll Learn To

- Read and write plain text files with \`open()\`
- Handle errors gracefully with \`try\` and \`except\` instead of letting your program crash
- Read Python error messages like a detective reads clues
- Debug broken code methodically, on purpose

## Why This Matters

Real programs save data (files, databases) and deal with things going wrong (bad input, missing files, network failures). This week is where your programs start acting like real, durable software instead of one-off scripts.
`);
    console.log(`✓ Week 9 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Reading and Writing Files");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Why Programs Use Files

Every variable you've created has lived only in memory — the instant your program ends, it's gone. **Files** let a program save data permanently, so it's still there the next time the program runs.

## Writing a File

\`\`\`python
with open("notes.txt", "w") as file:
    file.write("Hello, this is my first saved file!\\n")
    file.write("Second line.\\n")
\`\`\`

- \`open("notes.txt", "w")\` opens (creating if needed) a file named \`notes.txt\` in **write mode** (\`"w"\`) — this replaces the file's contents if it already existed
- \`with ... as file:\` automatically closes the file when the indented block finishes, even if something goes wrong — always prefer this pattern over manually opening and closing
- \`file.write(...)\` writes text; \`\\n\` starts a new line

## Reading a File

\`\`\`python
with open("notes.txt", "r") as file:
    contents = file.read()
    print(contents)
\`\`\`

\`"r"\` opens the file in **read mode**. \`.read()\` gives you the whole file's contents as one string.

## Appending Instead of Overwriting

\`\`\`python
with open("notes.txt", "a") as file:
    file.write("A new line, added without erasing what was there.\\n")
\`\`\`

\`"a"\` (append mode) adds to the end of an existing file instead of replacing it.

## Try It

Write three lines to a file called \`journal.txt\`, then open it again and print its full contents to confirm they were saved.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Write 3 lines to journal.txt, then read it back and print the contents.", code: `with open("journal.txt", "w") as file:\n    file.write("Day 1: Started learning Python.\\n")\n    file.write("Day 2: Learned about functions.\\n")\n    file.write("Day 3: Learned about files!\\n")\n\nwith open("journal.txt", "r") as file:\n    contents = file.read()\n    print(contents)\n` },
    ]);
    console.log(`✓ Reading and Writing Files (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Handling Errors With try/except");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Problem: Unhandled Errors Crash Your Program

\`\`\`python
age = int("not a number")   # ValueError — the program stops here, completely
print("This line never runs.")
\`\`\`

Without handling it, an error stops your program dead — nothing after it runs at all.

## \`try\`/\`except\`: Handling Errors Gracefully

\`\`\`python
try:
    age = int("not a number")
    print("Conversion worked!")
except ValueError:
    print("That wasn't a valid number.")

print("The program keeps going!")
\`\`\`

Python attempts everything inside \`try\`. If an error of the matching type happens, it jumps straight to \`except\` instead of crashing — and the program continues normally afterward.

## Handling a Specific File Error

\`\`\`python
try:
    with open("missing_file.txt", "r") as file:
        print(file.read())
except FileNotFoundError:
    print("That file doesn't exist yet.")
\`\`\`

## Real-World Comparison

\`try\`/\`except\` is like a safety net: "attempt this risky move, and if it fails, land safely instead of crashing entirely."

## Try It

Wrap a file-reading attempt for a file that doesn't exist in a \`try\`/\`except FileNotFoundError\`, and confirm your program prints a friendly message instead of crashing.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Attempt to open a file that doesn't exist, catching FileNotFoundError gracefully.", code: `try:\n    with open("does_not_exist.txt", "r") as file:\n        print(file.read())\nexcept FileNotFoundError:\n    print("That file doesn't exist yet — that's okay, we handled it!")\n\nprint("The program kept running.")\n` },
    ]);
    console.log(`✓ Handling Errors With try/except (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Debugging Detective: Reading Error Messages");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Anatomy of a Python Error

\`\`\`text
Traceback (most recent call last):
  File "app.py", line 3, in <module>
    total = price + "5"
TypeError: unsupported operand type(s) for +: 'float' and 'str'
\`\`\`

Read it from the **bottom up**:

1. **Last line** — the error type (\`TypeError\`) and a description of what went wrong
2. **The line above it** — the exact line of your code that caused it
3. **"line 3"** — the exact line number to go look at

## Common Error Types You'll See

- **\`SyntaxError\`** — Python couldn't understand your code's structure (missing quote, colon, or parenthesis)
- **\`NameError\`** — you used a variable that was never created (often a typo)
- **\`TypeError\`** — you tried an operation on the wrong type (like \`5 + "5"\`)
- **\`ValueError\`** — the right type, but an invalid value (like \`int("hello")\`)
- **\`IndexError\`** — you tried to access a list position that doesn't exist
- **\`KeyError\`** — you tried to access a dictionary key that doesn't exist
- **\`FileNotFoundError\`** — the file you tried to open doesn't exist

## The Debugging Process

**What happened → Why → How to fix it.** Read the error type and message first, find the exact line, then ask yourself what assumption you made that turned out to be wrong.

## Try It

Run the broken code in the lab below. Read the error message, identify which of the six error types above it is, and fix it.
`);
    await attachLab(prisma, l.id, [
      { instructions: "This code has a bug. Run it, read the error type and message, then fix it.", code: `scores = [85, 92, 78]\nprint(scores[5])   # bug: there is no index 5 in a 3-item list\n` },
    ]);
    console.log(`✓ Debugging Detective (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Persistent To-Do Application");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Persistent To-Do Application

Upgrade Week 6's to-do list so tasks are actually **saved to a file** — the missing piece that makes it a real, durable application instead of a program that forgets everything when it stops.

## Your Task

The starter code:

1. Builds a task list (same as Week 6)
2. **Saves** it to \`tasks.txt\`, one task per line
3. **Loads** it back from the file into a fresh list, proving the data survived
4. Wraps the load step in \`try\`/\`except\` in case the file doesn't exist yet

## Experiment

Add a task, save again, then reload and confirm the new task is there too.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Save tasks to a file, then load them back — add a task and confirm it round-trips.",
        code: `tasks = ["Buy groceries", "Finish Python lesson", "Call the dentist"]\n\n# Save tasks to a file, one per line\nwith open("tasks.txt", "w") as file:\n    for task in tasks:\n        file.write(task + "\\n")\n\nprint("Tasks saved!")\n\n# Load tasks back from the file\ntry:\n    with open("tasks.txt", "r") as file:\n        loaded_tasks = file.read().splitlines()\n    print("Loaded tasks:")\n    for i, task in enumerate(loaded_tasks):\n        print(f"{i + 1}. {task}")\nexcept FileNotFoundError:\n    print("No saved tasks file found yet.")\n`,
      },
    ]);
    console.log(`✓ Lab: Persistent To-Do Application (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Debugging Mystery Challenge");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🕵️ Debugging Mystery Challenge

Four broken programs. For each one: identify the error, explain what happened and why, then fix it and confirm it runs successfully.

## Mystery 1

\`\`\`python
name = "Alex"
print("Hello, " + name + "! You are " + age + " years old.")
\`\`\`

## Mystery 2

\`\`\`python
def calculate_total(price, tax):
    total = price + tax
return total
\`\`\`

## Mystery 3

\`\`\`python
grades = {"Maria": 92, "James": 78}
print(grades["Priya"])
\`\`\`

## Mystery 4

\`\`\`python
count = 0
while count < 5
    print(count)
    count += 1
\`\`\`

## Your Task

Work through all four in the lab below — the buggy versions are there, along with space to write your fixed versions and run them.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Each mystery below is broken. Fix each one (uncomment the corrected line if provided, or write your own), then run to confirm.",
        code: `# Mystery 1: NameError — age was never defined\nname = "Alex"\nage = 30   # FIX: define age before using it\nprint("Hello, " + name + "! You are " + str(age) + " years old.")\n\nprint("---")\n\n# Mystery 2: IndentationError — return must be indented inside the function\ndef calculate_total(price, tax):\n    total = price + tax\n    return total   # FIX: indent this line\n\nprint(calculate_total(10, 2))\n\nprint("---")\n\n# Mystery 3: KeyError — "Priya" isn't in the dictionary\ngrades = {"Maria": 92, "James": 78}\nprint(grades.get("Priya", "Not found"))   # FIX: use .get() with a fallback\n\nprint("---")\n\n# Mystery 4: SyntaxError — while needs a colon\ncount = 0\nwhile count < 5:   # FIX: add the missing colon\n    print(count)\n    count += 1\n`,
      },
    ]);
    console.log(`✓ Debugging Mystery Challenge (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 9 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does open(\"file.txt\", \"w\") do if file.txt already exists?", options: ["Appends to it", "Errors out", "Replaces its contents", "Deletes the file without writing"], correct_index: 2, explanation: "\"w\" (write) mode replaces the file's existing contents." },
      { question_text: "Which mode adds to the end of a file instead of replacing it?", options: ["\"r\"", "\"w\"", "\"a\"", "\"x\""], correct_index: 2, explanation: "\"a\" (append) mode adds new content to the end without erasing what's there." },
      { question_text: "Why use with open(...) as file: instead of manually calling open() and close()?", options: ["It's required syntax with no benefit", "It automatically closes the file even if an error occurs inside the block", "It's faster to type only", "It prevents reading the file"], correct_index: 1, explanation: "The with statement guarantees the file gets closed properly, even if something goes wrong inside the block." },
      { question_text: "What happens to a program when an error isn't handled with try/except?", options: ["Nothing — Python ignores it", "The program crashes and stops running at that point", "It automatically retries", "It logs a warning and continues"], correct_index: 1, explanation: "An unhandled error stops the program immediately at that line." },
      { question_text: "In try/except FileNotFoundError:, when does the except block run?", options: ["Always, regardless of errors", "Only if a FileNotFoundError occurs inside the try block", "Only at the start of the program", "Never"], correct_index: 1, explanation: "The except block only runs if the specified error type occurs during the try block." },
      { question_text: "Reading a Python error message, where do you look first?", options: ["The very top line", "The bottom line — the error type and message", "The middle of the file", "It doesn't matter"], correct_index: 1, explanation: "The bottom of a traceback shows the error type and description — the best starting point." },
      { question_text: "What error type do you get from int(\"hello\")?", options: ["TypeError", "NameError", "ValueError", "SyntaxError"], correct_index: 2, explanation: "int(\"hello\") is the right type (a string) but an invalid value to convert, raising a ValueError." },
      { question_text: "What error type do you get from accessing scores[10] on a 3-item list?", options: ["KeyError", "IndexError", "ValueError", "TypeError"], correct_index: 1, explanation: "Accessing a list position that doesn't exist raises an IndexError." },
      { question_text: "What error type do you get from accessing grades[\"Zoe\"] when \"Zoe\" isn't a key?", options: ["IndexError", "KeyError", "NameError", "ValueError"], correct_index: 1, explanation: "Accessing a missing dictionary key raises a KeyError." },
      { question_text: "What's the debugging process taught this week?", options: ["Guess randomly until it works", "What happened -> Why -> How to fix it", "Delete the code and start over", "Ask someone else to fix it"], correct_index: 1, explanation: "This structured process — understanding what happened, why, and how to fix it — is the core debugging skill taught throughout the course." },
    ]);
    console.log(`✓ Module 9 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 9 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- \`open()\` with \`"w"\`, \`"r"\`, and \`"a"\` modes reads and writes files
- \`with open(...) as file:\` is the safe, standard pattern
- \`try\`/\`except\` handles errors gracefully instead of crashing
- Reading a traceback from the bottom up: error type, message, then line number
- Common error types: SyntaxError, NameError, TypeError, ValueError, IndexError, KeyError, FileNotFoundError
- You built a to-do app that actually saves data, and solved four debugging mysteries

## Coming Up Next Week

This is it — the final week. Everything from the last nine weeks comes together in a **capstone project** you design, build, test, and debug yourself. 🏆
`);
    console.log(`✓ Module 9 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 9 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
