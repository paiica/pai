/**
 * Populates Module 3 — Input & Interactive Programs (Week 3).
 * Run with: npx ts-node prisma/enrich-pzth-module3.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 3";

async function main() {
  console.log("🌱  Populating Module 3…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 3 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🎮 Mission: Make Python Interactive

Every program you've written so far runs exactly the same way every time. This week, that changes — your programs are about to start listening.

## This Week You'll Learn To

- Read input the user types with \`input()\`
- Convert that input between types with \`int()\`, \`float()\`, and \`str()\`
- Format text cleanly with **f-strings**
- Build a real interactive quiz that responds to what the user types

## Why This Matters

Almost every useful program interacts with a person in some way. This week's skill — reading input and responding to it — is the foundation of every interactive program you'll ever build.
`);
    console.log(`✓ Week 3 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Getting Input From Users");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Meet \`input()\`

\`\`\`python
name = input("What is your name? ")
print("Hello, " + name + "!")
\`\`\`

\`input()\` pauses your program, shows the message you gave it, waits for the user to type something and press Enter, and then hands you back whatever they typed.

## A Critical Fact: \`input()\` Always Returns Text

No matter what the user types — even if it's \`"28"\` — \`input()\` gives it back to you as a **string**. This surprises almost every beginner at least once:

\`\`\`python
age = input("How old are you? ")
print(type(age))          # <class 'str'>, even if the user typed 28
next_year = age + 1       # ERROR — can't add a string and a number
\`\`\`

That error is expected and correct — the next lesson covers exactly how to convert input into a real number on purpose.

## A Note About This Course's Labs

The in-browser lab in this course runs your code once and shows you the output — it can't pause partway through and wait for you to type an answer the way \`input()\` normally would. So in the labs this week, you'll see a variable already holding a value, with a comment showing where \`input()\` would normally go — you edit that value directly, then run the program, exactly like a user "typing" a different answer each time. When you install Python locally, \`input()\` will work exactly as written here, pausing for real keyboard input.

## Try It

On paper (or in a text editor), write what a short program asking for the user's favorite color and printing it back in a sentence would look like, using real \`input()\` — you'll build the runnable version in the lab next.
`);
    console.log(`✓ Getting Input From Users (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Converting Types and f-Strings");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Converting Input to Numbers

\`\`\`python
age_text = input("How old are you? ")   # always a string
age = int(age_text)                       # now a real integer
print(age + 1)                             # works!
\`\`\`

- \`int(value)\` converts to a whole number
- \`float(value)\` converts to a decimal number
- \`str(value)\` converts to text (useful when combining numbers with text using \`+\`)

You can also convert directly, without a separate variable:

\`\`\`python
age = int(input("How old are you? "))
\`\`\`

## f-Strings: A Cleaner Way to Combine Text and Values

Instead of gluing pieces together with \`+\`, Python offers **f-strings** — put an \`f\` right before the opening quote, and anything inside \`{curly braces}\` gets evaluated and inserted automatically:

\`\`\`python
name = "Sam"
age = 28
print(f"Hello, {name}! You are {age} years old.")
# Hello, Sam! You are 28 years old.
\`\`\`

f-strings handle type conversion for you automatically — no need to wrap numbers in \`str()\` first. You'll use f-strings constantly for the rest of this course; they're the standard, modern way to build text output in Python.

## Try It

Change the \`name\` and \`age\` values below to your own, then run it — this simulates what a user typing those answers into \`input()\` would produce. (At home, replace the two commented-out lines with real \`input()\` calls and it works identically.)
`);
    await attachLab(prisma, l.id, [
      { instructions: "Edit the name and age values to your own, then run. The commented lines show what this looks like with real input().", code: `# At home, these two lines would be:\n# name = input("What is your name? ")\n# age = int(input("How old are you? "))\nname = "Sam"\nage = 28\n\nprint(f"{name} will turn {age + 1} next year.")\n` },
    ]);
    console.log(`✓ Converting Types and f-Strings (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Build Your Own Interactive Quiz");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Build Your Own Interactive Quiz

Combine everything from this week: \`input()\`, type conversion, and f-strings, into a small interactive quiz.

## Your Task

The lab below has three answers pre-set as variables, with commented-out \`input()\` lines showing what they'd look like as a real interactive program. Edit the three values to your own answers and run it.

1. Change the \`name\`, \`hobby\`, and \`city\` values below
2. Run the program and check the summary
3. Add a fourth variable (like your favorite food) and work it into the summary too

## Experiment

Try adding a numeric answer (like your age) and using it in a calculation in the final summary — e.g. \`f"In 5 years you'll be {age + 5}."\`

## At Home

Replace each pre-set variable with the matching \`input()\` line (shown commented out above it) and this program becomes genuinely interactive.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Edit the three answers below to your own, then run. Each commented line shows the real input() version.",
        code: `# At home:\n# name = input("What is your name? ")\n# hobby = input("What is one hobby you enjoy? ")\n# city = input("What city do you live in? ")\nname = "Sam"\nhobby = "reading"\ncity = "Austin"\n\nprint(f"Nice to meet you, {name}!")\nprint(f"So you enjoy {hobby} and you're from {city}. That's great!")\n`,
      },
    ]);
    console.log(`✓ Lab: Build Your Own Interactive Quiz (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Choose Your Adventure");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🎮 Challenge: Choose Your Adventure

Build a tiny interactive story. Since you haven't learned conditionals yet (that's next week!), this version doesn't branch based on the answer — it just weaves the user's own answers back into the story, Mad-Libs style.

## Requirements

- **At least 3 pieces of information** (e.g. a name, a place, an animal, a number) stored as variables
- Use every one of them somewhere in a short story you print using f-strings
- The story should be at least 4 sentences long

## Example Shape

\`"You, {name}, wake up in {place}. Suddenly, a {animal} appears! You have {number} seconds to decide what to do..."\`

## Stretch Goal

Add an adjective and a verb variable too, and work them into the story for extra silliness.

## About the Lab

The starter code pre-sets the four variables (with the real \`input()\` version commented out above each) — edit the values to make the story your own, then run it.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Edit the four variables to your own choices, then run your story. The commented lines show the real input() version.",
        code: `# At home:\n# name = input("Enter your name: ")\n# place = input("Enter a place: ")\n# animal = input("Enter an animal: ")\n# number = input("Enter a number: ")\nname = "Jordan"\nplace = "an abandoned space station"\nanimal = "three-eyed cat"\nnumber = "10"\n\nprint(f"You, {name}, wake up in {place}.")\nprint(f"Suddenly, a wild {animal} appears!")\nprint(f"You have {number} seconds to decide what to do...")\nprint("You decide to run. You made it out safely. The end!")\n`,
      },
    ]);
    console.log(`✓ Challenge: Choose Your Adventure (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 3 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What type does input() always return, no matter what the user types?", options: ["int", "float", "str", "bool"], correct_index: 2, explanation: "input() always returns a string, even if the user types digits." },
      { question_text: "What does int(input(\"Enter a number: \")) do?", options: ["Prints a number", "Reads input and converts it to an integer", "Only works with decimals", "Deletes the input"], correct_index: 1, explanation: "This reads a string from input() and immediately converts it to an int." },
      { question_text: "What is the f in an f-string for?", options: ["It marks the string as 'final'", "It enables {curly brace} expressions to be evaluated and inserted", "It means 'formatted file'", "It has no effect"], correct_index: 1, explanation: "The f prefix enables expressions inside {} to be evaluated and inserted into the string." },
      { question_text: "What does print(f\"{2 + 2}\") output?", options: ["2 + 2", "{2 + 2}", "4", "An error"], correct_index: 2, explanation: "f-strings evaluate the expression inside {} — 2 + 2 becomes 4." },
      { question_text: "Why does age + 1 fail if age = input(\"Age: \") and the user types 28?", options: ["1 is not a valid number", "age is a string, and you can't add a string and an int directly", "input() is broken", "+ doesn't work with numbers"], correct_index: 1, explanation: "age holds the string \"28\", not the number 28, so adding an int to it raises an error until it's converted." },
      { question_text: "Which function converts a string to a decimal number?", options: ["int()", "str()", "float()", "input()"], correct_index: 2, explanation: "float() converts text into a decimal number." },
      { question_text: "What does str(28) return?", options: ["28 (an int)", "\"28\" (a string)", "28.0", "An error"], correct_index: 1, explanation: "str() converts a value into its text (string) representation." },
      { question_text: "In name = input(\"Name: \"), what is the text \"Name: \" for?", options: ["It's required by Python syntax and does nothing", "It's the prompt message shown to the user before they type", "It stores the user's answer", "It sets the variable's type"], correct_index: 1, explanation: "The text passed to input() is the prompt shown to the user." },
      { question_text: "Which is the modern, preferred way to combine text and variables in Python?", options: ["Only using +", "f-strings", "Only using print() multiple times", "There is no way to combine them"], correct_index: 1, explanation: "f-strings are the modern, readable standard for combining text and values." },
      { question_text: "What will print(f\"{name} is {age}\") do if name and age were never converted from input()?", options: ["It will error", "It will still work — f-strings handle any type automatically", "It will only print name", "It will crash Python"], correct_index: 1, explanation: "f-strings automatically convert values to text for display, so this works fine even without manual conversion." },
    ]);
    console.log(`✓ Module 3 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 3 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- \`input()\` reads what the user types, always as a **string**
- \`int()\`, \`float()\`, and \`str()\` convert between types on purpose
- **f-strings** (\`f"{value}"\`) are the clean, modern way to combine text and values
- You built an interactive quiz and a Choose Your Adventure story

## Coming Up Next Week

Your programs can now listen, but they still can't make decisions — they run the exact same steps no matter what the user says. Next week you'll teach Python to think: \`if\`, \`elif\`, and \`else\` let your programs respond differently depending on the situation. 🧠
`);
    console.log(`✓ Module 3 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 3 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
