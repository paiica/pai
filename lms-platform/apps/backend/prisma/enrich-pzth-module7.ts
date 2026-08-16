/**
 * Populates Module 7 — Dictionaries, Sets & Data (Week 7).
 * Run with: npx ts-node prisma/enrich-pzth-module7.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 7";

async function main() {
  console.log("🌱  Populating Module 7…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 7 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🗂️ Mission: Organize Data

Lists are great when position matters — first, second, third. But real-world data is often looked up by *name*, not position: a student's grade, a product's price. This week introduces the tool built exactly for that.

## This Week You'll Learn To

- Create and use **dictionaries** (key-value pairs)
- Add, update, and remove entries
- Loop through a dictionary's keys, values, or both
- Understand **sets**, and when to use a list vs. a dictionary vs. a set

## Why This Matters

You'll use dictionaries constantly for the rest of your programming life — representing a single "record" (a student, a product, a user) with named fields is one of the most common patterns in all of software.
`);
    console.log(`✓ Week 7 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Introduction to Dictionaries");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Creating a Dictionary

\`\`\`python
student = {
    "name": "Maria",
    "age": 20,
    "major": "Computer Science"
}
\`\`\`

A **dictionary** stores data as **key-value pairs** — each piece of information has a name (the **key**) and a value, written in curly braces.

## Real-World Comparison

Think of a real dictionary (the book kind): you look up a *word* (the key) to find its *definition* (the value) — not by page number, but by name. Python dictionaries work the same way.

## Accessing a Value

\`\`\`python
print(student["name"])    # Maria
print(student["age"])     # 20
\`\`\`

Instead of a numeric index like lists use, you look things up by their key name.

## Lists vs. Dictionaries

\`\`\`python
grades_list = [85, 92, 78]                              # position matters
grades_dict = {"Maria": 85, "James": 92, "Priya": 78}   # name matters
\`\`\`

Use a list when order/position is what matters. Use a dictionary when you need to look things up by a meaningful name.

## Try It

Create a dictionary representing a product with keys \`"name"\`, \`"price"\`, and \`"in_stock"\`, then print each value.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Create a product dictionary and print each of its three values.", code: `product = {\n    "name": "Wireless Mouse",\n    "price": 24.99,\n    "in_stock": True\n}\n\nprint(product["name"])\nprint(product["price"])\nprint(product["in_stock"])\n` },
    ]);
    console.log(`✓ Introduction to Dictionaries (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Working With Dictionaries");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Adding and Updating Values

\`\`\`python
student = {"name": "Maria", "age": 20}

student["major"] = "Computer Science"   # adds a new key
student["age"] = 21                       # updates an existing key
print(student)
\`\`\`

The same \`dict[key] = value\` syntax both adds new entries and updates existing ones — Python figures out which based on whether the key already exists.

## Removing a Key

\`\`\`python
del student["age"]
print(student)   # age is gone
\`\`\`

## Looping Through a Dictionary

\`\`\`python
prices = {"apple": 0.50, "banana": 0.30, "cherry": 3.00}

for fruit in prices:                  # loops through keys
    print(fruit)

for fruit, price in prices.items():   # loops through key AND value together
    print(f"{fruit}: \${price}")
\`\`\`

\`.items()\` is the pattern you'll use most — it hands you both the key and value on every pass.

## Nested Dictionaries

\`\`\`python
students = {
    "Maria": {"age": 20, "major": "CS"},
    "James": {"age": 22, "major": "Math"},
}
print(students["Maria"]["major"])   # CS
\`\`\`

A dictionary's values can themselves be dictionaries — extremely useful for representing a collection of "records," each with several fields.

## Try It

Loop through the \`prices\` dictionary above with \`.items()\` and print each fruit and price on its own line.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Loop through a prices dictionary using .items() and print each fruit and price.", code: `prices = {"apple": 0.50, "banana": 0.30, "cherry": 3.00}\n\nfor fruit, price in prices.items():\n    print(f"{fruit}: \${price}")\n` },
    ]);
    console.log(`✓ Working With Dictionaries (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Sets and Choosing the Right Collection");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is a Set?

\`\`\`python
colors = {"red", "green", "blue"}
colors.add("red")     # already there — no effect
print(colors)          # still just {'red', 'green', 'blue'}
\`\`\`

A **set** holds a collection of values with two special rules: **no duplicates allowed**, and **order isn't guaranteed**. Sets are perfect for "does this exist?" checks and for removing duplicates automatically.

## Removing Duplicates With a Set

\`\`\`python
numbers = [1, 2, 2, 3, 3, 3, 4]
unique_numbers = set(numbers)
print(unique_numbers)   # {1, 2, 3, 4}
\`\`\`

## Fast Membership Checks

\`\`\`python
allowed_users = {"alice", "bob", "carol"}
print("alice" in allowed_users)   # True
print("dave" in allowed_users)    # False
\`\`\`

\`in\` also works on lists and dictionaries, but is especially fast on sets — worth knowing as your data grows larger.

## Choosing the Right Collection

| Collection | Use it when... |
|---|---|
| **List** | Order matters, duplicates are fine |
| **Dictionary** | You need to look things up by name |
| **Set** | You need uniqueness, or fast "does this exist?" checks |

## Try It

Take a list with some repeated numbers and convert it to a set to see the duplicates disappear.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Convert a list with duplicates into a set and print both.", code: `numbers = [1, 2, 2, 3, 3, 3, 4, 5, 5]\nunique_numbers = set(numbers)\n\nprint("Original list:", numbers)\nprint("Unique set:", unique_numbers)\n` },
    ]);
    console.log(`✓ Sets and Choosing the Right Collection (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Student Gradebook");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Student Gradebook

Build a basic gradebook using a dictionary of names to grades.

## Your Task

Run and study the starter code. It:

1. Stores student names and grades in a dictionary
2. Loops through with \`.items()\` to display every student's grade
3. Calculates the **class average** using a running total divided by the number of students

## Experiment

Add two more students to the dictionary, then re-run — the average should update automatically since it's calculated from the dictionary, not hard-coded.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Add more students and confirm the average recalculates automatically.",
        code: `grades = {\n    "Maria": 92,\n    "James": 78,\n    "Priya": 85,\n    "Tom": 67,\n}\n\nprint("Gradebook:")\ntotal = 0\nfor name, grade in grades.items():\n    print(f"{name}: {grade}")\n    total = total + grade\n\naverage = total / len(grades)\nprint(f"\\nClass average: {round(average, 1)}")\n`,
      },
    ]);
    console.log(`✓ Lab: Student Gradebook (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Menu-Driven Gradebook");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🗂️ Challenge: Menu-Driven Gradebook

Extend the gradebook to be genuinely more useful.

## Requirements

- Find and print the student with the **highest** grade
- Find and print the student with the **lowest** grade
- Print how many students scored **above the class average**

## Hints

You can loop through \`.items()\` and keep track of the highest/lowest seen so far, similar to the accumulator pattern from Week 5 — start with the first student's grade as your initial "best guess," then update it as you find better ones.

## Stretch Goal

Group students into \`"Pass"\` (60+) and \`"Fail"\` (below 60) and print each group.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Find the highest and lowest scoring students, and count how many are above average.",
        code: `grades = {\n    "Maria": 92,\n    "James": 78,\n    "Priya": 85,\n    "Tom": 67,\n}\n\ntotal = sum(grades.values())\naverage = total / len(grades)\n\nhighest_name = None\nhighest_score = -1\nlowest_name = None\nlowest_score = 101\nabove_average_count = 0\n\nfor name, grade in grades.items():\n    if grade > highest_score:\n        highest_score = grade\n        highest_name = name\n    if grade < lowest_score:\n        lowest_score = grade\n        lowest_name = name\n    if grade > average:\n        above_average_count = above_average_count + 1\n\nprint(f"Highest: {highest_name} ({highest_score})")\nprint(f"Lowest: {lowest_name} ({lowest_score})")\nprint(f"Students above average: {above_average_count}")\n`,
      },
    ]);
    console.log(`✓ Challenge: Menu-Driven Gradebook (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 7 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does a dictionary store?", options: ["Only numbers", "Key-value pairs", "Only unique text", "Ordered positions only"], correct_index: 1, explanation: "A dictionary stores data as key-value pairs, looked up by key name." },
      { question_text: "How do you access the value for key \"name\" in a dictionary called student?", options: ["student.name", "student[0]", "student[\"name\"]", "student(name)"], correct_index: 2, explanation: "Dictionary values are accessed with square brackets and the key name in quotes." },
      { question_text: "What does student[\"age\"] = 21 do if \"age\" already exists in the dictionary?", options: ["Raises an error", "Adds a duplicate key", "Updates the existing value", "Deletes the key"], correct_index: 2, explanation: "Assigning to an existing key updates its value." },
      { question_text: "What does .items() give you in a for loop?", options: ["Only keys", "Only values", "Both the key and value together", "Nothing"], correct_index: 2, explanation: ".items() lets you loop through both the key and value at once." },
      { question_text: "What's the key rule of a set?", options: ["Items must be numbers", "No duplicate values are allowed", "Items must be in order", "Sets can't be looped through"], correct_index: 1, explanation: "Sets automatically enforce uniqueness — no duplicates." },
      { question_text: "What does set([1, 2, 2, 3]) produce?", options: ["[1, 2, 2, 3]", "{1, 2, 3}", "{1, 2, 2, 3}", "An error"], correct_index: 1, explanation: "Converting a list to a set removes duplicates automatically." },
      { question_text: "When should you choose a dictionary over a list?", options: ["When order matters most", "When you need to look values up by a meaningful name instead of position", "When you need duplicates", "Dictionaries should always be used"], correct_index: 1, explanation: "Dictionaries are ideal when you look values up by name (key) rather than position." },
      { question_text: "What does del student[\"age\"] do?", options: ["Sets age to None", "Removes the age key entirely", "Prints the age", "Nothing — del isn't valid on dictionaries"], correct_index: 1, explanation: "del removes a key (and its value) from a dictionary entirely." },
      { question_text: "What can a dictionary's value be?", options: ["Only strings", "Only numbers", "Any type, including another dictionary or a list", "Only booleans"], correct_index: 2, explanation: "Dictionary values can be any type, including nested dictionaries or lists." },
      { question_text: "Which collection is fastest for checking whether a value exists?", options: ["List", "Set", "Tuple", "They're all identical"], correct_index: 1, explanation: "Sets are optimized for fast membership checks (\"is X in this collection?\")." },
    ]);
    console.log(`✓ Module 7 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 7 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- **Dictionaries** store key-value pairs, looked up by name instead of position
- \`.items()\` loops through both keys and values together
- **Sets** enforce uniqueness and offer fast membership checks
- Choosing the right collection: list (order), dictionary (lookup by name), set (uniqueness)
- You built a full gradebook with class averages, highest/lowest scores, and above-average counts

## Coming Up Next Week

You've written a lot of repeated logic by now — copying similar blocks of code between programs. Next week you'll learn **functions**: how to package up a piece of logic once, give it a name, and reuse it anywhere in your program (or any future program). 🛠️
`);
    console.log(`✓ Module 7 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 7 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
