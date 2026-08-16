/**
 * Populates Module 10 — Capstone: Build Something Real (Week 10).
 * The 12-stage guided lab builds one worked example throughout (a
 * Personal Expense Tracker) that touches every concept from the
 * course, while explicitly telling students to apply the same stages
 * to whichever of the 5 project options they picked.
 *
 * Run with: npx ts-node prisma/enrich-pzth-module10.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, findSublesson, writeLessonContent, attachLab } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 10";

async function main() {
  console.log("🌱  Populating Module 10 (Capstone)…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Welcome to Your Capstone");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🏆 Mission: Build Something Real

Nine weeks ago, you'd never written a line of Python. This week, you're going to design, build, test, and debug a complete application entirely on your own.

## How This Week Works

Unlike previous weeks, there's no single "correct" program to build — you'll choose one of five project options (or propose your own), then work through 12 guided stages that walk you from a blank idea to a finished, working program.

## Read This First

Every stage in the **Capstone Lab** sublesson demonstrates its idea using one example project (a Personal Expense Tracker) as a worked, runnable reference. **Your job is to apply the same stage to your own chosen project** — the example shows you the pattern, not the answer.

Let's build something real.
`);
    console.log(`✓ Welcome to Your Capstone (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Review: Everything You've Learned");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Nine Weeks, One Toolkit

Before you start building, take a moment to see how much you've actually learned. Every one of these is a real, usable skill:

- **Week 1** — Installing Python, running programs, \`print()\`, comments, reading errors
- **Week 2** — Variables, data types (str, int, float, bool), arithmetic operators
- **Week 3** — \`input()\`, type conversion, f-strings
- **Week 4** — Comparisons, \`if\`/\`elif\`/\`else\`, \`and\`/\`or\`/\`not\`
- **Week 5** — \`for\` and \`while\` loops, \`break\`, \`continue\`, accumulators
- **Week 6** — Lists: indexing, \`.append()\`, \`.remove()\`, \`.sort()\`, looping, tuples
- **Week 7** — Dictionaries (key-value pairs), \`.items()\`, sets
- **Week 8** — Functions: \`def\`, parameters, \`return\`, default parameters, scope
- **Week 9** — Reading/writing files, \`try\`/\`except\`, debugging error messages

Your capstone project will use most, if not all, of these. That's the whole point — this week isn't new material, it's **everything coming together**.
`);
    console.log(`✓ Review: Everything You've Learned (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Problem, Requirements, and Design");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## How Real Software Gets Built

Professional developers don't just start typing code. They follow a process:

**Problem → Requirements → Design → Code → Test → Debug → Improve**

## 1. Problem

What real need does this program solve? ("I want to track how much I'm spending.")

## 2. Requirements

What must the finished program actually do? Be specific and concrete — a list of features, not vague goals. ("Add an expense with an amount and category. Show a running total. Show total by category.")

## 3. Design

Before writing code, sketch out (on paper or in a comment) what data you'll need and what functions you'll write. For an expense tracker: a list of dictionaries (one per expense), and functions like \`add_expense()\`, \`calculate_total()\`, and \`print_summary()\`.

## 4–7. Code, Test, Debug, Improve

Build in small pieces, running and testing constantly — never write the whole program before testing anything. Debug using what you learned in Week 9. Then improve: once it works, make it cleaner, or add one more feature.

## Your Task

Before opening the Capstone Lab, write down (on paper, or in a text file) your own answers to Problem, Requirements, and Design for the project you're about to choose in the next lesson.
`);
    console.log(`✓ Problem, Requirements, and Design (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Choose Your Project");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Pick One

Choose the project that excites you most — or propose your own (Option 5). All five are achievable with exactly what you've learned in this course.

## Option 1 — Personal Expense Tracker

Add expenses with categories, calculate totals, display spending by category, and save data to a file. *(This is the example built throughout the Capstone Lab stages — pick this if you want the most guidance.)*

## Option 2 — Student Grade Manager

Add students and grades, calculate averages, find the highest/lowest grade, and save records to a file. Builds directly on Week 7's gradebook.

## Option 3 — To-Do Manager

Add tasks, remove tasks, mark tasks complete, view tasks, and save/load from a file. Builds directly on Weeks 6 and 9's to-do projects.

## Option 4 — Quiz Game

Store a set of questions and answers (as a list of dictionaries), ask the "player" each one, track their score, and give final feedback. A great use of loops, dictionaries, and conditionals together.

## Option 5 — Build Your Own

Propose your own beginner-appropriate Python project. It should use at least: variables, a collection (list or dictionary), a loop, a conditional, at least one function, and file saving.

## Your Task

Pick one. Whichever you choose, the 12 stages in the Capstone Lab apply the same way — just substitute your project's data and features for the expense tracker example shown there.
`);
    console.log(`✓ Choose Your Project (${blocks} blocks)`);
  }

  // ── Capstone Lab parent lesson ───────────────────────────────────────
  {
    const l = await findLesson(prisma, SLUG, MOD, "Capstone Lab: Build Your Project");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Your 12-Stage Build

Each stage below is its own sublesson with a runnable example — open them in order. Every stage builds on the Personal Expense Tracker example a little further, ending with a complete, working program. Apply each stage to your own chosen project as you go.

1. Plan the Project
2. Create Variables
3. Create Data Structures
4. Add User Input
5. Add Conditions
6. Add Loops
7. Create Functions
8. Add File Storage
9. Test
10. Debug
11. Improve
12. Final Submission

You can run code at every stage — build incrementally, testing as you go, exactly like the Problem → Requirements → Design → Code → Test → Debug → Improve process from the last lesson.
`);
    console.log(`✓ Capstone Lab: Build Your Project (${blocks} blocks)`);
  }

  const PARENT = "Capstone Lab: Build Your Project";

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 1: Plan the Project");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 1: Plan the Project

Before writing any code, write down (as comments at the top of your program) your Problem, Requirements, and Design from the earlier lesson.

## Worked Example: Personal Expense Tracker

\`\`\`python
# PROBLEM: I want to track my spending and see totals by category.
#
# REQUIREMENTS:
# - Add an expense with an amount, category, and description
# - Show all expenses
# - Calculate the total spent
# - Calculate total spent per category
# - Save expenses to a file so they aren't lost
#
# DESIGN:
# - Each expense is a dictionary: {"amount": ..., "category": ..., "description": ...}
# - All expenses live in one list
# - Functions: add_expense(), calculate_total(), spending_by_category(), save_expenses()
\`\`\`

## Your Task

Write this same kind of planning comment block for your own chosen project before moving to Stage 2.
`);
    console.log(`  ↳ Stage 1: Plan the Project (${blocks} blocks)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 2: Create Variables");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 2: Create Variables

Start with the simple, single values your program needs — often settings or starting totals.

## Worked Example

\`\`\`python
running_total = 0.0
expense_count = 0
\`\`\`

## Your Task

In the lab, define the starting variables your own project needs (a running total, a counter, a setting — whatever fits your chosen project).
`);
    await attachLab(prisma, s.id, [
      { instructions: "Define the starting variables for your own project (adapt the example below).", code: `running_total = 0.0\nexpense_count = 0\n\nprint(f"Starting total: \${running_total}")\nprint(f"Starting count: {expense_count}")\n` },
    ]);
    console.log(`  ↳ Stage 2: Create Variables (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 3: Create Data Structures");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 3: Create Data Structures

Now build the list/dictionary structure that will hold your real data (Week 6 and 7's material).

## Worked Example

\`\`\`python
expenses = []   # a list of dictionaries, one per expense

sample_expense = {"amount": 45.50, "category": "Groceries", "description": "Weekly shopping"}
expenses.append(sample_expense)
print(expenses)
\`\`\`

## Your Task

In the lab, create the main data structure for your project (a list, a dictionary, or a list of dictionaries) and add one sample entry to prove it works.
`);
    await attachLab(prisma, s.id, [
      { instructions: "Create your project's main data structure with one sample entry.", code: `expenses = []\n\nsample_expense = {"amount": 45.50, "category": "Groceries", "description": "Weekly shopping"}\nexpenses.append(sample_expense)\n\nprint(expenses)\n` },
    ]);
    console.log(`  ↳ Stage 3: Create Data Structures (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 4: Add User Input");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 4: Add User Input

A real version of your project would use \`input()\` to collect data from the user. Since this sandbox has no live input (as covered in Week 3), this stage simulates a batch of user entries as pre-set data you can edit.

## Worked Example

\`\`\`python
new_expenses = [
    {"amount": 12.00, "category": "Food", "description": "Lunch"},
    {"amount": 60.00, "category": "Transport", "description": "Gas"},
]

expenses = []
for expense in new_expenses:
    expenses.append(expense)

print(f"Added {len(expenses)} expenses.")
\`\`\`

## At Home

Replace \`new_expenses\` with a loop using real \`input()\` calls, asking for the amount, category, and description one at a time.

## Your Task

In the lab, simulate a batch of 3-4 entries for your own project and add them to your data structure.
`);
    await attachLab(prisma, s.id, [
      { instructions: "Simulate a batch of entries for your project (adapt the example below).", code: `new_expenses = [\n    {"amount": 12.00, "category": "Food", "description": "Lunch"},\n    {"amount": 60.00, "category": "Transport", "description": "Gas"},\n    {"amount": 45.50, "category": "Groceries", "description": "Weekly shopping"},\n]\n\nexpenses = []\nfor expense in new_expenses:\n    expenses.append(expense)\n\nprint(f"Added {len(expenses)} expenses.")\n` },
    ]);
    console.log(`  ↳ Stage 4: Add User Input (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 5: Add Conditions");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 5: Add Conditions

Use \`if\`/\`elif\`/\`else\` (Week 4) to make your program react differently depending on the data.

## Worked Example

\`\`\`python
expenses = [
    {"amount": 12.00, "category": "Food"},
    {"amount": 60.00, "category": "Transport"},
    {"amount": 200.00, "category": "Rent"},
]

for expense in expenses:
    if expense["amount"] > 100:
        print(f"Large expense: {expense['category']} — \${expense['amount']}")
    else:
        print(f"Regular expense: {expense['category']} — \${expense['amount']}")
\`\`\`

## Your Task

Add a condition to your own project — flag large amounts, overdue tasks, failing grades, wrong answers, whatever's meaningful for what you're building.
`);
    await attachLab(prisma, s.id, [
      { instructions: "Add a meaningful condition to your project's data (adapt the example below).", code: `expenses = [\n    {"amount": 12.00, "category": "Food"},\n    {"amount": 60.00, "category": "Transport"},\n    {"amount": 200.00, "category": "Rent"},\n]\n\nfor expense in expenses:\n    if expense["amount"] > 100:\n        print(f"Large expense: {expense['category']} — \${expense['amount']}")\n    else:\n        print(f"Regular expense: {expense['category']} — \${expense['amount']}")\n` },
    ]);
    console.log(`  ↳ Stage 5: Add Conditions (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 6: Add Loops");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 6: Add Loops

Use loops (Week 5) to process every item in your data structure — this is usually where the real "processing" of your program happens.

## Worked Example

\`\`\`python
expenses = [
    {"amount": 12.00, "category": "Food"},
    {"amount": 60.00, "category": "Transport"},
    {"amount": 45.50, "category": "Groceries"},
]

total = 0
for expense in expenses:
    total = total + expense["amount"]

print(f"Total spent: \${round(total, 2)}")
\`\`\`

## Your Task

Write a loop that processes every item in your own project's data structure — calculating a total, counting items that match a condition, or building a summary.
`);
    await attachLab(prisma, s.id, [
      { instructions: "Write a loop that processes your project's full data structure.", code: `expenses = [\n    {"amount": 12.00, "category": "Food"},\n    {"amount": 60.00, "category": "Transport"},\n    {"amount": 45.50, "category": "Groceries"},\n]\n\ntotal = 0\nfor expense in expenses:\n    total = total + expense["amount"]\n\nprint(f"Total spent: \${round(total, 2)}")\n` },
    ]);
    console.log(`  ↳ Stage 6: Add Loops (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 7: Create Functions");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 7: Create Functions

Package the logic you've written so far into named, reusable functions (Week 8) — this is where your program starts to feel like real, organized software.

## Worked Example

\`\`\`python
def add_expense(expenses, amount, category, description):
    expenses.append({"amount": amount, "category": category, "description": description})

def calculate_total(expenses):
    return sum(expense["amount"] for expense in expenses)

def spending_by_category(expenses, category):
    return sum(e["amount"] for e in expenses if e["category"] == category)

expenses = []
add_expense(expenses, 12.00, "Food", "Lunch")
add_expense(expenses, 60.00, "Transport", "Gas")
add_expense(expenses, 45.50, "Food", "Dinner")

print(f"Total: \${calculate_total(expenses)}")
print(f"Food spending: \${spending_by_category(expenses, 'Food')}")
\`\`\`

## Your Task

Turn at least two pieces of logic from your project into functions with clear names, parameters, and return values.
`);
    await attachLab(prisma, s.id, [
      { instructions: "Refactor your project's logic into at least two well-named functions.", code: `def add_expense(expenses, amount, category, description):\n    expenses.append({"amount": amount, "category": category, "description": description})\n\ndef calculate_total(expenses):\n    return sum(expense["amount"] for expense in expenses)\n\ndef spending_by_category(expenses, category):\n    return sum(e["amount"] for e in expenses if e["category"] == category)\n\nexpenses = []\nadd_expense(expenses, 12.00, "Food", "Lunch")\nadd_expense(expenses, 60.00, "Transport", "Gas")\nadd_expense(expenses, 45.50, "Food", "Dinner")\n\nprint(f"Total: \${calculate_total(expenses)}")\nprint(f"Food spending: \${spending_by_category(expenses, 'Food')}")\n` },
    ]);
    console.log(`  ↳ Stage 7: Create Functions (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 8: Add File Storage");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 8: Add File Storage

Save your data so it's not lost the moment the program ends (Week 9).

## Worked Example

\`\`\`python
expenses = [
    {"amount": 12.00, "category": "Food", "description": "Lunch"},
    {"amount": 60.00, "category": "Transport", "description": "Gas"},
]

def save_expenses(expenses, filename="expenses.txt"):
    with open(filename, "w") as file:
        for e in expenses:
            file.write(f"{e['amount']},{e['category']},{e['description']}\\n")

def load_expenses(filename="expenses.txt"):
    loaded = []
    try:
        with open(filename, "r") as file:
            for line in file.read().splitlines():
                amount, category, description = line.split(",")
                loaded.append({"amount": float(amount), "category": category, "description": description})
    except FileNotFoundError:
        pass
    return loaded

save_expenses(expenses)
print("Saved!")

reloaded = load_expenses()
print(f"Reloaded {len(reloaded)} expenses:")
print(reloaded)
\`\`\`

## Your Task

Write \`save_x()\` and \`load_x()\` functions for your own project's data, and confirm the round trip works: save, then load, then print to prove it matches.
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "Write save and load functions for your project's data and confirm the round trip works.",
        code: `expenses = [\n    {"amount": 12.00, "category": "Food", "description": "Lunch"},\n    {"amount": 60.00, "category": "Transport", "description": "Gas"},\n]\n\ndef save_expenses(expenses, filename="expenses.txt"):\n    with open(filename, "w") as file:\n        for e in expenses:\n            file.write(f"{e['amount']},{e['category']},{e['description']}\\n")\n\ndef load_expenses(filename="expenses.txt"):\n    loaded = []\n    try:\n        with open(filename, "r") as file:\n            for line in file.read().splitlines():\n                amount, category, description = line.split(",")\n                loaded.append({"amount": float(amount), "category": category, "description": description})\n    except FileNotFoundError:\n        pass\n    return loaded\n\nsave_expenses(expenses)\nprint("Saved!")\n\nreloaded = load_expenses()\nprint(f"Reloaded {len(reloaded)} expenses:")\nprint(reloaded)\n`,
      },
    ]);
    console.log(`  ↳ Stage 8: Add File Storage (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 9: Test");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 9: Test

Now that every piece exists, test the whole program together — not just each piece in isolation.

## What to Test

- **Normal cases**: does it work correctly with typical data?
- **Edge cases**: what happens with an empty list? A single item? A very large number?
- **The full flow**: add data → process it → save it → load it back → confirm it matches

## Worked Example: A Test Pass

\`\`\`python
# Test 1: empty list
empty_total = calculate_total([])
print(f"Empty total (should be 0): {empty_total}")

# Test 2: single item
single = [{"amount": 10, "category": "Test", "description": "x"}]
print(f"Single item total (should be 10): {calculate_total(single)}")
\`\`\`

## Your Task

In the lab, write at least two test cases for your own project's core function(s) — including at least one edge case (empty data, or a boundary value).
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "Write at least two test cases for your project, including one edge case (empty data or a boundary value).",
        code: `def calculate_total(expenses):\n    return sum(expense["amount"] for expense in expenses)\n\n# Test 1: empty list (edge case)\nempty_total = calculate_total([])\nprint(f"Empty total (should be 0): {empty_total}")\n\n# Test 2: single item\nsingle = [{"amount": 10, "category": "Test", "description": "x"}]\nprint(f"Single item total (should be 10): {calculate_total(single)}")\n\n# Test 3: multiple items\nmultiple = [{"amount": 10}, {"amount": 20}, {"amount": 30}]\nprint(f"Multiple items total (should be 60): {sum(e['amount'] for e in multiple)}")\n`,
      },
    ]);
    console.log(`  ↳ Stage 9: Test (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 10: Debug");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 10: Debug

Something in your program probably doesn't work exactly right yet — that's completely normal, even for experienced developers. This stage is about finding and fixing it methodically, using Week 9's process.

## The Process

**What happened → Why → How to fix it.**

1. Read the full error message, bottom to top
2. Find the exact line it points to
3. Ask what assumption about your data or logic turned out to be wrong
4. Fix just that one thing, then re-run — don't rewrite everything at once

## Worked Example: A Realistic Bug

\`\`\`python
expenses = [{"amount": 12.00, "category": "Food"}]
print(expenses[0]["amont"])   # bug: typo, "amont" instead of "amount"
\`\`\`

Running this gives a \`KeyError: 'amont'\` — the message literally names the missing key, pointing straight at the typo.

## Your Task

Deliberately introduce one bug into your own project's code (a typo, a wrong operator, a missing colon), run it, read the exact error, then fix it.
`);
    await attachLab(prisma, s.id, [
      { instructions: "This code has a bug (a typo'd dictionary key). Run it, read the error, and fix it.", code: `expenses = [{"amount": 12.00, "category": "Food"}]\nprint(expenses[0]["amont"])\n` },
    ]);
    console.log(`  ↳ Stage 10: Debug (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 11: Improve");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 11: Improve

Your program works — now make it better. This is optional polish, not required to finish, but it's where good programs become great ones.

## Ideas for Improving Any Project

- Add a **summary function** that prints a clean report of everything
- Round money/decimal values consistently with \`round(value, 2)\`
- Add a few more **conditions** to handle unusual data gracefully
- Improve variable and function **names** for clarity
- Remove any duplicated code by extracting it into a function (refactoring, from Week 8)

## Worked Example: A Polished Summary Function

\`\`\`python
def print_summary(expenses):
    print("=" * 30)
    print("EXPENSE SUMMARY")
    print("=" * 30)
    for e in expenses:
        print(f"{e['category']:15} \${e['amount']:.2f}")
    print("-" * 30)
    total = sum(e["amount"] for e in expenses)
    print(f"{'TOTAL':15} \${total:.2f}")

expenses = [
    {"amount": 12.00, "category": "Food"},
    {"amount": 60.00, "category": "Transport"},
]
print_summary(expenses)
\`\`\`

## Your Task

Pick at least one improvement from the list above and apply it to your own project.
`);
    await attachLab(prisma, s.id, [
      { instructions: "Adapt this polished summary pattern to your own project's data.", code: `def print_summary(expenses):\n    print("=" * 30)\n    print("EXPENSE SUMMARY")\n    print("=" * 30)\n    for e in expenses:\n        print(f"{e['category']:15} \${e['amount']:.2f}")\n    print("-" * 30)\n    total = sum(e["amount"] for e in expenses)\n    print(f"{'TOTAL':15} \${total:.2f}")\n\nexpenses = [\n    {"amount": 12.00, "category": "Food"},\n    {"amount": 60.00, "category": "Transport"},\n]\nprint_summary(expenses)\n` },
    ]);
    console.log(`  ↳ Stage 11: Improve (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, PARENT, "Stage 12: Final Submission");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 12: Final Submission

You're at the finish line. Bring everything from Stages 1–11 together into one complete program.

## Final Checklist

Your finished capstone should include:

- [ ] Variables holding meaningful starting values
- [ ] At least one list or dictionary (or both) holding your real data
- [ ] At least one \`if\`/\`elif\`/\`else\` condition
- [ ] At least one loop processing your data
- [ ] At least two functions with parameters and a \`return\` value
- [ ] File saving and loading, wrapped in \`try\`/\`except\`
- [ ] Tested with at least one edge case
- [ ] At least one deliberate improvement applied

## Worked Example: The Complete Expense Tracker

\`\`\`python
def add_expense(expenses, amount, category, description):
    expenses.append({"amount": amount, "category": category, "description": description})

def calculate_total(expenses):
    return sum(e["amount"] for e in expenses)

def spending_by_category(expenses, category):
    return sum(e["amount"] for e in expenses if e["category"] == category)

def save_expenses(expenses, filename="expenses.txt"):
    with open(filename, "w") as file:
        for e in expenses:
            file.write(f"{e['amount']},{e['category']},{e['description']}\\n")

def load_expenses(filename="expenses.txt"):
    loaded = []
    try:
        with open(filename, "r") as file:
            for line in file.read().splitlines():
                amount, category, description = line.split(",")
                loaded.append({"amount": float(amount), "category": category, "description": description})
    except FileNotFoundError:
        pass
    return loaded

def print_summary(expenses):
    print("=" * 30)
    print("EXPENSE SUMMARY")
    print("=" * 30)
    for e in expenses:
        flag = " (large!)" if e["amount"] > 100 else ""
        print(f"{e['category']:15} \${e['amount']:.2f}{flag}")
    print("-" * 30)
    print(f"{'TOTAL':15} \${calculate_total(expenses):.2f}")


expenses = []
add_expense(expenses, 12.00, "Food", "Lunch")
add_expense(expenses, 60.00, "Transport", "Gas")
add_expense(expenses, 200.00, "Rent", "Monthly rent")

save_expenses(expenses)
reloaded = load_expenses()
print_summary(reloaded)
print(f"Food spending: \${spending_by_category(reloaded, 'Food')}")
\`\`\`

## 🏆 Submit

Run your finished program in the lab below one final time to confirm it works end to end. Congratulations — you built a real Python application, from scratch, in 10 weeks.
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "This is the complete, worked example. Run it, then replace it with your own finished capstone project and run that too.",
        code: `def add_expense(expenses, amount, category, description):\n    expenses.append({"amount": amount, "category": category, "description": description})\n\ndef calculate_total(expenses):\n    return sum(e["amount"] for e in expenses)\n\ndef spending_by_category(expenses, category):\n    return sum(e["amount"] for e in expenses if e["category"] == category)\n\ndef save_expenses(expenses, filename="expenses.txt"):\n    with open(filename, "w") as file:\n        for e in expenses:\n            file.write(f"{e['amount']},{e['category']},{e['description']}\\n")\n\ndef load_expenses(filename="expenses.txt"):\n    loaded = []\n    try:\n        with open(filename, "r") as file:\n            for line in file.read().splitlines():\n                amount, category, description = line.split(",")\n                loaded.append({"amount": float(amount), "category": category, "description": description})\n    except FileNotFoundError:\n        pass\n    return loaded\n\ndef print_summary(expenses):\n    print("=" * 30)\n    print("EXPENSE SUMMARY")\n    print("=" * 30)\n    for e in expenses:\n        flag = " (large!)" if e["amount"] > 100 else ""\n        print(f"{e['category']:15} \${e['amount']:.2f}{flag}")\n    print("-" * 30)\n    print(f"{'TOTAL':15} \${calculate_total(expenses):.2f}")\n\n\nexpenses = []\nadd_expense(expenses, 12.00, "Food", "Lunch")\nadd_expense(expenses, 60.00, "Transport", "Gas")\nadd_expense(expenses, 200.00, "Rent", "Monthly rent")\n\nsave_expenses(expenses)\nreloaded = load_expenses()\nprint_summary(reloaded)\nprint(f"Food spending: \${spending_by_category(reloaded, 'Food')}")\n`,
      },
    ]);
    console.log(`  ↳ Stage 12: Final Submission (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Course Conclusion: Python Beginner to Python Hero");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🏆 Python Beginner → Python Hero

Ten weeks ago, this was true:

> "I have never written code before."

Now, this is true:

> "I can build a useful Python application on my own."

## What You Actually Built

Across this course, you wrote a calculator, an interactive quiz, a Choose Your Adventure story, a decision engine, a number guessing game, a to-do list with file storage, a full gradebook, a utility function toolkit, and — this week — a complete capstone application you designed yourself.

## Where to Go From Here

The foundation you now have — variables, conditionals, loops, collections, functions, files, and debugging — is the exact same foundation used in data analytics, AI and machine learning, web development, and automation. Whichever direction you go next, none of what you learned here gets thrown away; it all transfers directly.

## Keep Going

The single best way to keep improving is to keep building. Pick a small idea, however simple, and build it. You already know enough to start — you proved that this week.

**Congratulations. You're a Python Hero.** 🏆
`);
    console.log(`✓ Course Conclusion (${blocks} blocks)`);
  }

  console.log("\n✅  Module 10 (Capstone) complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
