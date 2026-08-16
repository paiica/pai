/**
 * Populates Module 4 — Decisions & Logic (Week 4).
 * Run with: npx ts-node prisma/enrich-pzth-module4.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 4";

async function main() {
  console.log("🌱  Populating Module 4…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 4 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Mission: Teach Python to Make Decisions

Every program you've written so far runs the exact same steps every single time, no matter what. This week, that changes for good — you're about to teach Python to think.

## This Week You'll Learn To

- Compare values with \`>\`, \`<\`, \`>=\`, \`<=\`, \`==\`, and \`!=\`
- Make your program branch with \`if\`, \`elif\`, and \`else\`
- Combine multiple conditions with \`and\`, \`or\`, and \`not\`
- Build a program that makes real decisions based on the situation

## Why This Matters

Decisions are what separate a program that just displays fixed text from a program that actually *responds* to the world — a grading system, a login check, a game — almost nothing useful can be built without them.
`);
    console.log(`✓ Week 4 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Booleans and Comparisons");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Comparison Operators

Comparisons ask a true-or-false question about two values and produce a **bool** (\`True\` or \`False\`):

\`\`\`python
print(5 > 3)     # True
print(5 < 3)     # False
print(5 >= 5)    # True  (greater than or equal to)
print(5 <= 4)    # False (less than or equal to)
print(5 == 5)    # True  (equal to)
print(5 != 5)    # False (not equal to)
\`\`\`

## \`==\` vs \`=\`: A Critical Difference

\`\`\`python
age = 18      # = assigns a value
age == 18     # == asks a question: "is age equal to 18?"
\`\`\`

Mixing these up is one of the most common beginner mistakes — \`=\` **does** something, \`==\` **asks** something.

## Comparisons Work on Text Too

\`\`\`python
print("apple" == "apple")   # True
print("apple" == "Apple")   # False — comparisons are case-sensitive
\`\`\`

## Try It

Predict the output of each of these before running them: \`10 == 10\`, \`10 != 5\`, \`"cat" == "dog"\`, \`7 >= 7\`.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Predict each result, then run to check.", code: `print(10 == 10)\nprint(10 != 5)\nprint("cat" == "dog")\nprint(7 >= 7)\n` },
    ]);
    console.log(`✓ Booleans and Comparisons (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "if, elif, and else");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The \`if\` Statement

\`\`\`python
age = 20
if age >= 18:
    print("You can vote.")
\`\`\`

Read this as: "if the condition is True, run the indented code underneath it." The **indentation** (4 spaces, always) is not just style — it's how Python knows which lines belong to the \`if\`.

## Real-World Comparison

Think of a bouncer at a club: "if you're 21 or older, you can come in." One condition, one path.

## Adding \`else\`

\`\`\`python
age = 15
if age >= 18:
    print("You can vote.")
else:
    print("You can't vote yet.")
\`\`\`

\`else\` runs when the \`if\` condition is False — exactly one of the two blocks runs, never both, never neither.

## Adding \`elif\` for More Than Two Paths

\`\`\`python
score = 85
if score >= 90:
    print("Grade: A")
elif score >= 80:
    print("Grade: B")
elif score >= 70:
    print("Grade: C")
else:
    print("Grade: F")
\`\`\`

Python checks each condition top to bottom and runs the **first** one that's True, then skips the rest entirely — even if a later condition would also be True.

## Try It

Write a program that checks a \`temperature\` variable and prints \`"Hot"\` if it's above 85, \`"Cold"\` if it's below 60, and \`"Nice"\` otherwise.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Complete the temperature checker using if/elif/else.", code: `temperature = 72\n\nif temperature > 85:\n    print("Hot")\nelif temperature < 60:\n    print("Cold")\nelse:\n    print("Nice")\n` },
    ]);
    console.log(`✓ if, elif, and else (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Combining Conditions: and, or, not");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Combining Multiple Conditions

\`\`\`python
age = 25
has_ticket = True

if age >= 18 and has_ticket:
    print("Welcome in!")
\`\`\`

- \`and\` — **both** sides must be True
- \`or\` — **at least one** side must be True
- \`not\` — flips True to False and vice versa

\`\`\`python
print(True and False)   # False
print(True or False)    # True
print(not True)         # False
\`\`\`

## A Practical Example

\`\`\`python
weather = "sunny"
temperature = 75

if weather == "sunny" and temperature > 70:
    print("Great day for the beach!")
elif weather == "rainy" or temperature < 50:
    print("Better stay inside.")
else:
    print("Could go either way.")
\`\`\`

## Try It

Write a condition that checks whether a \`username\` is not empty **and** a \`password\` is at least 8 characters long (hint: \`len(password) >= 8\` gives you the length).
`);
    await attachLab(prisma, l.id, [
      { instructions: "Check that username isn't empty and password is at least 8 characters, using and.", code: `username = "coder123"\npassword = "hunter22"\n\nif username != "" and len(password) >= 8:\n    print("Account details look valid.")\nelse:\n    print("Please check your username and password.")\n` },
    ]);
    console.log(`✓ Combining Conditions (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Smart Decision Maker");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Smart Decision Maker

Build a program that makes a real decision based on a few pieces of information — a simplified version of things like movie ticket pricing or weather recommendations.

## Your Task

Using the pre-set variables in the lab (edit them to test different scenarios), write \`if\`/\`elif\`/\`else\` logic that decides a **movie ticket price**:

- Under 13 years old: $8
- 13–64 years old: $14
- 65 and older: $10

## Experiment

Change the \`age\` value and re-run to test all three branches. Then add a fourth rule: if it's a Tuesday (\`day == "Tuesday"\`), the price is always $6 regardless of age.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Edit the age value to test each pricing branch, then try adding the Tuesday-special rule described above.",
        code: `age = 30\nday = "Wednesday"\n\nif age < 13:\n    price = 8\nelif age < 65:\n    price = 14\nelse:\n    price = 10\n\nprint(f"Ticket price: \${price}")\n`,
      },
    ]);
    console.log(`✓ Lab: Smart Decision Maker (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Boss Battle: Treasure Hunt");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Boss Battle: Treasure Hunt

This is your first "Boss Battle" — a slightly bigger challenge that pulls together everything from this week.

## The Setup

You're standing at a fork with a \`has_map\`, \`has_key\`, and \`torches_lit\` variable (all \`True\`/\`False\`), plus a \`monster_nearby\` variable.

## Requirements

Using \`if\`/\`elif\`/\`else\` and \`and\`/\`or\`/\`not\`, write logic that:

- Prints \`"You found the treasure!"\` only if you have **both** the map and the key, **and** no monster is nearby
- Prints \`"A monster blocks your path — retreat!"\` if a monster is nearby, regardless of anything else
- Otherwise prints \`"You're missing something important. Keep exploring."\`

## Experiment

Change each variable to \`True\`/\`False\` combinations and re-run to make sure all three outcomes are reachable.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Change the four variables and re-run to test every branch of your treasure hunt logic.",
        code: `has_map = True\nhas_key = True\ntorches_lit = True\nmonster_nearby = False\n\nif monster_nearby:\n    print("A monster blocks your path — retreat!")\nelif has_map and has_key:\n    print("You found the treasure!")\nelse:\n    print("You're missing something important. Keep exploring.")\n`,
      },
    ]);
    console.log(`✓ Boss Battle: Treasure Hunt (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 4 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does age == 18 do?", options: ["Assigns 18 to age", "Asks whether age equals 18, giving True or False", "Prints 18", "Deletes age"], correct_index: 1, explanation: "== is a comparison, not assignment — it asks a true/false question." },
      { question_text: "What determines which lines belong to an if statement in Python?", options: ["Curly braces {}", "Semicolons", "Indentation", "Parentheses"], correct_index: 2, explanation: "Python uses indentation (4 spaces) to define which lines are inside an if block." },
      { question_text: "In an if/elif/else chain, how many branches run?", options: ["All that are True", "Exactly one — the first True one, or else if none are True", "None unless explicitly called", "Always the last one"], correct_index: 1, explanation: "Python checks top to bottom and runs the first True branch, then skips the rest — or runs else if none matched." },
      { question_text: "What does True and False evaluate to?", options: ["True", "False", "Error", "None"], correct_index: 1, explanation: "and requires both sides to be True; since one is False, the result is False." },
      { question_text: "What does not True evaluate to?", options: ["True", "False", "1", "Error"], correct_index: 1, explanation: "not flips a boolean: not True is False." },
      { question_text: "Which operator requires only one of two conditions to be True?", options: ["and", "or", "not", "=="], correct_index: 1, explanation: "or is True if at least one side is True." },
      { question_text: "What will if age >= 18 and has_ticket: print(...) do if age is 20 and has_ticket is False?", options: ["It prints", "It doesn't print — both conditions must be True for and", "It errors", "It prints twice"], correct_index: 1, explanation: "and requires both sides True; has_ticket is False, so the block doesn't run." },
      { question_text: "Is \"Apple\" == \"apple\" True or False?", options: ["True", "False — string comparisons are case-sensitive"], correct_index: 1, explanation: "String comparisons are case-sensitive, so different capitalization means they're not equal." },
      { question_text: "What's the difference between = and == ?", options: ["No difference", "= assigns a value; == compares two values", "== assigns a value; = compares two values", "Both compare values"], correct_index: 1, explanation: "= stores a value into a variable; == asks whether two values are equal." },
      { question_text: "Why can't you use input() to test different scenarios in this course's labs?", options: ["input() doesn't exist in Python", "The lab sandbox has no way to receive typed input while running", "It's against the rules", "input() only works with numbers"], correct_index: 1, explanation: "The lab runs code once and captures the output — there's no channel for live keyboard input, so labs use editable pre-set variables instead." },
    ]);
    console.log(`✓ Module 4 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 4 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Comparison operators: \`>\` \`<\` \`>=\` \`<=\` \`==\` \`!=\`
- \`if\`, \`elif\`, and \`else\` make your program branch based on conditions
- \`and\`, \`or\`, and \`not\` combine multiple conditions
- You built a ticket pricing system and a treasure hunt decision engine

## Coming Up Next Week

Your programs can now think, but they still only run each line once. Next week you'll learn **loops** — how to make Python repeat work automatically, whether that's asking a question until the user gets it right, or processing a hundred items without writing the same line a hundred times. 🔁
`);
    console.log(`✓ Module 4 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 4 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
