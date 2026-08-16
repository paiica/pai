/**
 * Populates Module 5 — Loops (Week 5).
 * Run with: npx ts-node prisma/enrich-pzth-module5.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 5";

async function main() {
  console.log("🌱  Populating Module 5…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 5 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔁 Mission: Master Repetition

So far, every line of your programs runs exactly once. This week you'll learn how to make Python repeat work — automatically, precisely, as many times as you need.

## This Week You'll Learn To

- Repeat a fixed number of times with \`for\` and \`range()\`
- Repeat until a condition becomes False with \`while\`
- Stop a loop early with \`break\`, or skip an iteration with \`continue\`
- Build a number guessing game and a multiplication table generator

## Why This Matters

Without loops, processing 100 items means writing the same line 100 times. With loops, it's the same handful of lines no matter whether you're processing 5 items or 5 million.
`);
    console.log(`✓ Week 5 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Why Loops Exist and the for Loop");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Without a Loop

\`\`\`python
print("Counting: 1")
print("Counting: 2")
print("Counting: 3")
print("Counting: 4")
print("Counting: 5")
\`\`\`

Five nearly-identical lines. Now imagine counting to 1,000 this way.

## With a \`for\` Loop

\`\`\`python
for number in range(1, 6):
    print(f"Counting: {number}")
\`\`\`

Same result, five lines shrink to two. \`range(1, 6)\` produces the numbers 1 through 5 (it stops **before** the second number — a common early trip-up, so double-check it). Each time through the loop, \`number\` holds the next value from that sequence, and the indented block underneath runs once per value.

## Real-World Comparison

Think of a loop like a factory conveyor belt: the same set of steps happens to each item that comes down the line, one after another, without you writing new instructions for each one.

## \`range()\` Variations

\`\`\`python
range(5)          # 0, 1, 2, 3, 4       (starts at 0 by default)
range(1, 6)        # 1, 2, 3, 4, 5
range(0, 10, 2)    # 0, 2, 4, 6, 8       (step of 2)
\`\`\`

## Try It

Write a \`for\` loop that prints the numbers 1 through 10, then a second loop that prints only the even numbers from 0 to 20 using a step of 2.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Write a loop printing 1-10, then a loop printing even numbers 0-20 using a step.", code: `for number in range(1, 11):\n    print(number)\n\nprint("---")\n\nfor even in range(0, 21, 2):\n    print(even)\n` },
    ]);
    console.log(`✓ Why Loops Exist and the for Loop (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "The while Loop");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What \`while\` Does Differently

A \`for\` loop repeats a **fixed** number of times. A \`while\` loop repeats **as long as a condition stays True** — you don't need to know in advance how many times.

\`\`\`python
count = 1
while count <= 5:
    print(f"Count is {count}")
    count = count + 1
\`\`\`

## The Most Important Rule of \`while\` Loops

**Something inside the loop must eventually make the condition False**, or it runs forever (an "infinite loop"). Notice \`count = count + 1\` above — without that line, \`count\` would stay \`1\` forever and the loop would never stop.

## Real-World Comparison

Think of \`while\` like a rule: "keep adding sugar while the coffee tastes bitter." You don't know exactly how many spoonfuls it'll take — you just keep going until the condition (still bitter) becomes False.

## Accumulators: A Common \`while\` Pattern

\`\`\`python
total = 0
number = 1
while number <= 5:
    total = total + number   # "accumulate" the running total
    number = number + 1

print(total)   # 15  (1+2+3+4+5)
\`\`\`

\`total\` is called an **accumulator** — a variable that builds up a result across every pass through the loop.

## Try It

Write a \`while\` loop that adds up the numbers from 1 to 10 and prints the final total.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Use a while loop and an accumulator to sum the numbers 1 through 10.", code: `total = 0\nnumber = 1\n\nwhile number <= 10:\n    total = total + number\n    number = number + 1\n\nprint(f"Total: {total}")\n` },
    ]);
    console.log(`✓ The while Loop (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Loop Control: break and continue");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## \`break\`: Stop the Loop Entirely

\`\`\`python
for number in range(1, 11):
    if number == 5:
        break
    print(number)
# prints 1, 2, 3, 4 — then stops completely once number hits 5
\`\`\`

\`break\` immediately exits the loop, skipping any remaining values entirely.

## \`continue\`: Skip Just This One Pass

\`\`\`python
for number in range(1, 11):
    if number % 2 == 0:
        continue
    print(number)
# prints only odd numbers: 1, 3, 5, 7, 9
\`\`\`

\`continue\` skips the rest of the current pass and jumps straight to the next value — the loop keeps going, it just skips that one iteration's remaining code.

## Real-World Comparison

\`break\` is like leaving a line entirely once you get what you needed. \`continue\` is like skipping one person's turn but staying in line yourself.

## Try It

Write a loop over \`range(1, 21)\` that prints every number, but skips multiples of 3 with \`continue\`, and stops entirely (\`break\`) once it reaches 15.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Loop 1-20: skip multiples of 3 with continue, stop entirely at 15 with break.", code: `for number in range(1, 21):\n    if number == 15:\n        break\n    if number % 3 == 0:\n        continue\n    print(number)\n` },
    ]);
    console.log(`✓ Loop Control (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Number Guessing Game");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Number Guessing Game

A classic beginner project: guess a secret number, with the program giving "too high" / "too low" feedback until you get it right.

## About the Lab

A real version of this game would use \`input()\` inside a \`while True:\` loop to ask for a new guess after every piece of feedback. Since this sandbox can't take live input (see Module 3), this version simulates a player's guesses as a **list**, and loops through it, giving feedback on each one — the exact same logic you'd use at home, minus the live typing.

## Your Task

Run the starter code. Notice how the loop tracks the number of **attempts** and gives feedback each time using \`if\`/\`elif\`/\`else\`, then stops with \`break\` once the guess is correct.

## Experiment

Change the \`secret_number\` or the \`guesses\` list so the correct guess happens on the first try, then on the last try, then never (does your code handle "ran out of guesses" gracefully?).

## At Home

Replace the \`for guess in guesses:\` loop with \`while True: guess = int(input("Guess a number: "))\` and you'll have the real, fully interactive version.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Try changing secret_number or the guesses list, and see how the feedback and attempt count change.",
        code: `secret_number = 42\nguesses = [25, 60, 45, 40, 42]   # simulates a player's guesses, one per attempt\n\nattempts = 0\nfor guess in guesses:\n    attempts = attempts + 1\n    if guess == secret_number:\n        print(f"Correct! You got it in {attempts} attempts.")\n        break\n    elif guess < secret_number:\n        print(f"Attempt {attempts}: {guess} is too low.")\n    else:\n        print(f"Attempt {attempts}: {guess} is too high.")\n`,
      },
    ]);
    console.log(`✓ Lab: Number Guessing Game (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Multiplication Table Generator");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔁 Challenge: Multiplication Table Generator

## Part 1 — Easy Version

Using a \`for\` loop and \`range()\`, print the multiplication table for the number 7, from 7×1 up to 7×12, formatted like \`7 x 1 = 7\`.

## Part 2 — Harder Version

Turn the \`7\` into a variable called \`number_to_table\` at the top of your program, so changing that one value changes the entire table. Test it by generating the table for a few different numbers.

## Stretch Goal

Use a **nested loop** (a loop inside a loop) to print the full 1–12 multiplication grid — 12 separate tables, one after another.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Build the multiplication table generator. Try changing number_to_table, then attempt the nested-loop stretch goal below it.",
        code: `number_to_table = 7\n\nfor i in range(1, 13):\n    print(f"{number_to_table} x {i} = {number_to_table * i}")\n\n# Stretch goal — uncomment to try a nested loop for the full 1-12 grid:\n# for table_number in range(1, 13):\n#     print(f"--- {table_number} times table ---")\n#     for i in range(1, 13):\n#         print(f"{table_number} x {i} = {table_number * i}")\n`,
      },
    ]);
    console.log(`✓ Challenge: Multiplication Table Generator (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 5 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What values does range(1, 6) produce?", options: ["1, 2, 3, 4, 5, 6", "1, 2, 3, 4, 5", "0, 1, 2, 3, 4, 5", "2, 3, 4, 5, 6"], correct_index: 1, explanation: "range(1, 6) stops before 6, giving 1 through 5." },
      { question_text: "What's the key difference between for and while loops?", options: ["for repeats forever; while repeats a fixed number of times", "for repeats a known/fixed sequence; while repeats until a condition becomes False", "They are identical", "while can only count down"], correct_index: 1, explanation: "for iterates over a known sequence; while repeats based on a condition, without knowing the count in advance." },
      { question_text: "What happens if nothing inside a while loop changes the condition?", options: ["Python fixes it automatically", "An infinite loop — it never stops", "It runs exactly once", "A syntax error"], correct_index: 1, explanation: "If the condition never becomes False, the while loop runs forever." },
      { question_text: "What does break do inside a loop?", options: ["Skips just the current iteration", "Exits the loop completely", "Pauses the loop for 1 second", "Restarts the loop from the top"], correct_index: 1, explanation: "break exits the loop entirely, skipping any remaining iterations." },
      { question_text: "What does continue do inside a loop?", options: ["Exits the loop completely", "Skips the rest of the current iteration and moves to the next one", "Does nothing", "Ends the program"], correct_index: 1, explanation: "continue skips the remaining code in the current pass and jumps to the next iteration." },
      { question_text: "In total = total + number inside a loop, what is total called?", options: ["A counter", "An accumulator — it builds up a running result", "A range", "A break"], correct_index: 1, explanation: "A variable that accumulates a running total across loop iterations is called an accumulator." },
      { question_text: "What does range(0, 10, 2) produce?", options: ["0,1,2,...,10", "0, 2, 4, 6, 8", "2, 4, 6, 8, 10", "0, 10"], correct_index: 1, explanation: "The third argument to range() is the step — here, every 2nd number starting from 0, stopping before 10." },
      { question_text: "Why do this course's labs use a list of guesses instead of input() for the guessing game?", options: ["Lists are faster", "The lab sandbox can't receive live typed input while running", "input() doesn't work with numbers", "It's a Python limitation"], correct_index: 1, explanation: "The sandbox runs code once with no way to receive live keystrokes, so a pre-set list simulates a player's sequence of guesses." },
      { question_text: "What is a nested loop?", options: ["A loop that runs backwards", "A loop placed inside another loop", "A loop with no body", "A loop that only runs once"], correct_index: 1, explanation: "A nested loop is simply a loop written inside the body of another loop." },
      { question_text: "for number in range(1, 5):\\n    if number == 3:\\n        break\\n    print(number)\\nWhat gets printed before the loop stops?", options: ["1, 2", "1, 2, 3", "1, 2, 3, 4", "Nothing"], correct_index: 0, explanation: "print(number) runs before the break check each iteration, so 1 and 2 print — then when number is 3, break exits before print(number) runs for 3." },
    ]);
    console.log(`✓ Module 5 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 5 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- \`for\` loops repeat over a known sequence, often using \`range()\`
- \`while\` loops repeat until a condition becomes False
- \`break\` exits a loop entirely; \`continue\` skips just the current pass
- Accumulators build up a running result across a loop
- You built a number guessing game and a multiplication table generator

## Coming Up Next Week

You've been storing one value per variable this whole time. Next week you'll learn **lists** — a single variable that can hold many values at once, and how loops and lists work together to process real collections of data. 📋
`);
    console.log(`✓ Module 5 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 5 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
