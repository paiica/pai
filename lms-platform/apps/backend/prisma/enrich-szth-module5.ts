/**
 * Populates Module 5 — GROUP BY & HAVING (Week 5).
 * Note: examples deliberately avoid JOINs (e.g. "sales by city" needs
 * customers+orders joined) — sequenced correctly per the spec's own
 * rule not to introduce JOINs before students are ready (Week 6).
 * "Sales by city" is previewed as what JOIN+GROUP BY together unlock
 * next week, not built here.
 *
 * Run with: npx ts-node prisma/enrich-szth-module5.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 5";
const SETUP = dataMartSetup(["customers", "products", "orders"]);

async function main() {
  console.log("🌱  Populating Module 5…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 5 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📈 Mission: Discover the Patterns

Last week's aggregates summarized an entire table into one row. This week, you'll get one summary row *per category* — the single most common thing a real business analyst does.

## This Week You'll Learn To

- Group rows into categories with \`GROUP BY\`
- Filter *groups* (not individual rows) with \`HAVING\`
- Understand exactly how \`WHERE\` and \`HAVING\` differ

## Why This Matters

"What's our average order value?" is useful. "What's our average order value *by status*, so we can see Completed vs. Pending separately?" is far more useful — and that's exactly what \`GROUP BY\` unlocks.
`);
    console.log(`✓ Week 5 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Why Grouping Matters: GROUP BY");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Problem \`GROUP BY\` Solves

**Business question:** "How many customers do we have in each province?"

Last week's \`COUNT(*)\` gives you one number for the *whole* table. \`GROUP BY\` gives you one number *per group*:

\`\`\`sql
SELECT province, COUNT(*) AS num_customers
FROM customers
GROUP BY province;
\`\`\`

## Query Walkthrough

- \`SELECT province, COUNT(*)\` — for each group, show the group's value and a count of rows in it
- \`FROM customers\` — the table
- \`GROUP BY province\` — split the rows into groups, one per unique province value, *before* calculating the aggregate

Think of it as SQL silently sorting every row into a bucket labeled by its province, then running \`COUNT(*)\` separately within each bucket.

## Real-World Comparison

Imagine sorting a pile of receipts into separate stacks by store name, then counting each stack — that's exactly what \`GROUP BY\` does, just automatically and instantly.

## Grouping With Other Aggregates

**Business question:** "What's the average price per product category?"

\`\`\`sql
SELECT category, AVG(price) AS avg_price, COUNT(*) AS num_products
FROM products
GROUP BY category;
\`\`\`

## The Rule: Every Non-Aggregated Column Must Be in GROUP BY

If a column appears in \`SELECT\` without an aggregate function wrapped around it, it generally must also appear in \`GROUP BY\` — otherwise SQL doesn't know which single value to show for a group containing many rows.

## Try It

Write a query showing the number of orders and total revenue, grouped by \`status\`.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Group customers by province, and group orders by status with count and total.", code: `${SETUP}
run_sql("""
SELECT province, COUNT(*) AS num_customers
FROM customers
GROUP BY province;
""")

run_sql("""
SELECT status, COUNT(*) AS num_orders, SUM(total_amount) AS total_revenue
FROM orders
GROUP BY status;
""")
` },
    ]);
    console.log(`✓ Why Grouping Matters (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Filtering Groups with HAVING");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Problem \`HAVING\` Solves

**Business question:** "Which product categories have more than 2 products?"

\`\`\`sql
SELECT category, COUNT(*) AS num_products
FROM products
GROUP BY category
HAVING COUNT(*) > 2;
\`\`\`

\`HAVING\` filters the **groups themselves**, after they've been calculated — here, only keeping categories where the count exceeds 2.

## Why You Can't Use WHERE for This

\`\`\`sql
SELECT category, COUNT(*) AS num_products
FROM products
GROUP BY category
WHERE COUNT(*) > 2;   -- ERROR!
\`\`\`

This fails because \`WHERE\` filters individual rows *before* grouping happens — at that point, \`COUNT(*)\` doesn't exist yet for \`WHERE\` to check. \`HAVING\` exists specifically to filter *after* the aggregate has been calculated.

## Try It

Write a query finding which order statuses have a total revenue over $100.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Find categories with more than 2 products, and order statuses with total revenue over $100.", code: `${SETUP}
run_sql("""
SELECT category, COUNT(*) AS num_products
FROM products
GROUP BY category
HAVING COUNT(*) > 2;
""")

run_sql("""
SELECT status, SUM(total_amount) AS total_revenue
FROM orders
GROUP BY status
HAVING SUM(total_amount) > 100;
""")
` },
    ]);
    console.log(`✓ Filtering Groups with HAVING (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "WHERE vs HAVING");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Order SQL Actually Runs In

This is one of the most important distinctions in SQL, so it's worth stating precisely:

1. \`FROM\` — start with the table
2. \`WHERE\` — filter individual rows
3. \`GROUP BY\` — group the remaining rows
4. \`HAVING\` — filter the resulting groups
5. \`SELECT\` — choose what to display
6. \`ORDER BY\` — sort the final result

\`WHERE\` acts on **raw rows**, before grouping. \`HAVING\` acts on **groups**, after aggregation.

## Using Both Together

**Business question:** "Among completed orders, which statuses—wait, that doesn't make sense with just one status filtered. Let's try a real combined example: "Among Electronics and Home products, which categories average over $40?"

\`\`\`sql
SELECT category, AVG(price) AS avg_price
FROM products
WHERE category IN ('Electronics', 'Home')
GROUP BY category
HAVING AVG(price) > 40;
\`\`\`

Read it in order: first narrow down to just Electronics/Home products (\`WHERE\`), then group what's left by category, then keep only the resulting groups averaging over $40 (\`HAVING\`).

## Try It

Write a query: among only \`Completed\` orders, which customers (\`customer_id\`) have placed more than 1 order? (Hint: \`WHERE status = 'Completed'\`, \`GROUP BY customer_id\`, \`HAVING COUNT(*) > 1\`.)
`);
    await attachLab(prisma, l.id, [
      { instructions: "Find customers with more than 1 completed order, using WHERE and HAVING together.", code: `${SETUP}
run_sql("""
SELECT customer_id, COUNT(*) AS num_orders
FROM orders
WHERE status = 'Completed'
GROUP BY customer_id
HAVING COUNT(*) > 1;
""")
` },
    ]);
    console.log(`✓ WHERE vs HAVING (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Sales Analyst");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📈 Sales Analyst

Answer real business questions using \`GROUP BY\` and \`HAVING\`.

## Your Tasks

1. How many products are in each category?
2. What is the average order value, grouped by status?
3. Which categories have an average price above $30? (use \`HAVING\`)
4. How many customers are there per province, sorted from most to fewest?

## A Preview

Notice you *can't* easily answer "which city generates the most revenue?" yet — that needs the \`orders\` table connected to the \`customers\` table, since \`city\` lives on \`customers\` but \`total_amount\` lives on \`orders\`. That's exactly what next week's \`JOIN\` unlocks.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Work through the 4 Sales Analyst tasks above.",
        code: `${SETUP}
# Task 1: Number of products per category


# Task 2: Average order value, grouped by status


# Task 3: Categories with average price above $30


# Task 4: Customers per province, most to fewest

`,
      },
    ]);
    console.log(`✓ Lab: Sales Analyst (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Top-Performing Categories");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📈 Challenge: Top-Performing Categories

## Requirements

Write one query that, for every product category, shows:

- The number of products in that category
- The average price (rounded to 2 decimal places)
- The total value of all stock (\`SUM(price * stock_quantity)\`)

Sorted by total stock value, highest first.

## Stretch Goal

Add a \`HAVING\` clause keeping only categories with more than 2 products.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Build the full category performance summary described above.",
        code: `${SETUP}
run_sql("""
SELECT
    category,
    COUNT(*) AS num_products,
    ROUND(AVG(price), 2) AS avg_price,
    SUM(price * stock_quantity) AS total_stock_value
FROM products
GROUP BY category
HAVING COUNT(*) > 2
ORDER BY total_stock_value DESC;
""")
`,
      },
    ]);
    console.log(`✓ Challenge: Top-Performing Categories (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 5 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does GROUP BY category do?", options: ["Deletes duplicate categories", "Splits rows into groups by category, so aggregates calculate per group", "Sorts by category", "Filters out one category"], correct_index: 1, explanation: "GROUP BY splits rows into one group per unique value, letting aggregates run separately within each group." },
      { question_text: "What does HAVING filter?", options: ["Individual rows, before grouping", "The resulting groups, after aggregation", "Column names", "Table names"], correct_index: 1, explanation: "HAVING filters groups after GROUP BY and aggregation have already happened." },
      { question_text: "What does WHERE filter?", options: ["Groups, after aggregation", "Individual rows, before grouping", "Only aggregate results", "Nothing — WHERE can't be used with GROUP BY"], correct_index: 1, explanation: "WHERE filters raw rows before any grouping occurs." },
      { question_text: "Why does WHERE COUNT(*) > 2 cause an error when used with GROUP BY?", options: ["COUNT() is invalid syntax", "WHERE runs before grouping/aggregation, so COUNT(*) doesn't exist yet at that point", "WHERE can never be used with aggregates under any circumstance", "GROUP BY is incompatible with WHERE entirely"], correct_index: 1, explanation: "WHERE filters rows before aggregation happens, so an aggregate result like COUNT(*) isn't available to it yet — that's what HAVING is for." },
      { question_text: "In the logical order SQL processes a query, what comes first: WHERE or GROUP BY?", options: ["GROUP BY comes first", "WHERE comes first", "They happen simultaneously", "Neither — order doesn't matter"], correct_index: 1, explanation: "WHERE filters rows first; GROUP BY then groups whatever rows remain." },
      { question_text: "What does SELECT category, AVG(price) FROM products GROUP BY category; return?", options: ["One row total, averaging all products", "One row per unique category, with that category's average price", "An error", "One row per product"], correct_index: 1, explanation: "This returns one summary row per unique category value." },
      { question_text: "Why can't you currently answer 'which city generates the most revenue?' with just GROUP BY on one table?", options: ["It's impossible in SQL", "city lives on customers and total_amount lives on orders — you need to connect (JOIN) the two tables first", "GROUP BY doesn't support city names", "Revenue can't be grouped"], correct_index: 1, explanation: "The needed columns live in two different tables, which requires a JOIN (next week's topic) before grouping by city." },
      { question_text: "In SELECT category, COUNT(*) FROM products GROUP BY category HAVING COUNT(*) > 2;, what determines whether a category appears in the results?", options: ["Its price", "Whether that category has more than 2 products", "Its name alphabetically", "Nothing filters it"], correct_index: 1, explanation: "HAVING COUNT(*) > 2 keeps only groups (categories) with more than 2 rows (products)." },
      { question_text: "Can WHERE and HAVING be used in the same query?", options: ["No, never", "Yes — WHERE filters rows first, then HAVING filters the resulting groups", "Only if there's no GROUP BY", "Only HAVING is ever needed"], correct_index: 1, explanation: "They serve different stages and are commonly used together: WHERE for rows, HAVING for groups." },
      { question_text: "Generally, what rule applies to non-aggregated columns in a SELECT list when GROUP BY is used?", options: ["They can be anything", "They generally must also appear in the GROUP BY clause", "They must be aggregated with SUM()", "They are automatically ignored"], correct_index: 1, explanation: "Any column shown that isn't wrapped in an aggregate function generally needs to be part of the GROUP BY clause too." },
    ]);
    console.log(`✓ Module 5 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 5 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- \`GROUP BY\` splits rows into groups, so aggregates calculate one result per group
- \`HAVING\` filters the resulting *groups*, unlike \`WHERE\` which filters raw rows
- The logical processing order: \`FROM\` → \`WHERE\` → \`GROUP BY\` → \`HAVING\` → \`SELECT\` → \`ORDER BY\`
- You analyzed customers by province, orders by status, and products by category

## Coming Up Next Week

You've hit a real wall: you can't group by city because \`city\` and \`total_amount\` live on different tables. Next week fixes that permanently — you'll learn \`JOIN\`, arguably the single most important skill in all of SQL. 🔗
`);
    console.log(`✓ Module 5 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 5 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
