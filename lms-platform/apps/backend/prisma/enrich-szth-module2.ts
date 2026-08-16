/**
 * Populates Module 2 — SELECT, Filter & Sort (Week 2).
 * Run with: npx ts-node prisma/enrich-szth-module2.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 2";
const SETUP = dataMartSetup(["customers", "products"]);

async function main() {
  console.log("🌱  Populating Module 2…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 2 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔎 Mission: Find the Data

Last week you retrieved entire tables. This week, you'll narrow that down to exactly what matters — and meet a second table.

## This Week You'll Learn To

- Remove duplicate values with \`DISTINCT\`
- Filter rows with \`WHERE\` and comparison operators
- Sort results with \`ORDER BY\`
- Work with a second table: \`products\`

## Why This Matters

Real questions are almost never "show me everything" — they're "show me customers from Toronto" or "show me products under $50." Filtering and sorting are what turn a raw table dump into an actual answer.
`);
    console.log(`✓ Week 2 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Selecting Columns and DISTINCT");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Meet a Second Table: \`products\`

DataMart also sells products — the \`products\` table tracks what's for sale.

| Column | What it holds |
|---|---|
| \`product_id\` | A unique number for each product |
| \`product_name\` | The product's name |
| \`category\` | Which category it belongs to (Electronics, Home, Clothing, Books) |
| \`price\` | The price, in dollars |
| \`stock_quantity\` | How many are currently in stock |

## Finding Unique Values With \`DISTINCT\`

**Business question:** "What product categories do we sell?"

\`\`\`sql
SELECT DISTINCT category
FROM products;
\`\`\`

Without \`DISTINCT\`, you'd get one row per *product* (with categories repeating many times). With it, you get each category exactly once — a clean list of unique values.

## Query Walkthrough

- \`SELECT DISTINCT category\` — "give me each unique value in the category column"
- \`FROM products\` — "...from the products table"

## Try It

Predict what \`SELECT DISTINCT city FROM customers;\` would return, based on last week's customer data, then check it in the lab below.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Predict the result, then run this query on customers, and try DISTINCT on products.category too.", code: `${SETUP}
run_sql("""
SELECT DISTINCT city FROM customers;
""")

run_sql("""
SELECT DISTINCT category FROM products;
""")
` },
    ]);
    console.log(`✓ Selecting Columns and DISTINCT (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Filtering with WHERE");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The \`WHERE\` Clause

**Business question:** "Which customers are from Toronto?"

\`\`\`sql
SELECT first_name, last_name, city
FROM customers
WHERE city = 'Toronto';
\`\`\`

\`WHERE\` filters rows down to only the ones matching your condition — everything else is excluded from the results entirely.

## Comparison Operators

| Operator | Meaning |
|---|---|
| \`=\` | equal to |
| \`<>\` (or \`!=\`) | not equal to |
| \`>\` | greater than |
| \`<\` | less than |
| \`>=\` | greater than or equal to |
| \`<=\` | less than or equal to |

**Business question:** "Which products cost more than $50?"

\`\`\`sql
SELECT product_name, price
FROM products
WHERE price > 50;
\`\`\`

## Query Walkthrough

- \`SELECT product_name, price\` — the columns to display
- \`FROM products\` — the table to search
- \`WHERE price > 50\` — only include rows where the price column's value is greater than 50

## Try It

Write a query that finds all customers from a province other than \`'ON'\` (hint: use \`<>\`).
`);
    await attachLab(prisma, l.id, [
      { instructions: "Find customers NOT from Ontario ('ON'), and products priced under $30.", code: `${SETUP}
run_sql("""
SELECT first_name, last_name, province FROM customers WHERE province <> 'ON';
""")

run_sql("""
SELECT product_name, price FROM products WHERE price < 30;
""")
` },
    ]);
    console.log(`✓ Filtering with WHERE (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Sorting with ORDER BY");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The \`ORDER BY\` Clause

**Business question:** "What are our products, cheapest first?"

\`\`\`sql
SELECT product_name, price
FROM products
ORDER BY price ASC;
\`\`\`

- \`ASC\` — ascending (smallest/earliest first) — this is the default if you don't specify
- \`DESC\` — descending (largest/latest first)

**Business question:** "What are our most expensive products?"

\`\`\`sql
SELECT product_name, price
FROM products
ORDER BY price DESC;
\`\`\`

## Combining WHERE and ORDER BY

\`\`\`sql
SELECT product_name, price
FROM products
WHERE category = 'Electronics'
ORDER BY price DESC;
\`\`\`

Order matters: \`WHERE\` always comes before \`ORDER BY\` in a query. Read it as: "filter first, then sort what's left."

## Sorting by Multiple Columns

\`\`\`sql
SELECT first_name, last_name, city
FROM customers
ORDER BY city ASC, last_name ASC;
\`\`\`

This sorts primarily by city, and *within* each city, alphabetically by last name — useful whenever one sort key alone would leave ties.

## Try It

Write a query that lists all customers sorted by \`signup_date\`, earliest first.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Sort customers by signup_date (earliest first), and sort Electronics products by price (highest first).", code: `${SETUP}
run_sql("""
SELECT first_name, last_name, signup_date FROM customers ORDER BY signup_date ASC;
""")

run_sql("""
SELECT product_name, price FROM products WHERE category = 'Electronics' ORDER BY price DESC;
""")
` },
    ]);
    console.log(`✓ Sorting with ORDER BY (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Data Detective");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔎 Data Detective

Put \`WHERE\`, \`ORDER BY\`, and \`DISTINCT\` together to answer real business questions.

## Your Tasks

1. Find customers from Toronto, sorted alphabetically by last name
2. Find all Home category products
3. Find products with fewer than 50 in stock (a restocking concern)
4. List the unique provinces customers come from
5. Find products priced between... well, you don't know \`BETWEEN\` yet — use \`WHERE price >= 20 AND price <= 50\` for now (you'll learn a cleaner way next week)

## Experiment

Combine a \`WHERE\` and \`ORDER BY\` in a query of your own devising — pick any business question about customers or products that interests you.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Work through the 5 Data Detective tasks above, one query at a time.",
        code: `${SETUP}
# Task 1: Customers from Toronto, sorted by last name


# Task 2: All Home category products


# Task 3: Products with fewer than 50 in stock


# Task 4: Unique provinces customers come from


# Task 5: Products priced $20-$50 (using AND, covered fully next week)

`,
      },
    ]);
    console.log(`✓ Lab: Data Detective (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Top 5 and More");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔎 Challenge: Top 5 and More

## Requirements

1. Find the **5 most expensive products** overall (hint: \`ORDER BY\` + look at the top 5 rows of the result — you'll learn a formal \`LIMIT\` clause soon, but for now just sort and read the top rows)
2. Find all customers from a city of your choosing
3. Find all products in the \`Clothing\` category, cheapest first
4. Find all orders — wait, you don't have the \`orders\` table yet. Skip this one; it's coming in Module 4!

## Reflect

Which of these questions would have been painful to answer by scrolling through a spreadsheet manually? That gap is exactly why SQL exists.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Find the 5 most expensive products, customers from a city of your choice, and Clothing products cheapest first.",
        code: `${SETUP}
# Task 1: 5 most expensive products (read the top 5 rows)
run_sql("""
SELECT product_name, price FROM products ORDER BY price DESC;
""")

# Task 2: Customers from a city of your choice


# Task 3: Clothing products, cheapest first

`,
      },
    ]);
    console.log(`✓ Challenge: Top 5 and More (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 2 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does SELECT DISTINCT city FROM customers; return?", options: ["Every customer's city, with duplicates", "Each unique city value, listed once", "Only the first city", "An error"], correct_index: 1, explanation: "DISTINCT removes duplicate values, returning each unique value once." },
      { question_text: "What does WHERE price > 50 filter for?", options: ["Prices exactly equal to 50", "Prices greater than 50", "Prices less than 50", "All prices"], correct_index: 1, explanation: "> means greater than, so this keeps rows where price is above 50." },
      { question_text: "What is the default sort direction if you don't specify ASC or DESC?", options: ["DESC", "ASC", "Random", "No default — it's required"], correct_index: 1, explanation: "ORDER BY defaults to ascending (ASC) order if not specified." },
      { question_text: "In what order do WHERE and ORDER BY appear in a query?", options: ["ORDER BY always comes first", "WHERE comes before ORDER BY", "They can be in either order", "They can't be used together"], correct_index: 1, explanation: "WHERE filters rows first; ORDER BY sorts what's left, and must come after WHERE." },
      { question_text: "What does <> mean in SQL?", options: ["Less than", "Greater than", "Not equal to", "Equal to"], correct_index: 2, explanation: "<> (and != in some dialects) means 'not equal to'." },
      { question_text: "What does ORDER BY city ASC, last_name ASC do?", options: ["Sorts only by city", "Sorts by city first, then by last_name within each city as a tiebreaker", "Causes an error", "Sorts randomly"], correct_index: 1, explanation: "Multiple ORDER BY columns sort primarily by the first, using later columns to break ties." },
      { question_text: "Which query finds products cheaper than $30?", options: ["WHERE price > 30", "WHERE price < 30", "WHERE price = 30", "ORDER BY price < 30"], correct_index: 1, explanation: "< means less than, so this correctly filters for prices under 30." },
      { question_text: "What does DESC stand for in ORDER BY?", options: ["Describe", "Descending — largest/latest first", "Destination", "Decrease"], correct_index: 1, explanation: "DESC sorts in descending order, from largest/latest to smallest/earliest." },
      { question_text: "What columns does the products table have?", options: ["first_name, last_name, email", "product_id, product_name, category, price, stock_quantity", "order_id, customer_id, total_amount", "Only product_name"], correct_index: 1, explanation: "The products table tracks product_id, product_name, category, price, and stock_quantity." },
      { question_text: "Why might an analyst prefer SELECT product_name, price over SELECT * when they only need those two columns?", options: ["SELECT * is invalid syntax", "It's clearer to read and avoids retrieving unnecessary columns", "There's no difference at all", "SELECT * only works on customers"], correct_index: 1, explanation: "Naming exact columns is clearer and avoids pulling data you don't need." },
    ]);
    console.log(`✓ Module 2 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 2 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- \`DISTINCT\` returns each unique value once
- \`WHERE\` filters rows using comparison operators: \`=\` \`<>\` \`>\` \`<\` \`>=\` \`<=\`
- \`ORDER BY\` sorts results, \`ASC\` (default) or \`DESC\`, and can sort by multiple columns
- Met DataMart's \`products\` table
- You investigated real business questions like "who's in Toronto?" and "what's our cheapest product?"

## Coming Up Next Week

\`WHERE\` so far only checks one condition at a time. Next week you'll combine multiple conditions with \`AND\`/\`OR\`/\`NOT\`, match text patterns with \`LIKE\`, and learn one of SQL's trickiest concepts: \`NULL\`. 🎯
`);
    console.log(`✓ Module 2 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 2 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
