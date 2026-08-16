/**
 * Populates Module 7 — Multi-Table Analysis & Subqueries (Week 7).
 * Run with: npx ts-node prisma/enrich-szth-module7.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 7";
const SETUP = dataMartSetup(["customers", "products", "orders", "order_items"]);

async function main() {
  console.log("🌱  Populating Module 7…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 7 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🕵️ Mission: Solve the Data Mystery

You can join tables and summarize data. This week takes it further: joining three or more tables at once, and asking a question *inside* a question.

## This Week You'll Learn To

- Join three or more tables together confidently
- Write subqueries using \`IN\`
- Write scalar subqueries (a subquery that returns a single value)

## Why This Matters

"Find customers who spent more than the average customer" isn't answerable with a single flat \`WHERE\` — it needs the average calculated first, then compared against. That's exactly what a subquery is for.
`);
    console.log(`✓ Week 7 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Joining Three or More Tables");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Chaining Multiple JOINs

You already did this in last week's Boss Battle — chaining \`JOIN\`s is simply adding more of them:

\`\`\`sql
SELECT c.first_name, c.last_name, p.product_name, oi.quantity
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE p.category = 'Electronics';
\`\`\`

## Reading a Multi-Join Query

Read it top to bottom as a chain of connections: start with customers, connect to their orders, connect each order to its line items, connect each line item to its product. By the time you reach \`WHERE\`, every row represents one specific product purchased by one specific customer — filterable and groupable just like any single table.

## Combining With GROUP BY

**Business question:** "How much has each customer spent, total, across all their orders?"

\`\`\`sql
SELECT c.first_name, c.last_name, SUM(oi.quantity * oi.unit_price) AS total_spent
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY c.customer_id
ORDER BY total_spent DESC;
\`\`\`

This is exactly last week's "top spending customers" query — multi-table joins and \`GROUP BY\` combine constantly in real analyst work.

## Try It

Write a query showing total revenue per product category, joining \`order_items\` to \`products\`.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Calculate total spending per customer, and total revenue per product category.", code: `${SETUP}
run_sql("""
SELECT c.first_name, c.last_name, SUM(oi.quantity * oi.unit_price) AS total_spent
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY c.customer_id
ORDER BY total_spent DESC;
""")

run_sql("""
SELECT p.category, SUM(oi.quantity * oi.unit_price) AS category_revenue
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.product_id
GROUP BY p.category
ORDER BY category_revenue DESC;
""")
` },
    ]);
    console.log(`✓ Joining Three or More Tables (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Subqueries with IN");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is a Subquery?

A **subquery** is a complete query nested inside another query — used when you need to answer a smaller question first, in order to answer the bigger one.

**Business question:** "Which customers have placed at least one order?"

You already know a \`JOIN\` can answer this — but a subquery offers another, often clearer, way:

\`\`\`sql
SELECT first_name, last_name
FROM customers
WHERE customer_id IN (
    SELECT customer_id FROM orders
);
\`\`\`

## Query Walkthrough

The **inner query** (\`SELECT customer_id FROM orders\`) runs first, producing a list of every customer_id that has placed an order. The **outer query** then checks: "is this customer's ID \`IN\` that list?"

## Subqueries Are Just Queries

Try running the inner query by itself — \`SELECT customer_id FROM orders;\` — and you'll see exactly the list the outer query is checking against. This is the key to understanding (and debugging) any subquery: it's just a normal, complete query that happens to be nested inside another one.

## Try It

Write a query finding products that have **never** been purchased, using \`NOT IN\` with a subquery on \`order_items\`.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Find customers who've ordered using IN, and products never purchased using NOT IN.", code: `${SETUP}
run_sql("""
SELECT first_name, last_name
FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders);
""")

run_sql("""
SELECT product_name
FROM products
WHERE product_id NOT IN (SELECT product_id FROM order_items);
""")
` },
    ]);
    console.log(`✓ Subqueries with IN (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Scalar Subqueries");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Scalar Subqueries: A Subquery Returning One Value

A **scalar subquery** returns exactly one single value — perfect for comparing against.

**Business question:** "Which products are priced above the average product price?"

\`\`\`sql
SELECT product_name, price
FROM products
WHERE price > (
    SELECT AVG(price) FROM products
);
\`\`\`

The inner query \`SELECT AVG(price) FROM products\` returns one number — the average price across all products. The outer query then compares every product's price against that single value.

## Why Not Just Calculate It Yourself and Type in the Number?

You could — but a subquery stays correct automatically if the underlying data changes (a new product added, a price updated). Hardcoding a number means your query silently becomes wrong the moment the data does. This is a genuinely important habit: let SQL calculate values it can calculate, rather than typing in numbers you computed by hand.

## Another Example

**Business question:** "Which customers signed up after the very first customer?"

\`\`\`sql
SELECT first_name, last_name, signup_date
FROM customers
WHERE signup_date > (
    SELECT MIN(signup_date) FROM customers
);
\`\`\`

## Try It

Write a query finding products priced *below* the average product price.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Find products above and below the average price using scalar subqueries.", code: `${SETUP}
run_sql("""
SELECT product_name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);
""")

run_sql("""
SELECT product_name, price
FROM products
WHERE price < (SELECT AVG(price) FROM products);
""")
` },
    ]);
    console.log(`✓ Scalar Subqueries (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Advanced Data Detective");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🕵️ Advanced Data Detective

Increasingly difficult business questions, combining joins, grouping, and subqueries.

## Your Tasks

1. Which customers have spent more than $100 in total? (join + \`GROUP BY\` + \`HAVING\`)
2. Which products have never been ordered? (subquery with \`NOT IN\`)
3. Which orders have a total_amount above the average order total_amount? (scalar subquery)
4. Which customers are from the same province as customer_id 1? (subquery: first find customer 1's province, then match others against it)
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Work through the 4 Advanced Data Detective tasks above.",
        code: `${SETUP}
# Task 1: Customers who've spent more than $100 total


# Task 2: Products never ordered


# Task 3: Orders above the average order total_amount


# Task 4: Customers from the same province as customer_id 1

`,
      },
    ]);
    console.log(`✓ Lab: Advanced Data Detective (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Above-Average Spenders");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🕵️ Challenge: Above-Average Spenders

## Requirements

Find customers whose **total spending** (summed across all their orders, via \`order_items\`) is above the **average total spending across all customers**.

This requires combining everything from this module: a multi-table join, \`GROUP BY\` to get each customer's total, and a subquery to calculate the average of those totals.

## Hint

You'll likely need a subquery that itself contains a \`GROUP BY\` — calculate each customer's total first (as a subquery), then average *that*.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Find customers spending above the average customer's total spending.",
        code: `${SETUP}
run_sql("""
SELECT c.first_name, c.last_name, SUM(oi.quantity * oi.unit_price) AS total_spent
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY c.customer_id
HAVING SUM(oi.quantity * oi.unit_price) > (
    SELECT AVG(customer_total)
    FROM (
        SELECT SUM(oi2.quantity * oi2.unit_price) AS customer_total
        FROM orders o2
        INNER JOIN order_items oi2 ON o2.order_id = oi2.order_id
        GROUP BY o2.customer_id
    )
)
ORDER BY total_spent DESC;
""")
`,
      },
    ]);
    console.log(`✓ Challenge: Above-Average Spenders (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 7 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What is a subquery?", options: ["A query that runs after the main one finishes", "A complete query nested inside another query", "A type of JOIN", "An invalid SQL construct"], correct_index: 1, explanation: "A subquery is a full query embedded inside another query." },
      { question_text: "In WHERE customer_id IN (SELECT customer_id FROM orders), which part runs first?", options: ["The outer query", "The inner query (the subquery)", "They run at the same time", "Neither runs"], correct_index: 1, explanation: "The inner subquery is evaluated first, producing the list the outer query then checks against." },
      { question_text: "What is a scalar subquery?", options: ["A subquery that returns multiple rows", "A subquery that returns exactly one single value", "A subquery that can't be used with WHERE", "A subquery only for text data"], correct_index: 1, explanation: "A scalar subquery returns a single value, making it usable in comparisons like > or =." },
      { question_text: "Why use a subquery like (SELECT AVG(price) FROM products) instead of typing in the average price you calculated by hand?", options: ["It's exactly the same either way", "The subquery stays correct automatically if the data changes; a hardcoded number can silently become wrong", "Subqueries are required by SQL syntax", "Hardcoded numbers run faster"], correct_index: 1, explanation: "A subquery recalculates automatically; a hardcoded value doesn't update when the underlying data changes." },
      { question_text: "What does WHERE product_id NOT IN (SELECT product_id FROM order_items) find?", options: ["Products that HAVE been ordered", "Products that have NEVER been ordered", "All products", "An error"], correct_index: 1, explanation: "NOT IN with this subquery excludes any product_id that appears in order_items, leaving only never-ordered products." },
      { question_text: "Can you run a subquery by itself, separately, to see what it returns?", options: ["No, subqueries only work nested", "Yes — a subquery is just a normal, complete query, and running it alone is a great debugging technique", "Only scalar subqueries can run alone", "Only IN subqueries can run alone"], correct_index: 1, explanation: "A subquery is a full query in its own right — running it alone is one of the best ways to understand or debug it." },
      { question_text: "When chaining 3+ JOINs together, what does each additional JOIN...ON pair do?", options: ["Starts a completely separate query", "Connects one more table into the existing chain of connected rows", "Removes a table from the result", "Sorts the result"], correct_index: 1, explanation: "Each additional JOIN connects another table into the growing chain of related rows." },
      { question_text: "What does WHERE price > (SELECT AVG(price) FROM products) do?", options: ["Finds products priced exactly at the average", "Finds products priced above the calculated average price", "Causes an error since subqueries can't be compared with >", "Finds all products regardless of price"], correct_index: 1, explanation: "This compares each product's price against the single average value the subquery calculates." },
      { question_text: "Can a subquery itself contain a GROUP BY?", options: ["No, never", "Yes — a subquery can be any valid query, including one with GROUP BY", "Only in the outer query, never in a subquery", "Only with INNER JOIN"], correct_index: 1, explanation: "A subquery can contain anything a normal query can, including GROUP BY, JOINs, and its own subqueries." },
      { question_text: "What real business question requires a subquery rather than a simple WHERE with a fixed number?", options: ["Find customers from Toronto", "Find customers who spent more than the average customer (the average must be calculated from the data itself)", "Find products under $10", "Sort customers alphabetically"], correct_index: 1, explanation: "Comparing against a calculated value (like an average) that depends on the data itself is exactly what a subquery is for." },
    ]);
    console.log(`✓ Module 7 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 7 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Chaining 3+ \`JOIN\`s to connect the full relationship chain
- Subqueries with \`IN\`/\`NOT IN\` — a query nested inside another
- Scalar subqueries — a subquery returning one value, used for comparisons
- Why calculating values with a subquery beats hardcoding numbers by hand
- You found above-average spending customers using joins, grouping, and a nested subquery

## Coming Up Next Week

Everything so far has only *read* data. Next week you'll learn to add, change, and remove data with \`INSERT\`, \`UPDATE\`, and \`DELETE\` — and why these commands demand real caution. 🛠️
`);
    console.log(`✓ Module 7 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 7 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
