/**
 * Populates Module 9 — Advanced Querying, CASE & Data Analysis (Week 9).
 * Run with: npx ts-node prisma/enrich-szth-module9.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 9";
const SETUP = dataMartSetup(["customers", "products", "orders", "order_items"]);

async function main() {
  console.log("🌱  Populating Module 9…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 9 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Mission: Think Like a SQL Analyst

This week is a toolbox of the techniques real analysts reach for constantly: conditional logic inside a query, organizing complex queries with \`WITH\`, and ranking results.

## This Week You'll Learn To

- Add conditional logic directly into a query with \`CASE\`
- Organize a complex query with a common table expression (\`WITH\`)
- Rank rows with basic window functions: \`ROW_NUMBER()\` and \`RANK()\`
- Debug broken SQL methodically

## Why This Matters

"Categorize each order as Small, Medium, or Large" and "show me the top 3 products per category" are both extremely common real requests — and both need exactly what this week teaches.
`);
    console.log(`✓ Week 9 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "CASE: Conditional Logic in SQL");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Adding Conditional Logic to a Query

**Business question:** "Categorize each product as Budget, Mid-Range, or Premium based on price."

\`\`\`sql
SELECT
    product_name,
    price,
    CASE
        WHEN price < 30 THEN 'Budget'
        WHEN price < 80 THEN 'Mid-Range'
        ELSE 'Premium'
    END AS price_tier
FROM products;
\`\`\`

## Query Walkthrough

\`CASE\` checks each \`WHEN\` condition in order, top to bottom, and returns the value after the **first** one that's true. \`ELSE\` catches anything that didn't match any \`WHEN\`. \`END\` closes the \`CASE\` expression, and (like any expression) you can alias it with \`AS\`.

## CASE Inside an Aggregate

\`\`\`sql
SELECT
    SUM(CASE WHEN status = 'Completed' THEN total_amount ELSE 0 END) AS completed_revenue,
    SUM(CASE WHEN status = 'Pending' THEN total_amount ELSE 0 END) AS pending_revenue
FROM orders;
\`\`\`

This powerful pattern — \`CASE\` inside \`SUM()\` — calculates multiple conditional totals in a single row, without needing separate \`GROUP BY\` queries.

## Try It

Write a query classifying customers as \`'Early Adopter'\` (signed up before \`'2023-03-01'\`) or \`'Recent'\` (signed up on or after that date).
`);
    await attachLab(prisma, l.id, [
      { instructions: "Classify products into price tiers, and customers into signup periods.", code: `${SETUP}
run_sql("""
SELECT product_name, price,
    CASE
        WHEN price < 30 THEN 'Budget'
        WHEN price < 80 THEN 'Mid-Range'
        ELSE 'Premium'
    END AS price_tier
FROM products;
""")

run_sql("""
SELECT first_name, last_name, signup_date,
    CASE
        WHEN signup_date < '2023-03-01' THEN 'Early Adopter'
        ELSE 'Recent'
    END AS customer_segment
FROM customers;
""")
` },
    ]);
    console.log(`✓ CASE: Conditional Logic in SQL (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Common Table Expressions with WITH");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Is a Common Table Expression?

A **common table expression** (CTE), written with \`WITH\`, lets you name a subquery and reuse it — turning a complicated nested query into a clear sequence of readable steps.

**Business question:** "Which customers spent above the average customer total?" — the same question from last week's challenge, rewritten with \`WITH\`:

\`\`\`sql
WITH customer_totals AS (
    SELECT c.customer_id, c.first_name, c.last_name,
           SUM(oi.quantity * oi.unit_price) AS total_spent
    FROM customers c
    INNER JOIN orders o ON c.customer_id = o.customer_id
    INNER JOIN order_items oi ON o.order_id = oi.order_id
    GROUP BY c.customer_id
)
SELECT first_name, last_name, total_spent
FROM customer_totals
WHERE total_spent > (SELECT AVG(total_spent) FROM customer_totals);
\`\`\`

## Why This Reads Better Than a Nested Subquery

Compare this to last week's version, where the same "customer totals" subquery had to be written out **twice** (once in the main query, once inside the averaging subquery). With \`WITH\`, you define \`customer_totals\` once, by name, and reference it as many times as you need — much easier to read, and much easier to fix if something's wrong.

## The General Shape

\`\`\`sql
WITH name_you_choose AS (
    -- any complete query goes here
)
SELECT ...
FROM name_you_choose
-- treat it exactly like a real table from here on
\`\`\`

## Try It

Rewrite a query using \`WITH\` to first calculate each product category's total revenue, then select just the categories earning over $100.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Use WITH to name a category-revenue calculation, then filter it.", code: `${SETUP}
run_sql("""
WITH category_revenue AS (
    SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue
    FROM order_items oi
    INNER JOIN products p ON oi.product_id = p.product_id
    GROUP BY p.category
)
SELECT category, revenue
FROM category_revenue
WHERE revenue > 100
ORDER BY revenue DESC;
""")
` },
    ]);
    console.log(`✓ Common Table Expressions with WITH (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Window Functions: ROW_NUMBER and RANK");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Window Functions Do Differently

Unlike \`GROUP BY\`, which collapses many rows into one summary row per group, a **window function** calculates something across a set of related rows **while still showing every individual row**.

## \`ROW_NUMBER()\`: Number Each Row

**Business question:** "Rank products from most to least expensive, showing every product."

\`\`\`sql
SELECT
    product_name,
    price,
    ROW_NUMBER() OVER (ORDER BY price DESC) AS price_rank
FROM products;
\`\`\`

- \`OVER (ORDER BY price DESC)\` — this is the "window": order all rows by price, then number them 1, 2, 3... in that order
- Every product still appears as its own row — unlike \`GROUP BY\`, nothing is collapsed

## \`RANK()\`: Like ROW_NUMBER, But Handles Ties

\`\`\`sql
SELECT
    product_name,
    price,
    RANK() OVER (ORDER BY price DESC) AS price_rank
FROM products;
\`\`\`

If two products are tied at the exact same price, \`ROW_NUMBER()\` would arbitrarily give them different numbers, while \`RANK()\` gives tied rows the *same* rank — and then skips the next number (e.g., two rows tied for rank 2 means the next row is rank 4, not 3).

## Windowing "Within Groups" With PARTITION BY

**Business question:** "Rank products by price, separately within each category."

\`\`\`sql
SELECT
    product_name,
    category,
    price,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rank_in_category
FROM products;
\`\`\`

\`PARTITION BY category\` restarts the numbering fresh for each category — a genuinely powerful pattern (e.g. "top product per category") that's difficult to express any other way.

## Try It

Use \`RANK()\` to rank customers by their \`signup_date\`, earliest first.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Rank products overall, then within each category using PARTITION BY.", code: `${SETUP}
run_sql("""
SELECT product_name, price,
    ROW_NUMBER() OVER (ORDER BY price DESC) AS price_rank
FROM products;
""")

run_sql("""
SELECT product_name, category, price,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rank_in_category
FROM products;
""")
` },
    ]);
    console.log(`✓ Window Functions (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: SQL Analyst Challenge");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📊 SQL Analyst Challenge

Produce genuine business insights combining everything from this module.

## Your Tasks

1. Classify every order as \`'Small'\` (under $50), \`'Medium'\` ($50-$150), or \`'Large'\` (over $150) using \`CASE\`
2. Using \`WITH\`, calculate each product's total revenue, then show only products in the top half by revenue (above the median-ish — use \`> (SELECT AVG(...) FROM ...)\` as a reasonable stand-in)
3. Find the single top-selling product **within each category**, using \`ROW_NUMBER()\` with \`PARTITION BY\` and filtering to rank 1
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Work through the 3 SQL Analyst Challenge tasks above.",
        code: `${SETUP}
# Task 1: Classify orders as Small/Medium/Large


# Task 2: Products with above-average revenue, using WITH


# Task 3: Top-selling product per category, using ROW_NUMBER + PARTITION BY

`,
      },
    ]);
    console.log(`✓ Lab: SQL Analyst Challenge (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Debugging Challenge");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Debugging Challenge

Four broken queries. For each: read the error, understand why, fix it, and confirm it runs.

## Mystery 1: Missing GROUP BY

\`\`\`sql
SELECT category, price FROM products GROUP BY category;
-- Error: price isn't aggregated and isn't in GROUP BY
\`\`\`

## Mystery 2: WHERE With an Aggregate

\`\`\`sql
SELECT category, COUNT(*) FROM products GROUP BY category WHERE COUNT(*) > 2;
-- Error: WHERE can't use an aggregate — needs HAVING
\`\`\`

## Mystery 3: Ambiguous Column After a JOIN

\`\`\`sql
SELECT customer_id FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id;
-- Error: customer_id exists on both tables — ambiguous which one is meant
\`\`\`

## Mystery 4: Comparing to NULL With =

\`\`\`sql
SELECT * FROM customers WHERE city = NULL;
-- No error, but silently wrong — always returns zero rows
\`\`\`

## Your Task

Fix all four in the lab below, and for each, be ready to explain **why** the original was wrong, not just what the fix was.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Each mystery below is broken or silently wrong. Fix each one and confirm it runs correctly.",
        code: `${SETUP}
# Mystery 1: Fixed — either aggregate price or add it to GROUP BY
run_sql("""
SELECT category, AVG(price) AS avg_price FROM products GROUP BY category;
""")

# Mystery 2: Fixed — use HAVING, not WHERE, to filter on an aggregate
run_sql("""
SELECT category, COUNT(*) AS num_products FROM products GROUP BY category HAVING COUNT(*) > 2;
""")

# Mystery 3: Fixed — qualify the ambiguous column with a table alias
run_sql("""
SELECT c.customer_id FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id;
""")

# Mystery 4: Fixed — use IS NULL, not = NULL
run_sql("""
SELECT * FROM customers WHERE city IS NULL;
""")
`,
      },
    ]);
    console.log(`✓ Debugging Challenge (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 9 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What does CASE WHEN price < 30 THEN 'Budget' ELSE 'Premium' END do?", options: ["Deletes rows where price >= 30", "Returns 'Budget' or 'Premium' for each row based on the condition", "Causes an error", "Only works with GROUP BY"], correct_index: 1, explanation: "CASE evaluates the condition per row and returns the matching value." },
      { question_text: "In a CASE expression with multiple WHEN clauses, which one is used?", options: ["The last one that matches", "The first one that matches, evaluated top to bottom", "A random one", "All of them combined"], correct_index: 1, explanation: "CASE checks WHEN clauses in order and uses the first one that's true." },
      { question_text: "What does a WITH clause (common table expression) let you do?", options: ["Delete multiple tables at once", "Name a subquery so it can be referenced clearly, possibly multiple times", "Create a permanent new table", "Run two databases simultaneously"], correct_index: 1, explanation: "WITH names a subquery, letting you reference it by name instead of repeating or deeply nesting it." },
      { question_text: "How does a window function like ROW_NUMBER() differ from GROUP BY?", options: ["They are identical", "GROUP BY collapses rows into one per group; a window function keeps every row while still calculating across related rows", "Window functions can't use ORDER BY", "GROUP BY is only for text columns"], correct_index: 1, explanation: "Window functions calculate across a set of rows without collapsing them — every original row still appears." },
      { question_text: "What does PARTITION BY category do inside a window function?", options: ["Deletes all other categories", "Restarts the window function's calculation separately within each category", "Sorts alphabetically", "Filters out empty categories"], correct_index: 1, explanation: "PARTITION BY resets the window function per group, e.g. numbering restarts at 1 for each category." },
      { question_text: "What's the key difference between ROW_NUMBER() and RANK() when there's a tie?", options: ["They behave identically", "RANK() gives tied rows the same rank and skips the next number; ROW_NUMBER() always assigns distinct numbers", "ROW_NUMBER() can't handle ties at all", "RANK() ignores ties completely"], correct_index: 1, explanation: "RANK() gives equal ranks to ties (and skips ahead); ROW_NUMBER() always assigns a unique, arbitrary order among ties." },
      { question_text: "Why does SELECT category, price FROM products GROUP BY category; cause a problem?", options: ["category doesn't exist", "price isn't aggregated and isn't part of the GROUP BY, so SQL doesn't know which price to show per group", "GROUP BY requires exactly one column", "It's not actually a problem"], correct_index: 1, explanation: "Non-aggregated columns not in GROUP BY create ambiguity about which single value to display per group." },
      { question_text: "Why does customer_id become ambiguous after joining customers and orders?", options: ["It's a reserved word", "Both tables have a column named customer_id, so SQL doesn't know which table's value you mean without qualifying it", "customer_id doesn't exist on either table", "JOINs always cause ambiguous columns"], correct_index: 1, explanation: "When both joined tables share a column name, you must qualify it with a table alias (e.g. c.customer_id) to disambiguate." },
      { question_text: "What is the correct debugging process taught throughout this course?", options: ["Guess randomly", "Read -> Understand -> Fix -> Test -> Verify", "Delete the query and start completely over every time", "Ask someone else to fix it"], correct_index: 1, explanation: "This structured process — reading the error, understanding it, fixing it, testing, and verifying — is the core SQL debugging skill." },
      { question_text: "What does SUM(CASE WHEN status = 'Completed' THEN total_amount ELSE 0 END) calculate?", options: ["Total revenue from all orders regardless of status", "Total revenue only from Completed orders, in a single aggregate expression", "The count of Completed orders", "An error — CASE can't be used inside SUM()"], correct_index: 1, explanation: "This pattern sums total_amount only for Completed rows (treating everything else as 0), all within one aggregate." },
    ]);
    console.log(`✓ Module 9 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 9 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- \`CASE\` adds conditional, per-row logic directly into a query
- \`WITH\` (common table expressions) name a subquery for clarity and reuse
- Window functions (\`ROW_NUMBER()\`, \`RANK()\`) calculate across related rows without collapsing them, unlike \`GROUP BY\`
- \`PARTITION BY\` restarts a window function's calculation within each group
- You fixed four genuinely broken queries using a structured debugging process

## Coming Up Next Week

This is it — the final week. Every skill from the last nine weeks comes together in a real capstone business analysis you design and carry out yourself. 🏆
`);
    console.log(`✓ Module 9 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 9 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
