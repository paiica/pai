/**
 * Populates Module 3 — Conditions, Pattern Matching & NULLs (Week 3).
 * Run with: npx ts-node prisma/enrich-szth-module3.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./sql-zero-to-hero-lib";

const prisma = new PrismaClient();
const SLUG = "sql-zero-to-hero";
const MOD = "Module 3";
// This module needs one row with a missing city to teach NULL honestly —
// added directly via a follow-up UPDATE in the setup rather than baked
// into the shared customers dataset (every other module expects it intact).
const SETUP = dataMartSetup(["customers", "products"]) + `
cur.execute("UPDATE customers SET city = NULL WHERE customer_id = 6")
conn.commit()
`;

async function main() {
  console.log("🌱  Populating Module 3…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 3 Mission Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🎯 Mission: Master the Filters

Last week you filtered on one condition at a time. This week you'll combine multiple conditions, match text patterns, and confront SQL's trickiest concept: missing data.

## This Week You'll Learn To

- Combine conditions with \`AND\`, \`OR\`, and \`NOT\`
- Check membership with \`IN\` and ranges with \`BETWEEN\`
- Match text patterns with \`LIKE\`
- Correctly handle \`NULL\` (missing) values

## Why This Matters

Real business questions are rarely single-condition — "customers from Toronto or Ottawa who signed up this year" needs multiple conditions combined correctly. And real data always has gaps; knowing how to handle them without silently getting wrong answers is a core analyst skill.
`);
    console.log(`✓ Week 3 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Combining Conditions: AND, OR, NOT");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## \`AND\`: Both Conditions Must Be True

**Business question:** "Which Electronics products cost more than $50?"

\`\`\`sql
SELECT product_name, category, price
FROM products
WHERE category = 'Electronics' AND price > 50;
\`\`\`

Both conditions must be true for a row to appear — a $20 Electronics item is excluded (fails the price condition), and a $200 Home item is excluded too (fails the category condition).

## \`OR\`: At Least One Condition Must Be True

**Business question:** "Which customers are from Toronto or Ottawa?"

\`\`\`sql
SELECT first_name, last_name, city
FROM customers
WHERE city = 'Toronto' OR city = 'Ottawa';
\`\`\`

## \`NOT\`: Flip a Condition

\`\`\`sql
SELECT product_name, category
FROM products
WHERE NOT category = 'Books';
\`\`\`

This returns every product *except* Books — logically the same as \`category <> 'Books'\`.

## A Common Trap: Mixing AND and OR

\`\`\`sql
SELECT * FROM products
WHERE category = 'Electronics' OR category = 'Home' AND price < 30;
\`\`\`

SQL evaluates \`AND\` before \`OR\` (just like multiplication before addition in math), so this actually means "Electronics of any price, OR Home under $30" — probably not what was intended. Use parentheses to be explicit:

\`\`\`sql
WHERE (category = 'Electronics' OR category = 'Home') AND price < 30;
\`\`\`

## Try It

Write a query for products that are in the Clothing category AND cost less than $50.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Find Clothing products under $50, then find customers from Vancouver or Montreal.", code: `${SETUP}
run_sql("""
SELECT product_name, price FROM products WHERE category = 'Clothing' AND price < 50;
""")

run_sql("""
SELECT first_name, last_name, city FROM customers WHERE city = 'Vancouver' OR city = 'Montreal';
""")
` },
    ]);
    console.log(`✓ Combining Conditions (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "IN and BETWEEN");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## \`IN\`: A Cleaner Way to Check Multiple Values

Instead of a long chain of \`OR\`s:

\`\`\`sql
WHERE city = 'Toronto' OR city = 'Ottawa' OR city = 'Montreal'
\`\`\`

Use \`IN\` with a list:

\`\`\`sql
SELECT first_name, last_name, city
FROM customers
WHERE city IN ('Toronto', 'Ottawa', 'Montreal');
\`\`\`

Same result, much easier to read (and to add a fourth city to later).

## \`BETWEEN\`: A Cleaner Way to Check a Range

Instead of:

\`\`\`sql
WHERE price >= 20 AND price <= 50
\`\`\`

Use \`BETWEEN\`:

\`\`\`sql
SELECT product_name, price
FROM products
WHERE price BETWEEN 20 AND 50;
\`\`\`

\`BETWEEN\` is **inclusive** on both ends — a product priced at exactly $20 or exactly $50 is included.

## Try It

Write a query using \`IN\` to find products in the \`'Electronics'\` or \`'Books'\` categories, and a second query using \`BETWEEN\` to find products priced $25 to $80.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Use IN for Electronics/Books products, and BETWEEN for products priced $25-$80.", code: `${SETUP}
run_sql("""
SELECT product_name, category FROM products WHERE category IN ('Electronics', 'Books');
""")

run_sql("""
SELECT product_name, price FROM products WHERE price BETWEEN 25 AND 80;
""")
` },
    ]);
    console.log(`✓ IN and BETWEEN (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Pattern Matching with LIKE");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The \`LIKE\` Operator

**Business question:** "Which customers have names starting with 'A'?"

\`\`\`sql
SELECT first_name, last_name
FROM customers
WHERE first_name LIKE 'A%';
\`\`\`

\`LIKE\` matches text patterns using two special wildcard characters:

- \`%\` — matches **any number** of characters (including zero)
- \`_\` — matches **exactly one** character

## Wildcard Examples

| Pattern | Matches |
|---|---|
| \`'A%'\` | Starts with A (Ava, Anna, Alex...) |
| \`'%son'\` | Ends with "son" (Wilson, Anderson...) |
| \`'%phone%'\` | Contains "phone" anywhere |
| \`'_a%'\` | Second letter is "a" |

**Business question:** "Which products have 'phone' anywhere in the name?"

\`\`\`sql
SELECT product_name
FROM products
WHERE product_name LIKE '%phone%';
\`\`\`

## Try It

Write a query finding all products whose name ends in \`"er"\` (hint: \`'%er'\`).
`);
    await attachLab(prisma, l.id, [
      { instructions: "Find customers whose last name starts with a specific letter, and products ending in 'er'.", code: `${SETUP}
run_sql("""
SELECT first_name, last_name FROM customers WHERE last_name LIKE 'C%';
""")

run_sql("""
SELECT product_name FROM products WHERE product_name LIKE '%er';
""")
` },
    ]);
    console.log(`✓ Pattern Matching with LIKE (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Understanding NULL");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What \`NULL\` Really Means

\`NULL\` represents **missing or unknown data** — it is not zero, and it is not an empty string \`''\`. It means "we don't have a value here at all."

For this lesson, one customer in DataMart (Noah Kelly) has a missing \`city\` value — imagine the signup form let that field go blank.

## Why You Can't Use \`= NULL\`

\`\`\`sql
SELECT * FROM customers WHERE city = NULL;   -- returns NOTHING, even for the row that IS missing a city!
\`\`\`

This is one of SQL's most common beginner traps. \`NULL\` represents "unknown," and comparing anything to "unknown" — even another \`NULL\` — is *also* unknown, which SQL treats as not-a-match. \`=\` simply cannot detect \`NULL\`.

## The Correct Way: \`IS NULL\` / \`IS NOT NULL\`

\`\`\`sql
SELECT first_name, last_name, city
FROM customers
WHERE city IS NULL;
\`\`\`

\`\`\`sql
SELECT first_name, last_name, city
FROM customers
WHERE city IS NOT NULL;
\`\`\`

These are special SQL operators built specifically to check for missing data — always use \`IS NULL\`/\`IS NOT NULL\`, never \`=\` or \`<>\`, when working with \`NULL\`.

## Why This Matters for Real Analysis

A technically correct-looking query with \`WHERE city = NULL\` will silently return zero rows instead of erroring — a dangerous trap, since it *looks* like it ran successfully. Knowing this rule is what separates someone who can write SQL from someone who can trust their SQL results.

## Try It

Run the query for customers with a missing city — one customer should appear.
`);
    await attachLab(prisma, l.id, [
      { instructions: "Compare WHERE city = NULL (returns nothing, even for missing rows) against the correct WHERE city IS NULL.", code: `${SETUP}
# The WRONG way — returns nothing, even though one row IS missing a city:
run_sql("""
SELECT first_name, last_name, city FROM customers WHERE city = NULL;
""")

# The CORRECT way:
run_sql("""
SELECT first_name, last_name, city FROM customers WHERE city IS NULL;
""")
` },
    ]);
    console.log(`✓ Understanding NULL (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: SQL Filter Challenge");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔐 SQL Filter Challenge

A series of business questions — build the query for each.

## Your Tasks

1. Find customers from Ontario (\`'ON'\`) whose first name starts with "M"
2. Find products that are either Home or Books category, priced under $40
3. Find products with a name containing the word "Book"
4. Find customers with a missing city (use what you just learned!)
5. Find products priced between $15 and $30, sorted cheapest first
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Work through the 5 filter challenge tasks above.",
        code: `${SETUP}
# Task 1: Ontario customers with first name starting with "M"


# Task 2: Home or Books products under $40


# Task 3: Products with "Book" in the name


# Task 4: Customers with a missing city


# Task 5: Products $15-$30, cheapest first

`,
      },
    ]);
    console.log(`✓ Lab: SQL Filter Challenge (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Boss Battle: The Missing Records");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🎯 Boss Battle: The Missing Records

DataMart's data team suspects some customer records are incomplete, and wants a full audit.

## Requirements

1. Find every customer with any missing (\`NULL\`) information in \`city\`
2. Find every product priced under $25 **or** with fewer than 50 in stock (two separate business risks: cheap margin, and low inventory)
3. Find customers whose email does NOT contain \`"@email.com"\` (hint: combine \`LIKE\` with \`NOT\`) — a sanity check for malformed data (there shouldn't be any in this dataset, which is itself a useful confirmation!)

## Reflect

Real datasets are rarely perfectly clean. Part of being a good analyst is knowing how to go looking for problems, not just assuming the data is correct.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Audit the DataMart data for missing values, at-risk products, and malformed emails.",
        code: `${SETUP}
# Task 1: Customers with missing city
run_sql("""
SELECT first_name, last_name, city FROM customers WHERE city IS NULL;
""")

# Task 2: Products under $25 OR under 50 in stock


# Task 3: Customers whose email does NOT contain "@email.com"

`,
      },
    ]);
    console.log(`✓ Boss Battle: The Missing Records (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 3 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "For WHERE category = 'Electronics' AND price > 50, when does a row appear in the results?", options: ["If either condition is true", "Only if both conditions are true", "Never", "Only if category is Electronics"], correct_index: 1, explanation: "AND requires both conditions to be true for a row to match." },
      { question_text: "What does WHERE city IN ('Toronto', 'Ottawa') do?", options: ["Only matches Toronto", "Matches rows where city is Toronto OR Ottawa", "Causes an error", "Matches everything except Toronto and Ottawa"], correct_index: 1, explanation: "IN checks whether a value matches any item in the list — equivalent to chained ORs." },
      { question_text: "Is BETWEEN 20 AND 50 inclusive or exclusive of 20 and 50?", options: ["Exclusive of both", "Inclusive of both — 20 and 50 themselves are included", "Inclusive of 20 only", "Inclusive of 50 only"], correct_index: 1, explanation: "BETWEEN is inclusive on both ends." },
      { question_text: "In a LIKE pattern, what does % match?", options: ["Exactly one character", "Any number of characters, including zero", "Only numbers", "Nothing — it's not a valid wildcard"], correct_index: 1, explanation: "% matches any sequence of characters, including none." },
      { question_text: "In a LIKE pattern, what does _ match?", options: ["Any number of characters", "Exactly one character", "A literal underscore only", "Zero characters"], correct_index: 1, explanation: "_ matches exactly one character." },
      { question_text: "What does WHERE city = NULL return, even for rows where city truly is NULL?", options: ["Those exact rows", "Nothing — = can never match NULL", "An error", "All rows"], correct_index: 1, explanation: "= cannot detect NULL; comparing to NULL is always 'unknown', never true, so this returns zero rows." },
      { question_text: "What is the correct way to find rows with a missing value in a column?", options: ["WHERE column = NULL", "WHERE column IS NULL", "WHERE column == NULL", "WHERE column = ''"], correct_index: 1, explanation: "IS NULL is the correct, purpose-built way to check for missing values." },
      { question_text: "Does NULL mean the same thing as zero or an empty string?", options: ["Yes, they're identical", "No — NULL means missing/unknown data, distinct from 0 or ''", "NULL only applies to text columns", "NULL only applies to number columns"], correct_index: 1, explanation: "NULL specifically represents missing or unknown data, not a zero value or empty text." },
      { question_text: "Why should you use parentheses when mixing AND and OR in the same WHERE clause?", options: ["Parentheses are always required by SQL", "SQL evaluates AND before OR, so parentheses control the intended grouping", "It's purely a style choice with no effect", "Parentheses are only needed with three or more conditions"], correct_index: 1, explanation: "AND has higher precedence than OR, so parentheses are needed to make the intended grouping explicit." },
      { question_text: "What does WHERE product_name LIKE '%phone%' match?", options: ["Only names starting with 'phone'", "Only names ending with 'phone'", "Any name containing 'phone' anywhere", "Only the exact word 'phone'"], correct_index: 2, explanation: "% on both sides matches 'phone' appearing anywhere within the text." },
    ]);
    console.log(`✓ Module 3 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 3 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- \`AND\`, \`OR\`, \`NOT\` combine multiple conditions (and parentheses control how)
- \`IN\` checks membership in a list; \`BETWEEN\` checks an inclusive range
- \`LIKE\` with \`%\` and \`_\` matches text patterns
- \`NULL\` means missing/unknown — never use \`=\`, always use \`IS NULL\`/\`IS NOT NULL\`
- You audited DataMart's data for missing and suspicious values

## Coming Up Next Week

You've been retrieving and filtering raw data — next week you'll start calculating things from it: totals, averages, counts. Time to become a business analyst. 📊
`);
    console.log(`✓ Module 3 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 3 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
