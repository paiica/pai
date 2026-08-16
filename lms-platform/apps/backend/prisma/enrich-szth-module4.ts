/**
 * Populates Module 4 — Calculations, Functions & Aliasing (Week 4).
 * Run with: npx ts-node prisma/enrich-szth-module4.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 4";
const SETUP = dataMartSetup(["customers", "products", "orders"]);

async function main() {
  console.log("🌱  Populating Module 4…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 4 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📊 Mission: Become a Data Analyst

So far you've retrieved and filtered data. This week you start *calculating* from it — totals, averages, counts — the exact work a business analyst does every day.

## This Week You'll Learn To

- Calculate new values with arithmetic and give them clear names with \`AS\`
- Use aggregate functions: \`COUNT()\`, \`SUM()\`, \`AVG()\`, \`MIN()\`, \`MAX()\`
- Use basic string, numeric, and date functions
- Meet a third table: \`orders\`

## Why This Matters

"How many customers do we have?" and "what's our average order value?" are two of the most common questions any business asks — and this week you'll be able to answer both with a single line of SQL.
`);
    console.log(`✓ Week 4 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Calculated Columns and Aliases");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Meet a Third Table: \`orders\`

| Column | What it holds |
|---|---|
| \`order_id\` | A unique number for each order |
| \`customer_id\` | Which customer placed it |
| \`order_date\` | When it was placed |
| \`status\` | \`Completed\`, \`Pending\`, or \`Cancelled\` |
| \`total_amount\` | The total dollar value of the order |

## Doing Math in SQL

\`\`\`sql
SELECT product_name, price, price * 1.13
FROM products;
\`\`\`

SQL can perform arithmetic directly on columns — here, calculating each product's price including 13% tax. The third column has no name yet, though — just a raw calculation.

## Naming a Calculated Column With \`AS\`

\`\`\`sql
SELECT product_name, price, price * 1.13 AS price_with_tax
FROM products;
\`\`\`

\`AS\` gives a column a clear, readable name — called an **alias**. This doesn't change your data at all, only how the result is labeled and displayed.

## Aliasing Any Column, Not Just Calculations

\`\`\`sql
SELECT first_name AS customer_first_name, last_name AS customer_last_name
FROM customers;
\`\`\`

Aliases are especially valuable once you start joining tables (Week 6), where two tables might have similarly-named columns.

## Try It

Write a query that shows each product's name, price, and a 20%-off sale price, aliased as \`sale_price\`.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Calculate a 20%-off sale price for every product, aliased clearly.", code: `${SETUP}
run_sql("""
SELECT product_name, price, price * 0.80 AS sale_price
FROM products;
""")
` },
    ]);
    console.log(`✓ Calculated Columns and Aliases (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Aggregate Functions: COUNT, SUM, AVG, MIN, MAX");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Aggregate Functions

An **aggregate function** takes many rows and boils them down to a single summary value.

**Business question:** "How many customers do we have?"

\`\`\`sql
SELECT COUNT(*) AS total_customers
FROM customers;
\`\`\`

**Business question:** "What's our total revenue from completed orders?"

\`\`\`sql
SELECT SUM(total_amount) AS total_revenue
FROM orders
WHERE status = 'Completed';
\`\`\`

## The Five Core Aggregate Functions

| Function | What it calculates |
|---|---|
| \`COUNT(*)\` | Number of rows |
| \`SUM(column)\` | Total of a numeric column |
| \`AVG(column)\` | Average of a numeric column |
| \`MIN(column)\` | Smallest value |
| \`MAX(column)\` | Largest value |

**Business question:** "What's our average, highest, and lowest order value?"

\`\`\`sql
SELECT
    AVG(total_amount) AS avg_order,
    MAX(total_amount) AS highest_order,
    MIN(total_amount) AS lowest_order
FROM orders
WHERE status = 'Completed';
\`\`\`

## An Important Rule

Aggregate functions **collapse all matching rows into one summary row** — you generally can't mix an aggregate function with a regular, non-aggregated column in the same \`SELECT\` (you'll learn the proper way to do that with \`GROUP BY\` next week).

## Try It

Write a query calculating the average product price across the whole \`products\` table.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Calculate the average product price, and the count/total/average of completed orders.", code: `${SETUP}
run_sql("""
SELECT AVG(price) AS avg_product_price FROM products;
""")

run_sql("""
SELECT COUNT(*) AS num_orders, SUM(total_amount) AS total_revenue, AVG(total_amount) AS avg_order
FROM orders
WHERE status = 'Completed';
""")
` },
    ]);
    console.log(`✓ Aggregate Functions (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "String, Numeric, and Date Functions");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## String Functions

\`\`\`sql
SELECT UPPER(first_name) AS first_name_upper
FROM customers;
\`\`\`

\`UPPER()\`/\`LOWER()\` change text case — handy for standardizing display, or for case-insensitive comparisons. \`LENGTH()\` gives you the number of characters in a string.

## Numeric Functions

\`\`\`sql
SELECT product_name, price, ROUND(price * 1.13, 2) AS price_with_tax
FROM products;
\`\`\`

\`ROUND(value, decimal_places)\` rounds a number — exactly the tool that would have cleaned up the messy decimals you may have noticed in earlier labs.

## Date Functions

Dates in this course are stored as text like \`'2023-05-15'\`. A commonly-needed operation is pulling out just the year:

\`\`\`sql
SELECT order_id, order_date, strftime('%Y', order_date) AS order_year
FROM orders;
\`\`\`

\`strftime()\` is SQLite's date-formatting function. **A quick dialect note:** PostgreSQL (this course's originally intended database) uses \`EXTRACT(YEAR FROM order_date)\` for the same job — the concept is identical, just different function names between database systems. This is normal; every SQL dialect has small syntax differences, and looking up "how do I do X in [dialect]" is a completely normal part of a working analyst's day.

## Try It

Write a query showing every customer's email in uppercase, aliased as \`email_upper\`.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Show emails in uppercase, and round product prices (with 13% tax) to 2 decimal places.", code: `${SETUP}
run_sql("""
SELECT first_name, UPPER(email) AS email_upper FROM customers;
""")

run_sql("""
SELECT product_name, ROUND(price * 1.13, 2) AS price_with_tax FROM products;
""")
` },
    ]);
    console.log(`✓ String, Numeric, and Date Functions (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Business Analyst");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📊 Business Analyst

Answer a set of real business metrics using what you've learned this week.

## Your Tasks

1. How many products does DataMart sell in total?
2. What is the average product price, rounded to 2 decimal places?
3. What is the highest and lowest priced product (as two separate aggregate values)?
4. How many completed orders are there?
5. What is total revenue from completed orders, rounded to 2 decimal places?
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Answer the 5 business metric questions above.",
        code: `${SETUP}
# Task 1: Total number of products


# Task 2: Average product price, rounded


# Task 3: Highest and lowest priced product


# Task 4: Number of completed orders


# Task 5: Total revenue from completed orders, rounded

`,
      },
    ]);
    console.log(`✓ Lab: Business Analyst (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Sales Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📊 Challenge: Sales Summary

Build one query that produces a complete sales dashboard in a single row.

## Requirements

Using \`WHERE status = 'Completed'\`, calculate all of the following in **one** \`SELECT\` statement, each with a clear alias:

- Total number of orders
- Total revenue
- Average order value (rounded to 2 decimal places)
- Highest order
- Lowest order

## Stretch Goal

Add a calculation for the difference between the highest and lowest order value.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Build a complete sales summary in one query with clear aliases for every metric.",
        code: `${SETUP}
run_sql("""
SELECT
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue,
    ROUND(AVG(total_amount), 2) AS avg_order_value,
    MAX(total_amount) AS highest_order,
    MIN(total_amount) AS lowest_order,
    MAX(total_amount) - MIN(total_amount) AS order_range
FROM orders
WHERE status = 'Completed';
""")
`,
      },
    ]);
    console.log(`✓ Challenge: Sales Summary (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 4 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does AS do in a SELECT statement?", options: ["Filters rows", "Gives a column a clear, readable name (an alias)", "Sorts results", "Joins tables"], correct_index: 1, explanation: "AS assigns an alias — a readable name — to a column or calculation." },
      { question_text: "What does COUNT(*) return?", options: ["The sum of all values", "The number of rows", "The largest value", "The average value"], correct_index: 1, explanation: "COUNT(*) counts the number of rows matching the query." },
      { question_text: "What does SUM(total_amount) calculate?", options: ["The number of orders", "The total of all total_amount values added together", "The average total_amount", "The largest total_amount"], correct_index: 1, explanation: "SUM() adds up all the values in the specified column." },
      { question_text: "What does ROUND(19.98765, 2) return?", options: ["19.98765", "19.99", "20", "19.9"], correct_index: 1, explanation: "ROUND(value, 2) rounds to 2 decimal places: 19.98765 rounds to 19.99." },
      { question_text: "Why can't you generally mix an aggregate function like SUM() with a plain, non-aggregated column in the same SELECT?", options: ["It's always fine to mix them", "Aggregate functions collapse many rows into one summary row, so a plain per-row column doesn't fit without GROUP BY", "SQL doesn't support aggregate functions at all", "Only COUNT can be used with other columns"], correct_index: 1, explanation: "Aggregates summarize many rows into one; without GROUP BY, there's no consistent way to also show a per-row value alongside it." },
      { question_text: "What does UPPER(first_name) do?", options: ["Deletes the first_name column", "Converts the text to uppercase", "Sorts alphabetically", "Removes spaces"], correct_index: 1, explanation: "UPPER() converts text to all uppercase letters." },
      { question_text: "Does changing a column's alias with AS change the underlying data?", options: ["Yes, it permanently changes the data", "No, it only changes how the result is labeled/displayed", "It deletes the column", "It only works with numbers"], correct_index: 1, explanation: "AS only affects the displayed label in the result — the underlying data is untouched." },
      { question_text: "Which function finds the smallest value in a column?", options: ["MAX()", "SUM()", "MIN()", "COUNT()"], correct_index: 2, explanation: "MIN() returns the smallest value in the specified column." },
      { question_text: "What does the orders table's status column typically contain?", options: ["Only numbers", "Values like Completed, Pending, or Cancelled", "Customer names", "Product categories"], correct_index: 1, explanation: "status tracks the order's state, such as Completed, Pending, or Cancelled." },
      { question_text: "Why might a PostgreSQL query use EXTRACT(YEAR FROM order_date) while this course uses strftime('%Y', order_date)?", options: ["One of them is wrong", "Different SQL dialects sometimes use different function names for the same concept", "Dates can't be extracted in SQL", "They do completely different things"], correct_index: 1, explanation: "This is a genuine, normal dialect difference — the concept (extracting a year from a date) is identical, but the specific function name differs between database systems." },
    ]);
    console.log(`✓ Module 4 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 4 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Arithmetic and calculated columns, named clearly with \`AS\`
- The five core aggregate functions: \`COUNT()\`, \`SUM()\`, \`AVG()\`, \`MIN()\`, \`MAX()\`
- Basic string (\`UPPER()\`), numeric (\`ROUND()\`), and date (\`strftime()\`) functions
- Met DataMart's \`orders\` table
- You built a complete one-query sales dashboard

## Coming Up Next Week

Aggregates so far summarize the *whole* table into one row. Next week you'll learn \`GROUP BY\`, which lets you get one summary row *per category* — sales by city, by product category, by status. 📈
`);
    console.log(`✓ Module 4 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 4 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
