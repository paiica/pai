/**
 * Populates Module 8 — INSERT, UPDATE, DELETE & Data Management (Week 8).
 *
 * Safety note: every lab already runs against a fresh, private
 * in-memory SQLite database created at the top of the cell (see
 * dataMartSetup()) — nothing a student does here can affect any other
 * lab, student, or the "real" course dataset, and re-running the cell
 * always resets everything back to the original sample data. This
 * genuinely satisfies the spec's "safety lab" requirement using the
 * platform's actual architecture, not a separate bolt-on sandbox —
 * explained directly to students in this module's first lesson.
 *
 * Run with: npx ts-node prisma/enrich-szth-module8.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 8";
const SETUP = dataMartSetup(["customers", "products"]);

async function main() {
  console.log("🌱  Populating Module 8…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 8 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🛠️ Mission: Manage the Database

So far, every query you've written has only *read* data. This week, you'll learn to change it — and why that demands real caution.

## A Note on Safety Before We Start

Every lab in this course runs against a **fresh, private copy** of the DataMart data, created new each time you run a cell. Nothing you \`INSERT\`, \`UPDATE\`, or \`DELETE\` in a lab can affect any other lab, any other student, or the "real" course dataset — and simply re-running the cell resets everything back to the original sample data automatically. Experiment freely; you cannot break anything here.

## This Week You'll Learn To

- Add new records with \`INSERT\`
- Change existing records with \`UPDATE\`
- Remove records with \`DELETE\`
- Understand why \`WHERE\` is the single most important word in this whole module

## Why This Matters

Reading data is half of SQL. Real systems also need to record a new customer, correct a mistaken price, or remove a cancelled order — and doing that safely, without affecting rows you didn't mean to touch, is a genuinely critical professional skill.
`);
    console.log(`✓ Week 8 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Adding Data with INSERT");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Adding a New Row

**Business scenario:** "A new customer just signed up — add them to the database."

\`\`\`sql
INSERT INTO customers (customer_id, first_name, last_name, email, city, province, signup_date)
VALUES (11, 'Zara', 'Ahmed', 'zara.ahmed@email.com', 'Toronto', 'ON', '2023-07-01');
\`\`\`

## Query Walkthrough

- \`INSERT INTO customers (...)\` — name the table, and list exactly which columns you're providing values for
- \`VALUES (...)\` — the actual values, in the **same order** as the column list

## Verifying It Worked

\`\`\`sql
SELECT * FROM customers WHERE customer_id = 11;
\`\`\`

After any data-changing statement, it's good practice to immediately query and confirm the change looks correct — \`INSERT\`/\`UPDATE\`/\`DELETE\` don't return a preview of the result the way \`SELECT\` does.

## Adding a New Product

\`\`\`sql
INSERT INTO products (product_id, product_name, category, price, stock_quantity)
VALUES (13, 'Yoga Mat', 'Home', 29.99, 100);
\`\`\`

## Try It

Insert a new product of your own choosing, then query the \`products\` table to confirm it was added.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Insert a new customer, verify it, then insert a product of your own and verify that too.", code: `${SETUP}
run_sql("""
INSERT INTO customers (customer_id, first_name, last_name, email, city, province, signup_date)
VALUES (11, 'Zara', 'Ahmed', 'zara.ahmed@email.com', 'Toronto', 'ON', '2023-07-01');
""")

run_sql("""
SELECT * FROM customers WHERE customer_id = 11;
""")

# Now insert a product of your own:

` },
    ]);
    console.log(`✓ Adding Data with INSERT (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Modifying Data with UPDATE");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Changing an Existing Row

**Business scenario:** "The Wireless Mouse's price is changing to $22.99."

\`\`\`sql
UPDATE products
SET price = 22.99
WHERE product_id = 1;
\`\`\`

## Query Walkthrough

- \`UPDATE products\` — the table to change
- \`SET price = 22.99\` — the new value for the \`price\` column
- \`WHERE product_id = 1\` — **critically**, which row(s) to change

## Why \`WHERE\` Is Not Optional Here

\`\`\`sql
UPDATE products
SET price = 22.99;
-- NO WHERE CLAUSE — this changes EVERY product's price to $22.99!
\`\`\`

Without \`WHERE\`, \`UPDATE\` applies to **every single row** in the table. This is one of the most dangerous mistakes possible in SQL — always double-check your \`WHERE\` clause before running an \`UPDATE\`, and consider running the equivalent \`SELECT\` with the same \`WHERE\` first, to confirm exactly which rows you're about to affect.

## Updating Multiple Columns at Once

\`\`\`sql
UPDATE customers
SET city = 'Mississauga', province = 'ON'
WHERE customer_id = 1;
\`\`\`

## A Safe Habit: Check First With SELECT

\`\`\`sql
-- Step 1: confirm exactly which row(s) this WHERE matches
SELECT * FROM products WHERE product_id = 1;

-- Step 2: only then, run the UPDATE with the same WHERE
UPDATE products SET price = 22.99 WHERE product_id = 1;
\`\`\`

## Try It

Update product_id 5's stock_quantity to 25, then verify the change with a \`SELECT\`.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Update a product's price, checking first with SELECT, then confirming after with SELECT.", code: `${SETUP}
# Step 1: check which row this WHERE matches, before changing anything
run_sql("""
SELECT * FROM products WHERE product_id = 1;
""")

# Step 2: now make the change
run_sql("""
UPDATE products SET price = 22.99 WHERE product_id = 1;
""")

# Step 3: verify it worked
run_sql("""
SELECT * FROM products WHERE product_id = 1;
""")
` },
    ]);
    console.log(`✓ Modifying Data with UPDATE (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Removing Data with DELETE (Carefully)");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Removing a Row

**Business scenario:** "A test customer record needs to be removed."

\`\`\`sql
DELETE FROM customers
WHERE customer_id = 11;
\`\`\`

## Why \`WHERE\` Matters Even More Here

\`\`\`sql
DELETE FROM customers;
-- NO WHERE CLAUSE — this deletes EVERY customer, permanently!
\`\`\`

\`UPDATE\` without \`WHERE\` corrupts every row's value. \`DELETE\` without \`WHERE\` **destroys every row entirely** — and in a real production database, there's often no undo. This is the single most dangerous mistake in all of SQL, and it happens to real companies more often than you'd think.

## The Same Safe Habit Applies

\`\`\`sql
-- Always check first:
SELECT * FROM customers WHERE customer_id = 11;

-- Only delete once you're sure:
DELETE FROM customers WHERE customer_id = 11;
\`\`\`

## Transactions, Briefly

Real production databases support **transactions** — a way to group several changes together and \`COMMIT\` (make permanent) or \`ROLLBACK\` (undo) them as one unit, giving you a safety net if something goes wrong partway through. This course's labs don't need you to manage transactions manually (each lab's fresh, private database is itself a kind of safety net), but it's worth knowing the concept exists for real-world work.

## Try It

Insert a temporary test customer, confirm it exists, delete it, then confirm it's gone.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Insert a test customer, confirm it, delete it (carefully, with WHERE), then confirm it's gone.", code: `${SETUP}
run_sql("""
INSERT INTO customers (customer_id, first_name, last_name, email, city, province, signup_date)
VALUES (99, 'Test', 'User', 'test@email.com', 'Nowhere', 'XX', '2023-01-01');
""")

run_sql("""
SELECT * FROM customers WHERE customer_id = 99;
""")

run_sql("""
DELETE FROM customers WHERE customer_id = 99;
""")

run_sql("""
SELECT * FROM customers WHERE customer_id = 99;
""")
` },
    ]);
    console.log(`✓ Removing Data with DELETE (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Database Manager");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🛠️ Database Manager

Practice the full add/change/remove/verify cycle.

## Your Tasks

1. **Add** a new product of your own (any name, category, price, stock)
2. **Modify** that same product's price
3. **Delete** a different, existing product (pick one by ID)
4. **Verify** the result: query the full \`products\` table one final time and confirm your changes are reflected correctly
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Work through add, modify, delete, and verify — in that order.",
        code: `${SETUP}
# Task 1: Add a new product


# Task 2: Modify that product's price


# Task 3: Delete a different, existing product (use its product_id)


# Task 4: Verify — query the full products table
run_sql("""
SELECT * FROM products;
""")
`,
      },
    ]);
    console.log(`✓ Lab: Database Manager (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Clean Up the Data");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🛠️ Challenge: Clean Up the Data

The starter code inserts several intentionally messy records — your job is to find and fix them.

## Requirements

1. One inserted customer has a clearly invalid email (missing an \`@\`). Find it with \`LIKE\`, then \`UPDATE\` it to a corrected value.
2. One inserted product has a negative price (a data entry error). Find it with \`WHERE price < 0\`, then \`UPDATE\` it to a sensible positive value.
3. One inserted product is an obvious duplicate test row. Find and \`DELETE\` it.

## Reflect

This is genuinely what "data cleaning" looks like in practice — using the same \`SELECT\`/\`WHERE\` skills you've built all course to *find* problems, then \`UPDATE\`/\`DELETE\` to fix them.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Find and fix the 3 messy records described above.",
        code: `${SETUP}
# Intentionally messy data for this challenge:
cur.execute("INSERT INTO customers (customer_id, first_name, last_name, email, city, province, signup_date) VALUES (20, 'Bad', 'Email', 'notanemail.com', 'Toronto', 'ON', '2023-08-01')")
cur.execute("INSERT INTO products (product_id, product_name, category, price, stock_quantity) VALUES (20, 'Broken Price Item', 'Home', -15.00, 10)")
cur.execute("INSERT INTO products (product_id, product_name, category, price, stock_quantity) VALUES (21, 'Duplicate Test Row', 'Home', 9.99, 5)")
conn.commit()

# Task 1: Find and fix the invalid email


# Task 2: Find and fix the negative price


# Task 3: Find and delete the duplicate test row


# Verify your cleanup:
run_sql("""SELECT * FROM customers WHERE customer_id = 20;""")
run_sql("""SELECT * FROM products WHERE product_id IN (20, 21);""")
`,
      },
    ]);
    console.log(`✓ Challenge: Clean Up the Data (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 8 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does INSERT INTO do?", options: ["Removes a row", "Adds a new row to a table", "Changes an existing row", "Creates a new table"], correct_index: 1, explanation: "INSERT INTO adds a brand new row to a table." },
      { question_text: "What does UPDATE ... SET ... WHERE do?", options: ["Adds a new row", "Changes the value of specified columns for rows matching WHERE", "Deletes rows matching WHERE", "Creates a new column"], correct_index: 1, explanation: "UPDATE changes column values for the rows matching the WHERE clause." },
      { question_text: "What happens if you run UPDATE products SET price = 0; with no WHERE clause?", options: ["Nothing happens", "It sets EVERY product's price to 0", "It only affects the first row", "It causes an error"], correct_index: 1, explanation: "Without WHERE, UPDATE applies to every row in the table." },
      { question_text: "What happens if you run DELETE FROM customers; with no WHERE clause?", options: ["Nothing happens", "It deletes every row in the customers table entirely", "It only deletes duplicate rows", "It asks for confirmation automatically"], correct_index: 1, explanation: "DELETE without WHERE removes every row in the table — a serious, often irreversible mistake." },
      { question_text: "What's a recommended safe habit before running an UPDATE or DELETE?", options: ["Just run it — SQL will warn you if it's wrong", "Run the equivalent SELECT with the same WHERE first, to confirm which rows are affected", "Always omit WHERE for simplicity", "Never use UPDATE or DELETE at all"], correct_index: 1, explanation: "Checking with SELECT first confirms exactly which rows a WHERE clause matches before changing or removing them." },
      { question_text: "In INSERT INTO products (product_id, product_name, price) VALUES (13, 'Yoga Mat', 29.99);, what determines which value goes into which column?", options: ["Alphabetical order", "The position in VALUES matches the position in the column list", "SQL guesses automatically", "It doesn't matter"], correct_index: 1, explanation: "Values are matched to columns by position — the first value goes to the first listed column, and so on." },
      { question_text: "What is a database transaction, conceptually?", options: ["A type of JOIN", "A way to group several changes together and commit or roll them back as one unit", "A synonym for SELECT", "A pricing calculation"], correct_index: 1, explanation: "A transaction groups changes so they can be committed (made permanent) or rolled back (undone) together." },
      { question_text: "In this course's labs, why is it safe to freely experiment with INSERT/UPDATE/DELETE?", options: ["It isn't safe — be very careful", "Each lab runs against a fresh, private, in-memory copy of the data, isolated from other labs and students", "The database is read-only", "Changes are automatically emailed to an admin for approval"], correct_index: 1, explanation: "Each lab creates its own private database copy, so nothing done there affects any other lab, student, or shared data." },
      { question_text: "Which command would you use to fix a product's incorrect price?", options: ["INSERT", "UPDATE", "DELETE", "SELECT"], correct_index: 1, explanation: "UPDATE changes an existing value, which is exactly what correcting a price requires." },
      { question_text: "Which command would you use to remove an accidentally duplicated test row?", options: ["INSERT", "UPDATE", "DELETE", "SELECT"], correct_index: 2, explanation: "DELETE removes rows entirely, which is what's needed for an unwanted duplicate." },
    ]);
    console.log(`✓ Module 8 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 8 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- \`INSERT INTO ... VALUES ...\` adds new rows
- \`UPDATE ... SET ... WHERE ...\` changes existing rows — and why omitting \`WHERE\` is dangerous
- \`DELETE FROM ... WHERE ...\` removes rows — and why omitting \`WHERE\` is even more dangerous
- The safe habit: \`SELECT\` with the same \`WHERE\` first, before \`UPDATE\`/\`DELETE\`
- You cleaned up genuinely messy data: a bad email, a negative price, and a duplicate row

## Coming Up Next Week

You can read, join, and modify data — this week's finishing move is analytical thinking: \`CASE\` for conditional logic, and a first, careful look at window functions like \`ROW_NUMBER()\` and \`RANK()\`. 🧠
`);
    console.log(`✓ Module 8 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 8 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
