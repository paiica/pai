/**
 * Populates Module 1 — Welcome to Databases & Your First SQL Query (Week 1).
 * Run with: npx ts-node prisma/enrich-szth-module1.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 1";
const SETUP = dataMartSetup(["customers"]);

async function main() {
  console.log("🌱  Populating Module 1…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Welcome to SQL");
    const { blocks } = await writeLessonContent(prisma, l.id, `
Welcome. Over the next 10 weeks you're going to learn SQL — the language used to ask questions of data, wherever that data lives. No previous database experience required.

**You do not need to know anything about databases yet.** If you've never opened a spreadsheet with more than a few hundred rows, never heard the word "query," and don't know what a "table" means in this context, you're exactly who this course is for.

## What SQL Can Do

SQL (Structured Query Language) is how you talk to a database — asking it questions like "how many customers do we have in Toronto?" or "what were our top 5 best-selling products last month?" and getting a precise answer back in seconds, even from millions of rows.

## Where SQL Is Used

SQL is one of the most widely used and longest-lived technologies in all of computing — nearly every company with meaningful amounts of data uses it somewhere: e-commerce platforms, banks, hospitals, social media companies, government agencies. If a job posting mentions "data analyst," "business analyst," "data scientist," or "data engineer," it almost certainly lists SQL as a required skill.

## How SQL Relates to Data Analytics

Data analytics is the practice of turning raw data into decisions. SQL is the primary tool analysts use to get from "we have a database full of numbers" to "here's what those numbers actually mean." Every chart, dashboard, and report you've ever seen at a company almost certainly started as a SQL query.

## How the Course Works

Each week is one **Module**, built around a business scenario using a single, consistent fictional company's database — you'll get to know it well over 10 weeks. Every module follows the same rhythm: **Learn → See → Try → Query → Break → Debug → Analyze → Build**. You write real SQL from Week 1, in an in-browser **Lab** against real (if fictional) data — no installation required.

## How Labs Work

Every lab gives you a working SQL environment right inside the lesson, preloaded with real sample data. You write a query, run it, and see actual results — the same rows and columns a real database would return.

## How Missions Work

Each week has a themed **Mission** — this week it's 🗄️ *Explore the Database*. Think of it as a checkpoint for what "success" looks like by the end of the week.

Let's meet the data.
`);
    console.log(`✓ Welcome to SQL (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "What Is Data?");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is Data?

**Data** is simply recorded facts — a name, a price, a date, a quantity. Every business generates enormous amounts of it constantly: every sale, every customer signup, every shipment.

## Structured vs. Unstructured Data

- **Structured data** fits neatly into rows and columns — a customer's name, email, and city, each in its own consistent field. This is what SQL is built for.
- **Unstructured data** doesn't fit a fixed shape — an email's body text, a photo, a customer support call recording.

This course focuses entirely on structured data, which is exactly what relational databases (and SQL) are designed to store and query.

## Examples of Business Data

Almost every company tracks some version of:

- **Customer data** — who buys from you (names, emails, locations)
- **Sales data** — what was sold, when, and for how much
- **Product data** — what you sell, at what price, how much is in stock
- **Employee data** — who works for the company, and in what role

Over the next 10 weeks, you'll work with all four of these, through a single consistent fictional company.

## Why This Matters

Before writing a single line of SQL, it helps to think like an analyst: what facts does a business need to track to answer real questions like "who are our best customers?" or "what's selling well?" That's the mindset this whole course is built around.
`);
    console.log(`✓ What Is Data? (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "What Is a Database?");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is a Database?

A **database** is an organized collection of data, stored so it can be reliably saved, searched, and updated. A **database management system** (DBMS) — like PostgreSQL, MySQL, or SQLite — is the software that actually stores and manages that data. This course uses SQL, the language nearly every DBMS understands.

## Relational Databases

A **relational database** organizes data into **tables** — and, critically, lets those tables be *connected* to each other (more on that in Week 6). "Relational" refers to the relationships between tables, not just data sitting in one place.

## The Spreadsheet Comparison

A database table can look familiar because it resembles a spreadsheet — data organized into rows and columns. But databases provide powerful capabilities spreadsheets don't: storing millions of rows efficiently, connecting related tables together, protecting data from accidental corruption, and answering complex questions in a fraction of a second using SQL.

## Core Terminology

| Term | Meaning | Spreadsheet equivalent |
|---|---|---|
| **Table** | A structured collection of related data | A single sheet |
| **Column** (or **field**) | One category of information (e.g. \`email\`) | A spreadsheet column |
| **Row** (or **record**) | One complete entry (e.g. one customer) | A spreadsheet row |

A table named \`customers\` might have columns like \`first_name\`, \`email\`, and \`city\` — and each row is one actual customer's information across those columns.

## Try It

Picture a spreadsheet of your own contacts — name, phone number, city. That's conceptually a database table already: each contact is a row, each piece of information about them is a column.
`);
    console.log(`✓ What Is a Database? (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Meet Our Database");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Meet DataMart

Throughout this entire course, you'll work with one consistent, realistic fictional company: **DataMart**, an online retail store. You won't see its whole database at once — like a real analyst ramping up on a new company, you'll meet each table gradually, as you're ready for it.

## Starting Simple: the \`customers\` Table

This week, you'll work with just one table: \`customers\`.

| Column | What it holds |
|---|---|
| \`customer_id\` | A unique number identifying each customer |
| \`first_name\` | The customer's first name |
| \`last_name\` | The customer's last name |
| \`email\` | Their email address |
| \`city\` | The city they live in |
| \`province\` | The province they live in |
| \`signup_date\` | The date they created an account |

## Data Types

Notice each column holds one *kind* of value: \`customer_id\` is always a number, \`first_name\` is always text, \`signup_date\` is always a date. This consistency — every value in a column being the same type — is part of what makes databases so reliable and fast to search.

## What a Row Looks Like

One row in \`customers\` might be: \`customer_id\` 1, \`first_name\` "Maria", \`last_name\` "Chen", \`email\` "maria.chen@email.com", \`city\` "Toronto", \`province\` "ON", \`signup_date\` "2023-01-15" — one real customer, one complete record. DataMart has 10 customers in total, and you'll meet all of them properly in the lab coming up soon.
`);
    console.log(`✓ Meet Our Database (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "What Is SQL?");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## SQL = Structured Query Language

SQL is the language used to communicate with a relational database. It's not a general-purpose programming language like Python — it's specifically designed to describe *what* data you want, and let the database figure out *how* to get it efficiently.

## What SQL Lets You Do

- **Retrieve** data — get specific information back out
- **Filter** data — narrow results down to what matters
- **Sort** data — order results meaningfully
- **Analyze** data — calculate totals, averages, counts
- **Combine** data — connect related tables together
- **Add** data — insert new records
- **Modify** data — update existing records
- **Delete** data — remove records that shouldn't exist anymore
- **Create structures** — define new tables (a more advanced topic, briefly touched on later)

This course covers all of these, roughly in that order — starting with retrieving and filtering (the most common day-to-day analyst work) and building toward modifying data and advanced analysis.

## SQL Reads Almost Like English

One of SQL's most beginner-friendly qualities is that a well-written query is genuinely readable:

\`\`\`sql
SELECT first_name, last_name
FROM customers
WHERE city = 'Toronto';
\`\`\`

Even before learning any SQL syntax formally, you can probably guess this asks: "show me the first and last names of customers from Toronto." That's exactly what it does — and in the next lesson, you'll write your first real query.
`);
    console.log(`✓ What Is SQL? (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Your First SQL Query");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Simplest Possible Query

\`\`\`sql
SELECT *
FROM customers;
\`\`\`

Let's break this down piece by piece:

- \`SELECT\` — the keyword that starts every query that retrieves data; it means "I want to see..."
- \`*\` — a wildcard meaning "all columns"
- \`FROM customers\` — tells SQL which table to look in
- \`;\` — a semicolon marks the end of the statement (good habit to always include it)

Read the whole thing as one sentence: "Select all columns from the customers table."

## Choosing Specific Columns

\`\`\`sql
SELECT first_name, last_name
FROM customers;
\`\`\`

Instead of \`*\`, you can name exactly which columns you want, separated by commas. This returns just two columns for every customer, instead of all seven — usually a better habit than \`*\` once you know exactly what you need, since it's clearer to read and faster on large tables.

## Try It

Before opening the lab, predict: what would \`SELECT email FROM customers;\` return? You'll check your answer in the very next lesson.
`);
    console.log(`✓ Your First SQL Query (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Your First SQL Queries");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Your First SQL Lab

Time to run real queries against real data. The lab below is preloaded with DataMart's \`customers\` table (10 real sample customers) and a \`run_sql()\` helper — write your SQL inside the triple-quoted string and run the cell.

## Your Tasks

Work through these one at a time, editing the query inside \`run_sql("""...""")\` and running it each time:

1. Display all customers (every column)
2. Display only customer names (\`first_name\`, \`last_name\`)
3. Display customer emails
4. Display customer cities
5. Display first name, city, and province together

## Experiment

After finishing the five tasks, try selecting just \`signup_date\`, or try re-ordering the columns you list after \`SELECT\` — does the order you list them in change the order they appear in the results?
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Work through the 5 tasks above by editing the query inside run_sql(). Task 1 is done for you.",
        code: `${SETUP}
# Task 1: Display all customers (done for you)
run_sql("""
SELECT * FROM customers;
""")

# Task 2: Display only customer names (first_name, last_name)


# Task 3: Display customer emails


# Task 4: Display customer cities


# Task 5: Display first_name, city, and province together

`,
      },
    ]);
    console.log(`✓ Lab: Your First SQL Queries (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "SQL Syntax & Common Mistakes");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## SQL Building Blocks

- **Keywords** (\`SELECT\`, \`FROM\`) — this course writes them in UPPERCASE by convention, though SQL itself doesn't require it. Consistent casing makes queries much easier to read.
- **Commas** separate multiple column names — forgetting one is one of the most common beginner errors.
- **Semicolons** mark the end of a statement.
- **Table and column names** must be spelled exactly as they exist in the database — SQL won't guess what you meant.
- **Quotes**: text values (like \`'Toronto'\`) need single quotes around them; table and column names generally don't.

## Common Mistakes and How to Read Them

**Missing comma:**
\`\`\`sql
SELECT first_name last_name FROM customers;
-- Error: SQL reads this as one confusing column reference
\`\`\`
Fix: \`SELECT first_name, last_name FROM customers;\`

**Misspelled column name:**
\`\`\`sql
SELECT frist_name FROM customers;
-- Error: column "frist_name" does not exist
\`\`\`
The error message names the exact problem column — read it carefully, it's telling you precisely what's wrong.

**Misspelled table name:**
\`\`\`sql
SELECT * FROM customer;
-- Error: no such table: customer  (the real table is "customers", plural)
\`\`\`

**Forgetting quotes around text:**
\`\`\`sql
SELECT * FROM customers WHERE city = Toronto;
-- Error: SQL thinks Toronto is a column name, not text
\`\`\`
Fix: \`WHERE city = 'Toronto'\`

## The Habit to Build Now

Whenever a query errors, read the message calmly, find the exact word or line it's complaining about, and check it against the table/column names you actually have. This is the single most useful debugging skill in SQL, and you'll use it every week of this course.
`);
    console.log(`✓ SQL Syntax & Common Mistakes (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Mission: Explore the Database");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🗄️ Mission: Explore the Database

Time to answer real questions using SQL — not by eyeballing the data, but by querying it.

## Your Task

Using the lab below, write SQL queries to answer:

1. **How many customers are in the database?** (Run \`SELECT * FROM customers;\` and count the rows in the result — next week you'll learn \`COUNT()\` to get this instantly.)
2. **What cities do customers come from?** Select just the \`city\` column and scan the results.
3. **Which columns exist in the customers table?** \`SELECT * FROM customers;\` shows you every column name in the header row.

## Reflect

You just answered three real business questions without opening a spreadsheet or asking anyone — that's the whole point of SQL.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Answer the three mission questions using SQL queries against the customers table.",
        code: `${SETUP}
# Question 1: How many customers are there? (count the rows below)
run_sql("""
SELECT * FROM customers;
""")

# Question 2: What cities do customers come from?


# Question 3: Which columns exist in the customers table? (check the header row above)
`,
      },
    ]);
    console.log(`✓ Mission: Explore the Database (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 1 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What is a relational database?", options: ["A single spreadsheet", "A database organized into tables that can be connected to each other", "A type of programming language", "A backup system"], correct_index: 1, explanation: "A relational database organizes data into tables and lets those tables be related/connected to one another." },
      { question_text: "In database terminology, what is a 'row' also called?", options: ["A field", "A record", "A column", "A key"], correct_index: 1, explanation: "A row (one complete entry) is also called a record." },
      { question_text: "In database terminology, what is a 'column' also called?", options: ["A record", "A row", "A field", "A table"], correct_index: 2, explanation: "A column (one category of information) is also called a field." },
      { question_text: "What does SQL stand for?", options: ["Simple Query List", "Structured Query Language", "System Query Logic", "Standard Question Language"], correct_index: 1, explanation: "SQL stands for Structured Query Language." },
      { question_text: "What does SELECT * FROM customers; return?", options: ["Only the first customer", "All columns for every row in the customers table", "Just the column names", "An error"], correct_index: 1, explanation: "SELECT * returns all columns, and with no filtering, all rows too." },
      { question_text: "What is the purpose of a semicolon at the end of a SQL statement?", options: ["It's required by every database with no exceptions", "It marks the end of the statement", "It comments out the line", "It sorts the results"], correct_index: 1, explanation: "The semicolon conventionally marks where a SQL statement ends." },
      { question_text: "Why does SELECT first_name last_name FROM customers; (missing a comma) cause a problem?", options: ["SQL doesn't understand SELECT", "Without the comma, SQL can't tell these are two separate column names", "first_name is spelled wrong", "It's not a problem"], correct_index: 1, explanation: "Commas separate column names in a SELECT list — without one, the query is malformed." },
      { question_text: "Why do text values like 'Toronto' need quotes in SQL, but column names don't?", options: ["It's arbitrary styling", "Quotes tell SQL a value is literal text, not a column/table reference", "Quotes are optional and never matter", "Numbers need quotes too"], correct_index: 1, explanation: "Quotes distinguish a literal text value from a column or table name reference." },
      { question_text: "What does a database management system (DBMS) do?", options: ["It's the same thing as SQL", "It's the software that stores and manages the actual data (e.g. PostgreSQL, SQLite)", "It's a type of table", "It only handles security"], correct_index: 1, explanation: "A DBMS is the actual software managing the database — SQL is the language used to talk to it." },
      { question_text: "How is a database table similar to, and different from, a spreadsheet?", options: ["They are identical with no differences", "Both use rows and columns, but databases add relationships between tables, scale, and reliability spreadsheets don't provide", "Spreadsheets are always better for large data", "Tables can't hold text, only spreadsheets can"], correct_index: 1, explanation: "The row/column structure is similar, but databases add relationships, scale, and reliability spreadsheets aren't built for." },
    ]);
    console.log(`✓ Module 1 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 1 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- What data is, and the difference between structured and unstructured data
- What a database, a DBMS, and a relational database are
- Core terminology: tables, rows/records, columns/fields
- Met DataMart's \`customers\` table — your first real dataset
- What SQL is and what it lets you do
- Your first real queries: \`SELECT\`, \`*\`, \`FROM\`, and choosing specific columns
- How to read a SQL error message and fix common mistakes

## Coming Up Next Week

You can already retrieve every column and every row — but real analysis means narrowing down to exactly what matters. Next week you'll learn to filter with \`WHERE\` and sort with \`ORDER BY\`. 🔎
`);
    console.log(`✓ Module 1 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 1 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
