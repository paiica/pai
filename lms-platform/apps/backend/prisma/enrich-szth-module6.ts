/**
 * Populates Module 6 — JOINs: Connecting Tables (Week 6).
 * Run with: npx ts-node prisma/enrich-szth-module6.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 6";
const SETUP = dataMartSetup(["customers", "products", "orders", "order_items"]);

async function main() {
  console.log("🌱  Populating Module 6…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 6 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔗 Mission: Connect the Data

This is the week everything clicks into place. You've hit the wall of "this data is in a different table" several times now — this week, that wall comes down for good.

## This Week You'll Learn To

- Understand why data is split across separate tables at all
- Understand primary keys, foreign keys, and relationships
- Connect tables with \`INNER JOIN\`, \`LEFT JOIN\`, \`RIGHT JOIN\`, and \`FULL OUTER JOIN\`
- Meet the final table: \`order_items\`

## Why This Matters

Nearly every real, useful business question — "which customers spent the most?", "what products are selling?" — requires connecting at least two tables. \`JOIN\` is arguably the single most important skill in all of SQL.
`);
    console.log(`✓ Week 6 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Keys and Relationships");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Why Are Tables Separated At All?

Why not store everything — customer info AND their orders — in one giant table? Because a customer places *many* orders, so their name and email would be repeated on every single order row: wasteful, and dangerous (update their email in one row and forget the other 40, and now your data disagrees with itself). Separating data into focused tables, connected by relationships, avoids this.

## Primary Keys

A **primary key** is a column that uniquely identifies each row in a table — no two rows share the same value. \`customers.customer_id\` and \`products.product_id\` are primary keys: each customer and product has exactly one, unique ID.

## Foreign Keys

A **foreign key** is a column in one table that refers to a primary key in another table, creating a link between them. \`orders.customer_id\` is a foreign key — it doesn't uniquely identify an order, but it points to exactly which customer (via \`customers.customer_id\`) placed it.

## Meet the Final Table: \`order_items\`

An order can contain multiple products, and a product can appear on multiple orders — so a separate connecting table is needed:

| Column | What it holds |
|---|---|
| \`order_item_id\` | A unique number for each line item |
| \`order_id\` | Foreign key → which order this belongs to |
| \`product_id\` | Foreign key → which product was purchased |
| \`quantity\` | How many units |
| \`unit_price\` | The price at time of purchase |

## The Full Relationship Chain

\`\`\`text
CUSTOMERS
    |
    | customer_id
    ↓
ORDERS
    |
    | order_id
    ↓
ORDER_ITEMS
    |
    | product_id
    ↓
PRODUCTS
\`\`\`

Each arrow is a foreign key relationship: an order belongs to a customer, an order_item belongs to an order, and an order_item refers to a product. This chain is what "JOINing tables" actually means — following these arrows to connect related data.

## One-to-Many, Conceptually

This is called a **one-to-many** relationship: one customer can have *many* orders, one order can have *many* order_items — but each order_item belongs to exactly *one* order. Recognizing this shape is most of the work of understanding how to join two tables correctly.
`);
    console.log(`✓ Keys and Relationships (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "INNER JOIN");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Your First JOIN

**Business question:** "Show each order along with the customer who placed it."

\`\`\`sql
SELECT c.first_name, c.last_name, o.order_id, o.order_date, o.total_amount
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;
\`\`\`

## Query Walkthrough

- \`FROM customers c\` — start with customers, and give it a short **alias**, \`c\`
- \`INNER JOIN orders o\` — connect in the orders table too, aliased \`o\`
- \`ON c.customer_id = o.customer_id\` — the matching rule: connect a customer row to an order row when their \`customer_id\` values are equal
- \`SELECT c.first_name, ...\` — now that both tables are connected, prefix columns with their table alias to say exactly which table each comes from

## What \`INNER JOIN\` Actually Does

\`INNER JOIN\` only keeps rows that have a match in **both** tables. A customer who has never placed an order won't appear at all — there's no matching order row to connect to.

## Aliases Make Multi-Table Queries Readable

Once two tables are involved, both might have a column with the same name (both \`customers\` and \`orders\` could plausibly have an \`id\` column) — table aliases (\`c\`, \`o\`) remove any ambiguity about which table a column belongs to.

## Try It

Write a query joining \`orders\` to \`order_items\`, showing the order_id, product_id, and quantity for every line item.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Join customers to orders, then join orders to order_items.", code: `${SETUP}
run_sql("""
SELECT c.first_name, c.last_name, o.order_id, o.order_date, o.total_amount
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;
""")

run_sql("""
SELECT o.order_id, oi.product_id, oi.quantity
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id;
""")
` },
    ]);
    console.log(`✓ INNER JOIN (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "LEFT JOIN");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Problem \`INNER JOIN\` Can Hide

**Business question:** "Show every customer, and any orders they've placed — including customers who haven't ordered anything yet."

\`\`\`sql
SELECT c.first_name, c.last_name, o.order_id, o.total_amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
\`\`\`

\`LEFT JOIN\` keeps **every row from the left (first-listed) table**, whether or not it has a match in the right table. If a customer has no matching order, the order columns simply show as \`NULL\` (or blank) for that row — the customer still appears.

## INNER JOIN vs. LEFT JOIN, Side by Side

- \`INNER JOIN\`: "only show customers who have orders"
- \`LEFT JOIN\`: "show every customer, with their orders if they have any"

Which one is correct depends entirely on the business question. Analysts choose \`LEFT JOIN\` specifically when "including the ones with nothing to match" is part of the actual answer they need.

## Finding "No Match" Rows With LEFT JOIN

**Business question:** "Which customers have never placed an order?"

\`\`\`sql
SELECT c.first_name, c.last_name
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_id IS NULL;
\`\`\`

This is a genuinely powerful, common pattern: \`LEFT JOIN\` + \`WHERE ... IS NULL\` finds rows in the left table with *no* match at all in the right table.

## Try It

Use a \`LEFT JOIN\` to find any products that have never appeared in \`order_items\` (never been ordered).
`);
    await attachLab(prisma, l.id, [
      { instructions: "Find customers who've never ordered, and products that have never been ordered.", code: `${SETUP}
run_sql("""
SELECT c.first_name, c.last_name
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_id IS NULL;
""")

run_sql("""
SELECT p.product_name
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
WHERE oi.order_item_id IS NULL;
""")
` },
    ]);
    console.log(`✓ LEFT JOIN (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "RIGHT JOIN and FULL OUTER JOIN");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## \`RIGHT JOIN\`: The Mirror Image of LEFT JOIN

\`\`\`sql
SELECT c.first_name, o.order_id
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;
\`\`\`

\`RIGHT JOIN\` keeps **every row from the right table**, matched with the left table where possible. In practice, \`RIGHT JOIN\` is used far less often than \`LEFT JOIN\` — most analysts just reorder which table they list first and use \`LEFT JOIN\` instead, since it reads more naturally. It's worth recognizing \`RIGHT JOIN\` when you see it, more than reaching for it yourself.

## \`FULL OUTER JOIN\`: Keep Everything From Both Sides

\`\`\`sql
SELECT c.first_name, o.order_id
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
\`\`\`

\`FULL OUTER JOIN\` keeps every row from **both** tables — matched where possible, with \`NULL\`s filled in on whichever side has no match. Less common day-to-day, but useful for a full audit: "show me everything, matched or not, from both tables."

## The Four JOIN Types, Summarized

| JOIN type | Keeps... |
|---|---|
| \`INNER JOIN\` | Only rows with a match in both tables |
| \`LEFT JOIN\` | All rows from the left table, matched or not |
| \`RIGHT JOIN\` | All rows from the right table, matched or not |
| \`FULL OUTER JOIN\` | All rows from both tables, matched or not |

## Try It

Run the \`FULL OUTER JOIN\` example above and look closely at which rows have \`NULL\` values — can you tell which side each \`NULL\` row came from?
`);
    await attachLab(prisma, l.id, [
      { instructions: "Compare RIGHT JOIN and FULL OUTER JOIN — look at which rows have NULLs.", code: `${SETUP}
run_sql("""
SELECT c.first_name, o.order_id
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;
""")

run_sql("""
SELECT c.first_name, o.order_id
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
""")
` },
    ]);
    console.log(`✓ RIGHT JOIN and FULL OUTER JOIN (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Join Master");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔗 Join Master

Answer real business questions that require connecting tables.

## Your Tasks

1. Which customers placed orders? (show customer name + order_id)
2. What products were purchased in each order? (join orders → order_items → products, showing order_id and product_name)
3. Which customers spent the most, using \`order_items\`? (join customers → orders → order_items, group by customer, sum \`quantity * unit_price\`)
4. Which products generated the most revenue? (join order_items → products, group by product, sum \`quantity * unit_price\`)
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Work through the 4 Join Master tasks — task 1 is started for you.",
        code: `${SETUP}
# Task 1: Customers who placed orders
run_sql("""
SELECT c.first_name, c.last_name, o.order_id
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;
""")

# Task 2: Products purchased in each order (join 3 tables: orders -> order_items -> products)


# Task 3: Top-spending customers (join customers -> orders -> order_items, group by customer)


# Task 4: Top-revenue products (join order_items -> products, group by product)

`,
      },
    ]);
    console.log(`✓ Lab: Join Master (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Boss Battle: The Full Picture");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔗 Boss Battle: The Full Picture

DataMart's leadership wants a single query connecting the *entire* relationship chain: customer → order → order_item → product.

## Requirements

Write one query joining all four tables, showing: customer's first and last name, order_id, product_name, quantity, and the line total (\`quantity * unit_price\`).

## Hint

You'll need three \`JOIN\`s chained together — join \`customers\` to \`orders\`, then that result to \`order_items\`, then that result to \`products\`.

## Reflect

You just connected every table in the DataMart database in a single query. This is genuinely what real SQL work looks like at a company — most useful business questions touch more than one table.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Join all 4 tables together to show the full customer -> order -> product picture.",
        code: `${SETUP}
run_sql("""
SELECT c.first_name, c.last_name, o.order_id, p.product_name, oi.quantity,
       oi.quantity * oi.unit_price AS line_total
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
ORDER BY o.order_id;
""")
`,
      },
    ]);
    console.log(`✓ Boss Battle: The Full Picture (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 6 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What is a primary key?", options: ["Any column with numbers", "A column that uniquely identifies each row in a table", "A column that can be duplicated freely", "The first column in a table"], correct_index: 1, explanation: "A primary key uniquely identifies each row — no two rows share the same value." },
      { question_text: "What is a foreign key?", options: ["A key from another country", "A column in one table that refers to a primary key in another table", "A duplicate primary key", "An encrypted column"], correct_index: 1, explanation: "A foreign key is a column that links to a primary key in a different table, creating a relationship." },
      { question_text: "What does INNER JOIN keep?", options: ["All rows from both tables", "Only rows that have a match in both tables", "Only rows from the left table", "Only rows with NULL values"], correct_index: 1, explanation: "INNER JOIN only returns rows where a match exists in both joined tables." },
      { question_text: "What does LEFT JOIN keep that INNER JOIN might exclude?", options: ["Nothing different", "All rows from the left table, even those with no match in the right table", "Only matched rows", "Rows from neither table"], correct_index: 1, explanation: "LEFT JOIN keeps every row from the left table regardless of whether a match exists on the right." },
      { question_text: "What does LEFT JOIN ... WHERE right_table.id IS NULL find?", options: ["Rows with a match in both tables", "Rows in the left table that have NO match in the right table", "Every row in the right table", "An error — this is invalid syntax"], correct_index: 1, explanation: "This is the standard pattern for finding unmatched rows — e.g. customers with no orders." },
      { question_text: "In FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id, what are 'c' and 'o'?", options: ["New tables", "Table aliases — short names standing in for customers and orders", "Column names", "SQL keywords"], correct_index: 1, explanation: "c and o are aliases, giving each table a short name to reference in the rest of the query." },
      { question_text: "Why does a real database usually split customer info and order info into separate tables, instead of one giant table?", options: ["It's required by SQL", "Repeating a customer's info on every order row wastes space and risks the data disagreeing with itself", "Separate tables run faster with no other reason", "It's purely a style preference"], correct_index: 1, explanation: "Separating tables avoids repeating and risking inconsistent copies of the same customer data across many order rows." },
      { question_text: "What does FULL OUTER JOIN keep?", options: ["Only matched rows", "Only left-table rows", "All rows from both tables, matched or not", "Nothing — it's invalid SQL"], correct_index: 2, explanation: "FULL OUTER JOIN keeps every row from both tables, filling in NULLs where there's no match." },
      { question_text: "Why is RIGHT JOIN used less often than LEFT JOIN in practice?", options: ["RIGHT JOIN doesn't exist in most databases", "Most analysts just reorder the tables and use LEFT JOIN instead, since it reads more naturally", "RIGHT JOIN is always slower", "RIGHT JOIN can't use ON"], correct_index: 1, explanation: "Since you can just swap table order, most people default to LEFT JOIN for readability rather than reaching for RIGHT JOIN." },
      { question_text: "What is the relationship chain connecting DataMart's four tables?", options: ["products -> customers -> orders -> order_items", "customers -> orders -> order_items -> products", "order_items -> customers -> products -> orders", "There is no relationship between them"], correct_index: 1, explanation: "customers connects to orders, orders connects to order_items, and order_items connects to products." },
    ]);
    console.log(`✓ Module 6 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 6 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Why tables are split apart, and how primary/foreign keys connect them
- \`INNER JOIN\` (only matches), \`LEFT JOIN\` (all of the left table), \`RIGHT JOIN\`, and \`FULL OUTER JOIN\`
- The \`LEFT JOIN\` + \`WHERE ... IS NULL\` pattern for finding unmatched rows
- Met the final DataMart table: \`order_items\`
- You connected all four tables in a single query — customer to order to product

## Coming Up Next Week

Two-table joins are powerful, but real analysis often needs more: joining three or more tables at once, and asking questions *within* a question — "find customers who spent more than the average customer." That's what subqueries unlock. 🕵️
`);
    console.log(`✓ Module 6 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 6 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
