/**
 * Populates Module 10 — SQL Capstone: Solve a Real Business Problem (Week 10).
 * Run with: npx ts-node prisma/enrich-szth-module10.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, findSublesson, writeLessonContent, attachLab, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 10";
const SETUP = dataMartSetup(["customers", "products", "orders", "order_items"]);

async function main() {
  console.log("🌱  Populating Module 10 (Capstone)…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Welcome to Your Capstone");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🏆 You've Arrived at Week 10

Nine weeks ago you wrote your first \`SELECT * FROM customers;\`. Since then you've filtered, sorted, grouped, joined four tables together, written subqueries, and debugged broken SQL like a real analyst. This week, all of it comes together.

## What a Capstone Is (and Isn't)

This is **not** a new topic to learn. There is nothing new in this module. It's a chance to prove — to yourself, mostly — that you can take a vague, real-world business question and turn it into a precise, working SQL query, entirely on your own.

## How This Week Works

1. **Review** everything you've learned, module by module
2. Learn a repeatable **process** for turning a business question into SQL
3. Read **the capstone scenario** — a realistic ask from "DataMart's leadership team"
4. Work through **five guided stages**, each answering one real business question using the full DataMart database
5. Wrap up with **a final deliverable** — a short written summary of your findings, like a real analyst would hand to a manager

Take your time this week. There's no new material competing for your attention — just you, the database, and everything you already know.
`);
    console.log(`✓ Welcome to Your Capstone (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Review: Everything You've Learned");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Your SQL Toolkit, Module by Module

**Module 1 — Foundations**
\`SELECT\`, \`FROM\` — the two words every query starts with.

**Module 2 — Filtering & Sorting**
\`WHERE\`, \`ORDER BY\`, \`DISTINCT\` — narrow down and organize results.

**Module 3 — Advanced Filtering**
\`AND\`/\`OR\`/\`NOT\`, \`IN\`, \`BETWEEN\`, \`LIKE\`, \`IS NULL\` — precise, real-world conditions.

**Module 4 — Calculations**
Aliases, arithmetic in \`SELECT\`, aggregate functions (\`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`), string/date functions.

**Module 5 — Grouping**
\`GROUP BY\` to summarize data by category, \`HAVING\` to filter those summaries.

**Module 6 — Joining Tables**
\`INNER JOIN\`, \`LEFT JOIN\`, \`RIGHT JOIN\`/\`FULL OUTER JOIN\` — connecting related tables.

**Module 7 — Complex Queries**
Joining 3+ tables, subqueries with \`IN\`, scalar subqueries.

**Module 8 — Changing Data**
\`INSERT\`, \`UPDATE\`, \`DELETE\` — modifying, not just reading, data.

**Module 9 — Analyst Techniques**
\`CASE\` for conditional logic, \`WITH\` (CTEs) for readable complex queries, window functions (\`ROW_NUMBER()\`, \`RANK()\`).

## The Big Picture

Every one of these building blocks fits into one general query shape:

\`\`\`sql
SELECT columns/calculations
FROM table(s)
[JOIN other tables]
[WHERE row-level conditions]
[GROUP BY grouping columns]
[HAVING group-level conditions]
[ORDER BY sort columns];
\`\`\`

Not every query needs every clause — but when a clause is present, it belongs roughly in this order. Keep this shape in mind all week.
`);
    console.log(`✓ Review: Everything You've Learned (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "From Business Question to Insight");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Process Real Analysts Use

Business people rarely hand you SQL. They hand you a question in plain English, often a vague one. Turning that into a correct query is a repeatable process:

### Step 1: Restate the Question Precisely

*"How are sales doing?"* is too vague to query. Rephrase it into something specific and measurable: *"What is the total revenue by product category, for completed orders only?"*

### Step 2: Identify the Tables You Need

Which tables hold the data this question needs? For "revenue by category," you need \`products\` (for category) and \`order_items\` (for revenue) — and possibly \`orders\`, if you need to filter by status.

### Step 3: Identify the Connections

If you need more than one table, how do they relate? \`order_items.product_id\` connects to \`products.product_id\`. This tells you your \`JOIN\`.

### Step 4: Identify Filtering, Grouping, and Sorting

- Do you need to filter rows first (\`WHERE\`)?
- Do you need to summarize by some category (\`GROUP BY\`)?
- Do you need to filter the summary (\`HAVING\`)?
- How should the final result be ordered (\`ORDER BY\`)?

### Step 5: Write, Run, Read, Refine

Write a first attempt. Run it. Read the actual output critically — does it actually answer the question you restated in Step 1? If not, that's a clue about what to fix, not a failure.

### Worked Example

**Business question:** "Which customers have never placed an order?"

1. Restated: "List customers with zero rows in \`orders\`."
2. Tables: \`customers\`, \`orders\`.
3. Connection: \`customers.customer_id = orders.customer_id\`.
4. This needs a \`LEFT JOIN\` (keep all customers) and a \`WHERE orders.order_id IS NULL\` (keep only the ones with no match).
5. \`\`\`sql
   SELECT c.first_name, c.last_name
   FROM customers c
   LEFT JOIN orders o ON c.customer_id = o.customer_id
   WHERE o.order_id IS NULL;
   \`\`\`

You'll use exactly this process for every stage of the capstone ahead.
`);
    console.log(`✓ From Business Question to Insight (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "The Capstone Scenario");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📋 Your Assignment

You've just joined **DataMart** — the same fictional e-commerce company whose database you've been querying all course — as a junior data analyst. It's your first week, and the leadership team has sent over a list of questions before their quarterly planning meeting.

## The Database You Already Know

- **customers** — who shops at DataMart
- **products** — what DataMart sells, and at what price
- **orders** — every order placed, with its status and total
- **order_items** — the individual line items inside each order

## The Capstone Lab Ahead

The next lesson, **Capstone Lab: Analyze DataMart**, is broken into five stages, each a real question leadership actually asked:

1. **Customer Analysis** — Who are DataMart's customers, and where are they from?
2. **Product Analysis** — What's selling, and what isn't?
3. **Sales Analysis** — How is revenue trending, and where is it coming from?
4. **Performance Analysis** — Who are the standout customers and products?
5. **Final Deliverable** — Summarize your findings like a real analyst would

## How to Approach It

For each stage, use the 5-step process from the last lesson: restate the question, identify tables, identify connections, identify filtering/grouping/sorting, then write-run-read-refine. Nothing in the capstone requires SQL beyond what you've already learned — the challenge is entirely in applying it independently.

Good luck. Leadership is waiting. 🚀
`);
    console.log(`✓ The Capstone Scenario (${blocks} blocks)`);
  }

  const parent = await findLesson(prisma, SLUG, MOD, "Capstone Lab: Analyze DataMart");
  await writeLessonContent(prisma, parent.id, `
## 🏆 Capstone Lab: Analyze DataMart

Work through all five stages below, in order. Each stage is its own sublesson with its own business questions and its own lab. Use the process from "From Business Question to Insight" for every single one.

1. **Customer Analysis** — who are DataMart's customers?
2. **Product Analysis** — what's selling?
3. **Sales Analysis** — how is revenue trending?
4. **Performance Analysis** — who/what stands out?
5. **Final Deliverable** — write up your findings

Open each stage below to continue.
`);
  console.log(`✓ Capstone Lab: Analyze DataMart (parent overview)`);

  {
    const s = await findSublesson(prisma, SLUG, MOD, "Capstone Lab: Analyze DataMart", "Customer Analysis");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 1: Customer Analysis

Leadership's questions:

1. How many customers does DataMart have, broken down by province?
2. Which customers have never placed an order? (leadership wants to send them a discount code)
3. Which city has the most customers?

Work through the 5-step process for each question before writing SQL.
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "Answer all 3 Customer Analysis questions from leadership. A model answer for Question 1 is filled in — write Questions 2 and 3 yourself using the same pattern.",
        code: `${SETUP}
# Question 1: Customers by province (model answer)
run_sql("""
SELECT province, COUNT(*) AS num_customers
FROM customers
GROUP BY province
ORDER BY num_customers DESC;
""")

# Question 2: Customers who have never placed an order
run_sql("""
SELECT first_name, last_name
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_id IS NULL;
""")

# Question 3: City with the most customers
run_sql("""
SELECT city, COUNT(*) AS num_customers
FROM customers
GROUP BY city
ORDER BY num_customers DESC
LIMIT 1;
""")
`,
      },
    ]);
    console.log(`✓ Sublesson: Customer Analysis (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, "Capstone Lab: Analyze DataMart", "Product Analysis");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 2: Product Analysis

Leadership's questions:

1. What's the average price of a product, broken down by category?
2. Which products have never been ordered? (leadership is considering discontinuing them)
3. Classify every product as \`'Budget'\` (under $30), \`'Mid-Range'\` ($30-$80), or \`'Premium'\` (over $80) using \`CASE\`

No model answer this time — you've done this exact type of question multiple times this course. Restate each question, identify the tables and connections, then write the SQL.
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "Answer all 3 Product Analysis questions from leadership.",
        code: `${SETUP}
# Question 1: Average price by category
run_sql("""
SELECT category, AVG(price) AS avg_price
FROM products
GROUP BY category
ORDER BY avg_price DESC;
""")

# Question 2: Products never ordered
run_sql("""
SELECT p.product_name
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
WHERE oi.order_item_id IS NULL;
""")

# Question 3: Products classified into price tiers with CASE
run_sql("""
SELECT product_name, price,
    CASE
        WHEN price < 30 THEN 'Budget'
        WHEN price < 80 THEN 'Mid-Range'
        ELSE 'Premium'
    END AS price_tier
FROM products
ORDER BY price;
""")
`,
      },
    ]);
    console.log(`✓ Sublesson: Product Analysis (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, "Capstone Lab: Analyze DataMart", "Sales Analysis");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 3: Sales Analysis

Leadership's questions:

1. What is total revenue, counting only \`'Completed'\` orders? (use \`order_items\` — quantity × unit_price — not \`orders.total_amount\`, since leadership wants revenue built from actual line items)
2. How many orders fall into each status (\`'Completed'\`, \`'Pending'\`, \`'Cancelled'\`)?
3. What is total revenue by product category, for completed orders only? This one needs a join across three tables.

Think carefully about which tables Question 3 needs before writing it.
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "Answer all 3 Sales Analysis questions from leadership.",
        code: `${SETUP}
# Question 1: Total completed revenue, from order_items
run_sql("""
SELECT SUM(oi.quantity * oi.unit_price) AS total_completed_revenue
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'Completed';
""")

# Question 2: Order counts by status
run_sql("""
SELECT status, COUNT(*) AS num_orders
FROM orders
GROUP BY status;
""")

# Question 3: Completed revenue by product category (3-table join)
run_sql("""
SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.status = 'Completed'
GROUP BY p.category
ORDER BY revenue DESC;
""")
`,
      },
    ]);
    console.log(`✓ Sublesson: Sales Analysis (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, "Capstone Lab: Analyze DataMart", "Performance Analysis");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 4: Performance Analysis

Leadership's questions — the hardest of the capstone, combining several modules' techniques:

1. Who are DataMart's top 3 customers by total spend (completed orders only)?
2. Using a \`WITH\` clause, find customers who spent above the average completed-order customer total
3. Using \`ROW_NUMBER()\` with \`PARTITION BY\`, find the single best-selling product **within each category** (by total quantity sold)

Take these one at a time. Question 3 in particular is worth re-reading Module 9's window functions lesson for if you get stuck.
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "Answer all 3 Performance Analysis questions from leadership.",
        code: `${SETUP}
# Question 1: Top 3 customers by completed-order spend
run_sql("""
SELECT c.first_name, c.last_name, SUM(oi.quantity * oi.unit_price) AS total_spent
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.status = 'Completed'
GROUP BY c.customer_id
ORDER BY total_spent DESC
LIMIT 3;
""")

# Question 2: Customers spending above average, using WITH
run_sql("""
WITH customer_totals AS (
    SELECT c.customer_id, c.first_name, c.last_name,
           SUM(oi.quantity * oi.unit_price) AS total_spent
    FROM customers c
    INNER JOIN orders o ON c.customer_id = o.customer_id
    INNER JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.status = 'Completed'
    GROUP BY c.customer_id
)
SELECT first_name, last_name, total_spent
FROM customer_totals
WHERE total_spent > (SELECT AVG(total_spent) FROM customer_totals)
ORDER BY total_spent DESC;
""")

# Question 3: Best-selling product per category, using ROW_NUMBER + PARTITION BY
run_sql("""
WITH product_sales AS (
    SELECT p.product_name, p.category, SUM(oi.quantity) AS units_sold
    FROM order_items oi
    INNER JOIN products p ON oi.product_id = p.product_id
    GROUP BY p.product_id
),
ranked AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY units_sold DESC) AS rnk
    FROM product_sales
)
SELECT product_name, category, units_sold
FROM ranked
WHERE rnk = 1;
""")
`,
      },
    ]);
    console.log(`✓ Sublesson: Performance Analysis (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, "Capstone Lab: Analyze DataMart", "Final Deliverable");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 5: Final Deliverable

## Write Your Summary

Real analysts don't just hand over query results — they hand over **insight**. Based on everything you found in Stages 1-4, write a short summary (a few sentences is plenty) covering:

- One interesting fact about DataMart's customers
- One interesting fact about DataMart's products
- One recommendation for leadership, backed by a specific number from your queries

## Example (Don't Copy — Use Your Own Numbers)

> "DataMart's customer base is concentrated in Ontario, with Toronto alone accounting for 3 of our 10 customers. Electronics is our highest-revenue completed-order category. I'd recommend leadership investigate a discount code for the 1-2 customers who have never ordered, since they're already in our database and easy to re-target."

## You're Done

There's no lab to run here — this stage is about turning query results into a written recommendation, the actual final step of real analyst work. When you're happy with your summary, move on to the course conclusion.
`);
    console.log(`✓ Sublesson: Final Deliverable (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Course Conclusion: SQL Beginner to SQL Hero");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🎉 From SQL Beginner to SQL Hero

Ten weeks ago, "database" might have just meant "a spreadsheet, but bigger." Now you can look at a real relational database with four connected tables and answer genuinely hard business questions about it, on your own, using a language that runs identically on nearly every serious database system in the world.

## Everything You Can Now Do

- Write \`SELECT\` queries filtering, sorting, and searching data precisely
- Summarize data with \`GROUP BY\` and \`HAVING\`
- Join multiple related tables together, in every direction (\`INNER\`, \`LEFT\`, \`RIGHT\`/\`FULL OUTER\`)
- Write subqueries and common table expressions to break complex questions into clear steps
- Modify data safely with \`INSERT\`, \`UPDATE\`, and \`DELETE\`
- Use \`CASE\` for conditional logic and window functions for ranking
- Debug broken SQL methodically instead of guessing
- Turn a vague business question into precise, correct SQL — independently

## A Note on SQLite vs. PostgreSQL

Every lab in this course ran on SQLite, a genuine, fully relational SQL database, so every query you wrote actually executed for real. In a professional PostgreSQL environment, the SQL you've learned works virtually unchanged — a handful of function names differ (e.g. PostgreSQL's \`EXTRACT()\` where SQLite used \`strftime()\`), but the core language — \`SELECT\`, \`JOIN\`, \`GROUP BY\`, subqueries, \`CASE\`, window functions — is standard SQL you'll recognize immediately.

## Where to Go From Here

- Explore a free PostgreSQL sandbox to see the small dialect differences firsthand
- Look for a public dataset that interests you and practice asking it your own questions
- Revisit "Python for Beginners: From Zero to Hero" if you haven't already — SQL and Python together are one of the most in-demand combinations in data work

You went from zero to SQL hero. Congratulations. 🏆
`);
    console.log(`✓ Course Conclusion (${blocks} blocks)`);
  }

  console.log("\n✅  Module 10 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
