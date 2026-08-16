/**
 * Populates Module 2 — Variables, Data Types & Your First Calculator (Week 2).
 * Run with: npx ts-node prisma/enrich-pzth-module2.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 2";

async function main() {
  console.log("🌱  Populating Module 2…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 2 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧮 Mission: Build a Calculator

Welcome to Week 2. Last week you wrote and ran your first programs. This week you'll learn how Python stores and works with information — and by Sunday, you'll have built a real calculator.

## This Week You'll Learn To

- Store information in **variables**
- Recognize Python's core **data types**: text, whole numbers, decimals, and true/false values
- Use **arithmetic operators** to do math in your programs
- Build calculators for real situations: totals, tips, and currency conversions

## Why This Matters

Every program you'll ever write needs to remember things — a user's name, a price, a score. Variables are how Python remembers. Everything else you build for the rest of this course depends on being comfortable with this week's material, so take your time.
`);
    console.log(`✓ Week 2 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Variables and Assignment");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is a Variable?

A **variable** is a named container that stores a value so you can use it later. Think of it like a labeled box: you write a name on the box, put something inside, and can look inside (or swap what's inside) any time.

\`\`\`python
name = "Maria"
age = 28
\`\`\`

Here, \`name\` and \`age\` are variables. The \`=\` sign is called **assignment** — it doesn't mean "equals" the way it does in math, it means "store the value on the right into the variable on the left."

## Real-World Comparison

Think of a variable like a labeled storage bin. The label (\`age\`) stays the same, but what's inside can change over time — just like you might swap what's in a bin labeled "receipts" throughout the year.

## Naming Variables

Variable names can contain letters, numbers, and underscores, but can't start with a number and can't contain spaces. Good variable names describe what they hold:

\`\`\`python
student_name = "Jordan"     # clear
x = "Jordan"                  # works, but tells you nothing
\`\`\`

## Updating a Variable

\`\`\`python
score = 0
print(score)      # 0
score = 10
print(score)      # 10
score = score + 5
print(score)      # 15
\`\`\`

That last line reads the current value of \`score\`, adds 5, and stores the result back into \`score\` — a very common pattern you'll use constantly.

## Try It

Create three variables of your own — one for your name, one for your age, and one for your favorite number — and print all three.
`);
    console.log(`✓ Variables and Assignment (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Data Types: Strings, Numbers, and Booleans");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Python's Core Data Types

Every value in Python has a **type** — it determines what kind of data it is and what you can do with it.

- **str** (string) — text, always in quotes: \`"hello"\`, \`"28"\`
- **int** (integer) — whole numbers, no decimal point: \`28\`, \`-5\`, \`0\`
- **float** — decimal numbers: \`3.14\`, \`19.99\`
- **bool** (boolean) — exactly two possible values: \`True\` or \`False\`

\`\`\`python
name = "Maria"       # str
age = 28              # int
price = 19.99         # float
is_student = True     # bool
\`\`\`

## Checking a Type With \`type()\`

\`\`\`python
print(type(name))        # <class 'str'>
print(type(age))         # <class 'int'>
print(type(price))       # <class 'float'>
print(type(is_student))  # <class 'bool'>
\`\`\`

\`type()\` is a quick way to check what kind of data you're actually working with — extremely useful when something isn't behaving the way you expect.

## A Common Trap: \`"28"\` vs \`28\`

\`\`\`python
age_text = "28"    # this is a string — just text that looks like a number
age_number = 28    # this is an actual int you can do math with
\`\`\`

\`"28" + "2"\` doesn't give you \`30\` — it glues the text together into \`"282"\`. You'll see exactly why, and how to convert between types on purpose, in Week 3.

## Try It

Create one variable of each type (str, int, float, bool) and print each one's type using \`type()\`.
`);
    console.log(`✓ Data Types (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Arithmetic Operators");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Python's Math Operators

\`\`\`python
print(10 + 3)   # 13  — addition
print(10 - 3)   # 7   — subtraction
print(10 * 3)   # 30  — multiplication
print(10 / 3)   # 3.3333333333333335  — division (always gives a float)
print(10 // 3)  # 3   — floor division (rounds down to a whole number)
print(10 % 3)   # 1   — modulo (the remainder after division)
print(10 ** 3)  # 1000 — exponent (10 to the power of 3)
\`\`\`

## Where \`%\` and \`//\` Actually Matter

These two feel unfamiliar at first but come up constantly in real programs:

- \`//\` (floor division) is perfect for "how many whole groups fit" — e.g. \`total_minutes // 60\` gives whole hours.
- \`%\` (modulo) is perfect for "what's left over" — e.g. \`total_minutes % 60\` gives the leftover minutes, or checking if a number is even with \`number % 2 == 0\`.

## Order of Operations

Python follows the same math rules you already know — multiplication and division happen before addition and subtraction, and parentheses override everything:

\`\`\`python
print(2 + 3 * 4)      # 14, not 20
print((2 + 3) * 4)    # 20
\`\`\`

## Try It

Predict the output of \`print(7 // 2)\` and \`print(7 % 2)\` before running them. Then check your answer in the lab below.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Predict, then run: what will these four lines print?", code: `print(7 // 2)\nprint(7 % 2)\nprint(2 ** 5)\nprint(15 / 4)\n` },
    ]);
    console.log(`✓ Arithmetic Operators (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Build Your First Calculator");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Build Your First Calculator

Time to combine variables, data types, and arithmetic into a real program: a calculator that totals up the cost of multiple items.

## Your Task

Using the starter code in the lab, store the price of three items in variables, then calculate and print the total.

## Experiment

Once it works, try:
- Adding a fourth item
- Calculating the **average** price per item (total divided by number of items)
- Adding a sales tax calculation (multiply the total by \`1.08\` for 8% tax)
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Complete the calculator: store three item prices in variables, then calculate and print the total.",
        code: `item1 = 12.99\nitem2 = 4.50\nitem3 = 7.25\n\ntotal = item1 + item2 + item3\nprint("Total: $" + str(round(total, 2)))\n`,
      },
    ]);
    console.log(`✓ Lab: Build Your First Calculator (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Pizza Bill Calculator");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧮 Challenge: Pizza Bill Calculator

You and your friends ordered pizza. Write a program that calculates the total bill.

## Requirements

Using variables, calculate and print a bill that includes:

- **Number of pizzas** ordered
- **Price per pizza**
- **Tax** (8.5%)
- **Final total**

## Starter Structure

Store each value in a clearly named variable, calculate the subtotal (pizzas × price), then the tax (subtotal × 0.085), then the final total (subtotal + tax). Print each amount on its own line, formatted like \`Subtotal: $45.00\`.

## Stretch Goal

Add a tip calculation (18% of the subtotal) to the final total.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Build the pizza bill calculator: number of pizzas, price per pizza, 8.5% tax, and a final total.",
        code: `num_pizzas = 3\nprice_per_pizza = 14.99\n\nsubtotal = num_pizzas * price_per_pizza\ntax = subtotal * 0.085\ntotal = subtotal + tax\n\nprint("Subtotal: $" + str(round(subtotal, 2)))\nprint("Tax: $" + str(round(tax, 2)))\nprint("Total: $" + str(round(total, 2)))\n`,
      },
    ]);
    console.log(`✓ Challenge: Pizza Bill Calculator (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 2 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does the = sign do in age = 28?", options: ["Checks if age equals 28", "Stores the value 28 into the variable age", "Prints 28", "Deletes age"], correct_index: 1, explanation: "= is assignment — it stores the value on the right into the variable on the left." },
      { question_text: "What data type is 19.99?", options: ["int", "float", "str", "bool"], correct_index: 1, explanation: "Numbers with a decimal point are floats." },
      { question_text: "What does type(\"28\") return?", options: ["int", "float", "str", "bool"], correct_index: 2, explanation: "Anything in quotes, even if it looks like a number, is a str." },
      { question_text: "What does 10 // 3 evaluate to?", options: ["3.333...", "3", "1", "30"], correct_index: 1, explanation: "// is floor division — it rounds down to the nearest whole number, giving 3." },
      { question_text: "What does 10 % 3 evaluate to?", options: ["3", "1", "3.33", "30"], correct_index: 1, explanation: "% (modulo) gives the remainder after division: 10 divided by 3 leaves a remainder of 1." },
      { question_text: "What does 2 ** 5 evaluate to?", options: ["10", "7", "32", "25"], correct_index: 2, explanation: "** is the exponent operator: 2 to the power of 5 is 32." },
      { question_text: "Which variable name is invalid in Python?", options: ["student_name", "_score", "2nd_place", "total"], correct_index: 2, explanation: "Variable names can't start with a number." },
      { question_text: "What does print(2 + 3 * 4) print?", options: ["20", "14", "9", "24"], correct_index: 1, explanation: "Multiplication happens before addition, so this is 2 + 12 = 14." },
      { question_text: "Which type has only two possible values, True and False?", options: ["str", "int", "float", "bool"], correct_index: 3, explanation: "bool is the boolean type, with exactly two values: True and False." },
      { question_text: "What is the best variable name for storing a person's age?", options: ["x", "a", "age", "1"], correct_index: 2, explanation: "Descriptive variable names like age make code far easier to read." },
    ]);
    console.log(`✓ Module 2 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 2 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- **Variables** store values under a name using \`=\`
- Python's core data types: **str** (text), **int** (whole numbers), **float** (decimals), **bool** (True/False)
- \`type()\` tells you what type a value actually is
- Arithmetic operators: \`+\` \`-\` \`*\` \`/\` \`//\` \`%\` \`**\`
- You built a working calculator and a pizza bill splitter using nothing but variables and arithmetic

## Coming Up Next Week

So far your programs always use the same hard-coded values every time you run them. Next week you'll learn \`input()\` — how to make programs that actually ask the user questions and respond to whatever they type. Your programs are about to become interactive. 🎮
`);
    console.log(`✓ Module 2 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 2 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
