/**
 * Populates Module 8 — Functions (Week 8).
 * Run with: npx ts-node prisma/enrich-pzth-module8.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 8";

async function main() {
  console.log("🌱  Populating Module 8…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 8 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🛠️ Mission: Build Your Own Tools

You've been writing similar code over and over across the last seven weeks. This week, you learn to stop repeating yourself for good.

## This Week You'll Learn To

- Define and call your own **functions**
- Pass information in with **parameters** and **arguments**
- Send information back out with **return values**
- Use **default parameters** and understand **scope**

## Why This Matters

Functions are how real programs stay organized as they grow. Instead of one giant block of code, you break a program into small, named, reusable pieces — each one doing exactly one job well.
`);
    console.log(`✓ Week 8 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Why Functions Matter");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Simplest Possible Function

\`\`\`python
def say_hello():
    print("Hello!")

say_hello()   # Hello!
say_hello()   # Hello!
say_hello()   # Hello!
\`\`\`

\`def\` **defines** a function — it doesn't run the code inside yet, it just names and stores it. \`say_hello()\` (with parentheses) is what actually **calls** it, running the code inside. You can call it as many times as you want.

## Real-World Comparison

Think of a function like a recipe card: writing the recipe once (\`def\`) doesn't cook anything. Following the recipe (calling the function) is what actually makes the dish — and you can follow the same recipe card as many times as you like.

## Why Not Just Copy-Paste the Code Each Time?

If you find a bug in \`say_hello()\`, you fix it in exactly one place, and every single call to it is instantly fixed too. Copy-pasted code means finding and fixing the bug in every copy — easy to miss one.

## Try It

Define a function called \`print_divider\` that prints a line of 20 dashes, then call it three times in a row.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Define print_divider() to print 20 dashes, then call it 3 times.", code: `def print_divider():\n    print("-" * 20)\n\nprint_divider()\nprint("Some content here")\nprint_divider()\nprint("More content")\nprint_divider()\n` },
    ]);
    console.log(`✓ Why Functions Matter (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Parameters, Arguments, and Return Values");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Passing Information In: Parameters

\`\`\`python
def greet(name):
    print(f"Hello, {name}!")

greet("Sam")     # Hello, Sam!
greet("Priya")   # Hello, Priya!
\`\`\`

\`name\` is a **parameter** — a placeholder the function expects to receive. \`"Sam"\` and \`"Priya"\` are the **arguments** — the actual values you hand it on each call. Same function, different results, because you're feeding it different input.

## Multiple Parameters

\`\`\`python
def add(a, b):
    print(a + b)

add(3, 5)    # 8
\`\`\`

## Getting Information Back Out: \`return\`

So far these functions only \`print\` — they don't give you anything back to use afterward.

\`\`\`python
def add(a, b):
    return a + b

result = add(3, 5)
print(result)          # 8
print(add(10, 20))    # 30
\`\`\`

\`return\` sends a value back to wherever the function was called, so you can store it in a variable or use it directly. This is the difference between a function that just *does* something (\`print\`) and one that *calculates and hands back* something (\`return\`).

## Try It

Write a function called \`multiply(a, b)\` that returns the product of two numbers, then call it with a few different pairs of numbers and print each result.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Write multiply(a, b) using return, then call it with a few number pairs.", code: `def multiply(a, b):\n    return a * b\n\nprint(multiply(4, 5))\nprint(multiply(10, 10))\n\nresult = multiply(3, 7)\nprint(f"3 times 7 is {result}")\n` },
    ]);
    console.log(`✓ Parameters, Arguments, and Return Values (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Default Parameters and Scope");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Default Parameters

\`\`\`python
def greet(name, greeting="Hello"):
    print(f"{greeting}, {name}!")

greet("Sam")               # Hello, Sam!
greet("Priya", "Welcome")   # Welcome, Priya!
\`\`\`

A **default parameter** provides a fallback value used when the caller doesn't supply one — you only need to override it when you want something different.

## Scope: Where a Variable "Exists"

\`\`\`python
def calculate_total():
    total = 100    # this variable only exists INSIDE this function
    return total

calculate_total()
print(total)   # ERROR — total doesn't exist out here
\`\`\`

A variable created inside a function only exists **inside that function** — this is called its **scope**. Once the function finishes running, that variable is gone. This is actually a feature, not a limitation: it means functions can use simple names like \`total\` or \`result\` internally without worrying about clashing with variables anywhere else in your program.

## Try It

Write a function \`calculate_discount(price, discount_percent=10)\` that returns the discounted price. Call it once using the default discount, and once overriding it to 25.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Write calculate_discount with a default of 10%, call it once with the default and once with 25%.", code: `def calculate_discount(price, discount_percent=10):\n    discount = price * (discount_percent / 100)\n    return price - discount\n\nprint(calculate_discount(100))        # uses default 10%\nprint(calculate_discount(100, 25))    # overrides to 25%\n` },
    ]);
    console.log(`✓ Default Parameters and Scope (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Utility Toolkit");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Utility Toolkit

Build a small library of reusable functions — the kind of thing you'll reach for constantly once you have it.

## Your Task

Complete the five functions in the starter code:

- \`calculate_average(numbers)\` — returns the average of a list of numbers
- \`calculate_total(numbers)\` — returns the sum of a list of numbers
- \`convert_temperature(celsius)\` — returns the Fahrenheit equivalent (\`celsius * 9/5 + 32\`)
- \`is_even(number)\` — returns \`True\` if the number is even
- \`calculate_discount(price, percent)\` — returns the discounted price

## Experiment

Call each function with a few different inputs and print the results, to prove each one works correctly.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Complete all five utility functions, then call each one with test values and print the results.",
        code: `def calculate_average(numbers):\n    return sum(numbers) / len(numbers)\n\ndef calculate_total(numbers):\n    return sum(numbers)\n\ndef convert_temperature(celsius):\n    return celsius * 9 / 5 + 32\n\ndef is_even(number):\n    return number % 2 == 0\n\ndef calculate_discount(price, percent):\n    return price - (price * percent / 100)\n\n\n# Test each function:\nscores = [80, 90, 70, 100]\nprint(f"Average: {calculate_average(scores)}")\nprint(f"Total: {calculate_total(scores)}")\nprint(f"20C in Fahrenheit: {convert_temperature(20)}")\nprint(f"Is 7 even? {is_even(7)}")\nprint(f"Discounted price: {calculate_discount(50, 20)}")\n`,
      },
    ]);
    console.log(`✓ Lab: Utility Toolkit (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Refactor With Functions");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🛠️ Challenge: Refactor With Functions

**Refactoring** means rewriting code to work better internally without changing what it does. This challenge asks you to take repetitive-looking code and clean it up using a function.

## Your Task

The starter code calculates the total cost (with 8% tax) for three separate orders, using nearly-identical repeated lines. Refactor it into a single \`calculate_total_with_tax(subtotal)\` function, then call it three times instead.

## Requirements

- Write one function that does the tax calculation
- Replace all three repeated blocks with calls to that function
- Confirm the output values are identical to the original, un-refactored version

## Reflect

Which version was easier to read? What would happen if the tax rate changed — how many places would you need to update in each version?
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Refactor the three repeated tax calculations below into one reusable function.",
        code: `# BEFORE refactoring (repeated logic) — for reference:\n# order1 = 45.00\n# order1_total = order1 + (order1 * 0.08)\n# order2 = 120.00\n# order2_total = order2 + (order2 * 0.08)\n# order3 = 15.50\n# order3_total = order3 + (order3 * 0.08)\n\n# AFTER refactoring:\ndef calculate_total_with_tax(subtotal):\n    return subtotal + (subtotal * 0.08)\n\norder1_total = calculate_total_with_tax(45.00)\norder2_total = calculate_total_with_tax(120.00)\norder3_total = calculate_total_with_tax(15.50)\n\nprint(f"Order 1: \${round(order1_total, 2)}")\nprint(f"Order 2: \${round(order2_total, 2)}")\nprint(f"Order 3: \${round(order3_total, 2)}")\n`,
      },
    ]);
    console.log(`✓ Challenge: Refactor With Functions (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 8 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does def do?", options: ["Calls a function", "Defines a function (without running it yet)", "Deletes a function", "Prints a function's name"], correct_index: 1, explanation: "def defines a function's name and body; the code inside doesn't run until the function is called." },
      { question_text: "In def greet(name):, what is name called?", options: ["An argument", "A parameter", "A return value", "A default"], correct_index: 1, explanation: "name is a parameter — a placeholder the function expects to receive when called." },
      { question_text: "In greet(\"Sam\"), what is \"Sam\" called?", options: ["A parameter", "An argument", "A return value", "A default"], correct_index: 1, explanation: "\"Sam\" is the argument — the actual value supplied when calling the function." },
      { question_text: "What does return do that print() doesn't?", options: ["Nothing different", "Sends a value back to be stored or used elsewhere, instead of just displaying it", "Deletes the function", "Runs the function twice"], correct_index: 1, explanation: "return hands a value back to the caller so it can be stored in a variable or used in further calculations; print() only displays text." },
      { question_text: "What is a default parameter for?", options: ["It's required and can never be changed", "It provides a fallback value used when the caller doesn't supply one", "It only works with numbers", "It makes the function run faster"], correct_index: 1, explanation: "A default parameter supplies a value automatically unless the caller overrides it." },
      { question_text: "What is 'scope' in the context of functions?", options: ["How long a function takes to run", "Where in the program a variable exists and can be used", "The number of parameters a function has", "The function's return type"], correct_index: 1, explanation: "Scope determines where a variable is accessible — variables created inside a function generally only exist inside it." },
      { question_text: "def add(a, b): return a + b — what does print(add(2, 3)) output?", options: ["2 + 3", "5", "None", "An error"], correct_index: 1, explanation: "add(2, 3) returns 5, which print() then displays." },
      { question_text: "What is 'refactoring'?", options: ["Deleting all your code", "Rewriting code to work better internally without changing what it does", "Adding more bugs on purpose", "Renaming variables randomly"], correct_index: 1, explanation: "Refactoring improves code's internal structure/readability while keeping its behavior the same." },
      { question_text: "Why is repeating the same calculation in three places worse than writing one function?", options: ["It's not worse", "A bug or change has to be found and fixed in every copy instead of one place", "Functions run faster than repeated code", "Python doesn't allow repeated code"], correct_index: 1, explanation: "With repeated code, fixing a bug means finding and fixing every copy; a function centralizes the logic in one place." },
      { question_text: "What does calculate_discount(price, percent=10) allow you to do?", options: ["Only ever use a 10% discount", "Call it with just a price and get a 10% discount by default, or supply a different percent", "Nothing — this is invalid syntax", "Always require both arguments"], correct_index: 1, explanation: "percent=10 is a default — callers can omit it (using 10%) or override it with a different value." },
    ]);
    console.log(`✓ Module 8 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 8 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- \`def\` defines a function; calling it with \`()\` actually runs it
- **Parameters** are placeholders; **arguments** are the real values you pass in
- \`return\` sends a value back out, unlike \`print()\` which just displays it
- **Default parameters** provide fallback values
- **Scope** means variables inside a function generally stay inside it
- You built a reusable utility toolkit and refactored repeated code into a clean function

## Coming Up Next Week

Your programs have never remembered anything after they finish running — close the lab, and everything's gone. Next week you'll learn to **read and write files**, so your programs can save data permanently, plus how to handle errors gracefully with \`try\`/\`except\`. 🕵️
`);
    console.log(`✓ Module 8 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 8 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
