/**
 * Populates Module 6 — Lists & Collections (Week 6).
 * Run with: npx ts-node prisma/enrich-pzth-module6.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz } from "./python-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "python-zero-to-hero";
const MOD = "Module 6";

async function main() {
  console.log("🌱  Populating Module 6…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 6 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📋 Mission: Manage a Collection

Every variable you've used so far holds exactly one value. This week, that changes — you'll learn to hold many values in a single variable, and process all of them at once.

## This Week You'll Learn To

- Create and index **lists**
- Add, remove, and sort items
- Loop through a list to process every item
- Understand **tuples** and how they differ from lists

## Why This Matters

Real data almost never comes as a single value — a shopping list, a set of grades, a list of contacts. Lists are how Python represents "many of something," and you'll use them in nearly every program from here on.
`);
    console.log(`✓ Week 6 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Introduction to Lists");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Creating a List

\`\`\`python
groceries = ["milk", "eggs", "bread"]
print(groceries)          # ['milk', 'eggs', 'bread']
\`\`\`

A **list** holds multiple values in one ordered variable, written with square brackets and commas between items.

## Real-World Comparison

A list is exactly like a numbered shopping list on paper — each item has a position, and the order matters.

## Indexing: Getting One Item

\`\`\`python
groceries = ["milk", "eggs", "bread"]
print(groceries[0])   # milk  — Python counts from 0, not 1!
print(groceries[1])   # eggs
print(groceries[2])   # bread
print(groceries[-1])  # bread — negative index counts from the end
\`\`\`

**Python indexes start at 0.** \`groceries[0]\` is the *first* item — this trips up almost every beginner at least once, so it's worth saying twice.

## The Length of a List

\`\`\`python
print(len(groceries))   # 3
\`\`\`

## Try It

Create a list of your three favorite movies, print the whole list, then print just the second one using indexing.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Create a list of 3 favorite movies, print the whole list and then just the second item.", code: `movies = ["Inception", "The Matrix", "Interstellar"]\n\nprint(movies)\nprint(movies[1])\nprint(f"Total movies: {len(movies)}")\n` },
    ]);
    console.log(`✓ Introduction to Lists (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Modifying Lists: Add, Remove, Sort");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Adding Items

\`\`\`python
groceries = ["milk", "eggs"]
groceries.append("bread")        # adds to the end
print(groceries)                  # ['milk', 'eggs', 'bread']

groceries.insert(0, "coffee")     # inserts at a specific position
print(groceries)                  # ['coffee', 'milk', 'eggs', 'bread']
\`\`\`

## Removing Items

\`\`\`python
groceries.remove("eggs")     # removes by value
print(groceries)              # ['coffee', 'milk', 'bread']

last_item = groceries.pop()   # removes and returns the last item
print(last_item)              # bread
\`\`\`

## Updating an Item by Index

\`\`\`python
groceries[0] = "tea"
print(groceries)   # ['tea', 'milk']
\`\`\`

## Sorting

\`\`\`python
numbers = [4, 1, 3, 2]
numbers.sort()
print(numbers)                    # [1, 2, 3, 4]

numbers.sort(reverse=True)
print(numbers)                    # [4, 3, 2, 1]
\`\`\`

## Try It

Start with a list of four numbers in random order. Add a fifth number, remove one of the original numbers, then sort the result.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Add a number, remove one, then sort the list.", code: `numbers = [8, 3, 12, 5]\n\nnumbers.append(1)\nnumbers.remove(3)\nnumbers.sort()\n\nprint(numbers)\n` },
    ]);
    console.log(`✓ Modifying Lists (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Looping Through Lists, Plus Tuples");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Looping Through a List

\`\`\`python
groceries = ["milk", "eggs", "bread"]
for item in groceries:
    print(f"- {item}")
\`\`\`

This is the single most common pattern you'll use with lists: a \`for\` loop that hands you one item at a time, in order, until it's processed the whole list.

## Looping With the Index Too

\`\`\`python
for i, item in enumerate(groceries):
    print(f"{i + 1}. {item}")
# 1. milk
# 2. eggs
# 3. bread
\`\`\`

\`enumerate()\` gives you both the position and the value together — useful whenever you need to display a numbered list.

## Tuples: Lists That Can't Change

\`\`\`python
coordinates = (10, 20)
print(coordinates[0])   # 10
\`\`\`

A **tuple** looks and works almost exactly like a list — indexing, looping — with one key difference: once created, you can't add, remove, or change its items. Use a tuple when a value genuinely shouldn't change (like a fixed pair of coordinates); use a list when it needs to grow or shrink.

## Try It

Loop through your movies list from earlier using \`enumerate()\` and print each one as a numbered list starting from 1.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Use enumerate() to print a numbered list of movies starting from 1.", code: `movies = ["Inception", "The Matrix", "Interstellar"]\n\nfor i, movie in enumerate(movies):\n    print(f"{i + 1}. {movie}")\n` },
    ]);
    console.log(`✓ Looping Through Lists, Plus Tuples (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Build a To-Do List");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Build a To-Do List

A real to-do app would use \`input()\` in a loop to let you type new tasks and choose actions from a menu. Since this sandbox can't take live input, this lab walks through the same operations — adding, viewing, and removing tasks — as a fixed sequence of steps you can edit and re-run.

## Your Task

Run the starter code and read through what each step does:

1. Start with an empty list
2. **Add tasks** with \`.append()\`
3. **View tasks** with a numbered loop
4. **Remove** a completed task with \`.remove()\`
5. View the list again to confirm

## Experiment

Add two more tasks of your own, then remove a different one, and re-run to see the final list.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Add your own tasks, remove one, and view the final list.",
        code: `tasks = []\n\n# Add tasks\ntasks.append("Buy groceries")\ntasks.append("Finish Python lesson")\ntasks.append("Call the dentist")\n\nprint("Your to-do list:")\nfor i, task in enumerate(tasks):\n    print(f"{i + 1}. {task}")\n\n# Remove a completed task\ntasks.remove("Call the dentist")\n\nprint("\\nUpdated to-do list:")\nfor i, task in enumerate(tasks):\n    print(f"{i + 1}. {task}")\n`,
      },
    ]);
    console.log(`✓ Lab: Build a To-Do List (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Upgrade Your To-Do List");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📋 Challenge: Upgrade Your To-Do List

Take the to-do list from the lab and make it more useful.

## Requirements

- Use **two separate lists**: \`tasks\` (things left to do) and \`completed\` (things finished)
- When a task is "completed," remove it from \`tasks\` and add it to \`completed\` (hint: \`.remove()\` then \`.append()\`)
- Print both lists, numbered, with clear headers like \`"Still To Do:"\` and \`"Completed:"\`

## Stretch Goal

Print a summary line at the end: \`f"You've completed {len(completed)} out of {len(tasks) + len(completed)} tasks."\`
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Build the two-list to-do system: tasks and completed, with a numbered display and a summary.",
        code: `tasks = ["Buy groceries", "Finish Python lesson", "Call the dentist", "Clean the kitchen"]\ncompleted = []\n\n# Complete a task: move it from tasks to completed\ntasks.remove("Finish Python lesson")\ncompleted.append("Finish Python lesson")\n\nprint("Still To Do:")\nfor i, task in enumerate(tasks):\n    print(f"{i + 1}. {task}")\n\nprint("\\nCompleted:")\nfor i, task in enumerate(completed):\n    print(f"{i + 1}. {task}")\n\ntotal = len(tasks) + len(completed)\nprint(f"\\nYou've completed {len(completed)} out of {total} tasks.")\n`,
      },
    ]);
    console.log(`✓ Challenge: Upgrade Your To-Do List (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 6 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does groceries[0] return in groceries = [\"milk\", \"eggs\", \"bread\"]?", options: ["eggs", "milk", "bread", "An error"], correct_index: 1, explanation: "Python indexing starts at 0, so index 0 is the first item, \"milk\"." },
      { question_text: "What does .append() do?", options: ["Removes the last item", "Adds an item to the end of the list", "Sorts the list", "Deletes the whole list"], correct_index: 1, explanation: "append() adds a new item to the end of a list." },
      { question_text: "What does list.remove(\"eggs\") do?", options: ["Removes the item at index \"eggs\"", "Removes the first item matching the value \"eggs\"", "Adds \"eggs\" to the list", "Sorts by \"eggs\""], correct_index: 1, explanation: "remove() finds and removes the first matching value, not an index." },
      { question_text: "What is the key difference between a list and a tuple?", options: ["Tuples can hold more items", "Lists can be changed after creation; tuples cannot", "Tuples can only hold numbers", "There is no difference"], correct_index: 1, explanation: "Tuples are immutable — once created, their contents can't change. Lists can be modified freely." },
      { question_text: "What does enumerate() provide in a loop?", options: ["Only the value", "Only the index", "Both the index and the value together", "Nothing useful"], correct_index: 2, explanation: "enumerate() gives you both the position (index) and the item (value) on each pass." },
      { question_text: "What does len([1, 2, 3, 4]) return?", options: ["3", "4", "1", "10"], correct_index: 1, explanation: "len() returns the number of items in the list — here, 4." },
      { question_text: "What does numbers.sort(reverse=True) do?", options: ["Sorts ascending", "Sorts descending", "Reverses without sorting", "Removes duplicates"], correct_index: 1, explanation: "sort(reverse=True) sorts the list from highest to lowest." },
      { question_text: "What does groceries[-1] return?", options: ["The first item", "The last item", "An error", "An empty list"], correct_index: 1, explanation: "A negative index counts from the end — -1 is always the last item." },
      { question_text: "Which method removes and returns the last item of a list?", options: ["remove()", "delete()", "pop()", "append()"], correct_index: 2, explanation: "pop() removes the last item (by default) and gives it back to you." },
      { question_text: "Why does this course simulate a to-do list instead of using a live input()-driven menu?", options: ["Menus are impossible in Python", "The lab sandbox has no way to receive typed choices while running", "Lists don't support menus", "It's simpler to grade"], correct_index: 1, explanation: "The sandbox can't receive live keyboard input, so a fixed sequence of add/remove operations demonstrates the same list operations a real menu-driven app would use." },
    ]);
    console.log(`✓ Module 6 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 6 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- **Lists** hold multiple values in one ordered variable, indexed starting at **0**
- \`.append()\`, \`.insert()\`, \`.remove()\`, \`.pop()\`, and \`.sort()\` modify lists
- Looping through a list with \`for item in list:\` — or \`enumerate()\` for the index too
- **Tuples** work like lists but can't be changed after creation
- You built a two-list to-do tracker with completed and pending tasks

## Coming Up Next Week

Lists are great for ordered collections, but what if you need to look something up by name instead of position — a student's grade, a product's price? Next week you'll learn **dictionaries**, Python's key-value collection. 🗂️
`);
    console.log(`✓ Module 6 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 6 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
