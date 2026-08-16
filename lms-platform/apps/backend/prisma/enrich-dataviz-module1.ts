/**
 * Populates Module 1 — Why Data Visualization Matters (Week 1).
 * Run with: npx ts-node prisma/enrich-dataviz-module1.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 1";
const SETUP = dataMartSetup();

async function main() {
  console.log("🌱  Populating Module 1…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 1 Mission Briefing: See the Data");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 👀 Welcome to Data Visualization

You've worked with data before — tables, spreadsheets, maybe a query result or two. This course is about the next step: turning that data into something a person can actually *see* a pattern in, in about two seconds.

## The Workflow You'll Use All Course

Every module in this course follows the same chain:

**Raw Data → Question → Visual → Interpretation → Insight → Story → Decision**

A chart that doesn't trace back to a question is decoration. A chart that does is a tool for thinking — and for convincing someone else.

## This Week You'll Learn To

- Explain why a well-chosen chart beats a table or a single number
- Tell the difference between *exploratory* visualization (finding patterns) and *explanatory* visualization (communicating them)
- Look at raw data and predict which patterns will be easy or hard to see

## Why This Matters

Every certification, every job posting, every dashboard you'll ever build in a data role assumes you can do this well. It's a skill, not a talent — and it starts with understanding *why* a chart works before you ever open Matplotlib.
`);
    console.log(`✓ Week 1 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "What Is Data Visualization?");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## More Than Decoration

**Data visualization** is the practice of representing data visually — as charts, graphs, maps, or diagrams — so that patterns, trends, and relationships become easier to see than they would be in raw numbers.

That's a functional definition on purpose. A visualization is not decoration added *after* the analysis is done. It's a tool used *during* the analysis, and *during* the communication of it.

> "A visualization is not decoration. It is a tool for thinking and communicating."

## Where Visualization Shows Up

- **In business** — a sales dashboard a manager checks every morning
- **In data science** — a scatter plot that reveals a relationship no summary statistic would show
- **In journalism** — a chart that makes a complex policy story understandable in five seconds
- **In decision-making** — the one chart in a slide deck that actually changes someone's mind

## The Core Idea This Course Returns To

Every visualization should answer a question. Not "what chart looks good with this data," but "what question does the person looking at this need answered, and does this chart answer it clearly?"

That question — *what question does this answer?* — is the single most useful habit this course can teach you. Ask it before you build every chart from here on.
`);
    console.log(`✓ What Is Data Visualization? (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Table vs. Number vs. Chart");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Same Data, Three Ways

Imagine DataMart's leadership asks: "How did monthly revenue change over the last two years?"

**As a single number:** "Total revenue was $812,056." True, but it answers a completely different question — it says nothing about *change*.

**As a table:** 24 rows, one per month, each with a revenue figure. All the information is there. But scanning 24 numbers to find "when did revenue dip, and when did it recover?" takes real effort — you have to hold every prior number in your head while you read the next one.

**As a line chart:** The same 24 numbers, plotted month by month. The dip and the recovery are visible instantly, without doing any mental math at all.

## Why This Happens

Human vision is extremely good at detecting some things fast: changes in position, slope, and length. It's comparatively slow at extracting patterns from rows of text, especially as the row count grows. A table of 24 numbers is manageable; a table of 2,000 is not — but a chart of 2,000 points can still be read in a glance.

## When a Table (or a Number) Is Actually Better

Visualization isn't always the right answer:

- A **single number** is right when someone needs one specific fact ("What was last month's revenue?")
- A **table** is right when someone needs to look up exact values, or cross-reference many precise figures at once (a finance team reconciling accounts, for example)
- A **chart** is right when someone needs to see a *pattern*: a trend, a comparison, an outlier, a relationship

The skill isn't "always chart everything." It's choosing the representation that matches what the audience actually needs to do with the data.
`);
    console.log(`✓ Table vs. Number vs. Chart (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Exploratory vs. Explanatory Visualization");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Two Very Different Jobs

This distinction will come back in almost every module of this course, so it's worth getting solid on it now.

### Exploratory Visualization

Used **to discover** patterns. You don't yet know what's in the data — you're making quick, rough charts to find out. Exploratory charts are for *you*, the analyst. They don't need polished titles, curated color schemes, or a single clear takeaway, because you don't have one yet.

*Example:* Plotting revenue against every other column in the sales data, one chart at a time, just to see what correlates with what.

### Explanatory Visualization

Used **to communicate** a finding you already know. You've done the exploring, you found something real, and now you're building a chart specifically to make *that one finding* obvious to someone else — a manager, a client, a reader.

*Example:* A single, carefully titled chart showing "Revenue is 43% higher on weekends than weekdays," built and polished specifically to make that one fact land in three seconds.

## Why the Distinction Matters

A common beginner mistake is presenting exploratory charts as if they were explanatory ones — showing an audience a messy, multi-variable scatter plot matrix and expecting them to find the insight themselves. Explanatory visualization does that work *for* the audience, in advance.

| | Exploratory | Explanatory |
|---|---|---|
| **Audience** | Yourself | Someone else |
| **Goal** | Find a pattern | Communicate a pattern |
| **Polish** | Low — speed matters more | High — clarity matters most |
| **Quantity** | Many, quick charts | One (or a few) refined charts |

You'll practice both throughout this course — often in the same lab, first exploring, then explaining.
`);
    console.log(`✓ Exploratory vs. Explanatory Visualization (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: See the Data");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 👀 Mission: See the Data

Meet **DataMart Analytics** — the fictional retail company whose data you'll work with for the entire course. Below, you'll load its sales data and just *look* at it, several different ways, before building a single chart.

## Your Task

Run the starter cell to load the data, then work through each prompt. For each one, write your answer as a comment before moving to the next.

1. Print the first 10 rows of \`sales\`. What columns are there?
2. Print \`sales.describe()\`. Which column has the widest spread between its min and max?
3. Print the count of sales rows per \`category\`. Is any category obviously more common than the others?
4. Based on just these outputs (no charts yet) — which patterns do you think would be *easy* to spot in a chart, and which would be hard to spot in a table?
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Load the DataMart Analytics data and explore it as plain output — no charts yet.",
        code: `${SETUP}
# 1. First 10 rows
print(sales.head(10))
`,
      },
      {
        instructions: "Now look at the summary statistics.",
        code: `${SETUP}
print(sales.describe())
`,
      },
      {
        instructions: "Count sales rows per category.",
        code: `${SETUP}
print(sales["category"].value_counts())
`,
      },
      {
        instructions: "Write your answer to prompt 4 as a comment here — which patterns would be easy or hard to spot in a table vs. a chart?",
        code: `# Your answer:
#
`,
      },
    ]);
    console.log(`✓ Lab: See the Data (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Choose Without Charting");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Challenge: Choose Without Charting

For each business question below, decide whether the best answer is **a single number**, **a table**, or **a chart** — and briefly say why. Don't build anything yet; this is about the judgment call itself.

1. "What was total revenue last quarter?"
2. "How does monthly revenue trend over the last two years?"
3. "What was customer #482's exact order history, with dates and amounts?"
4. "Which product category earns the most profit?"
5. "Is there a relationship between discount size and quantity sold?"
6. "What is this month's exact revenue, down to the cent, for an accounting report?"

Keep your answers — you'll revisit some of these exact questions with real charts in Module 3.
`);
    console.log(`✓ Challenge: Choose Without Charting (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 1 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What is the core definition of data visualization used in this course?", options: ["Making data look more attractive", "Representing data visually so patterns become easier to see than in raw numbers", "Any chart created in Excel", "A replacement for statistics"], correct_index: 1, explanation: "Visualization is a tool for making patterns visible, not decoration added after analysis." },
      { question_text: "Why might a chart reveal a pattern that a table of the same data hides?", options: ["Charts always contain more information than tables", "Human vision is fast at detecting position/slope/length changes, but slow at extracting patterns from rows of numbers", "Tables are always wrong", "Charts round numbers, making patterns clearer"], correct_index: 1, explanation: "Charts leverage visual perception, which is much faster at spotting trends and comparisons than reading numbers row by row." },
      { question_text: "When is a single number the best representation, instead of a chart?", options: ["Never — charts are always better", "When someone needs one specific fact, not a pattern", "Only for financial data", "When the dataset is very large"], correct_index: 1, explanation: "A single number answers 'what is the exact value' — a different job than showing a pattern." },
      { question_text: "What is exploratory visualization used for?", options: ["Communicating a known finding to an audience", "Discovering patterns you don't yet know are there", "Making a chart look polished for a presentation", "Replacing quizzes"], correct_index: 1, explanation: "Exploratory visualization is for the analyst's own discovery process, not for presenting to others." },
      { question_text: "What is explanatory visualization used for?", options: ["Discovering unknown patterns", "Communicating a specific, already-known finding clearly to an audience", "Storing data", "Debugging code"], correct_index: 1, explanation: "Explanatory visualization is built after you already know the finding, specifically to make it clear to someone else." },
      { question_text: "Which is generally true of exploratory charts compared to explanatory ones?", options: ["Exploratory charts need more polish", "Exploratory charts are typically quicker and rougher; explanatory charts are more polished and focused", "They are identical in every way", "Explanatory charts are always bar charts"], correct_index: 1, explanation: "Exploratory work favors speed over polish; explanatory work favors clarity and focus since it's for an audience." },
      { question_text: "A common beginner mistake, per this lesson, is:", options: ["Using too few colors", "Presenting messy exploratory charts to an audience as if they were polished explanatory ones", "Writing chart titles", "Using pandas instead of Excel"], correct_index: 1, explanation: "Exploratory charts aren't designed for an audience — showing them as-is skips the work explanatory visualization is meant to do." },
      { question_text: "According to this module, what should every visualization do?", options: ["Use as many colors as possible", "Answer a question", "Always include a legend", "Be built in Matplotlib specifically"], correct_index: 1, explanation: "The recurring principle of this course: a visualization without a question behind it is just decoration." },
      { question_text: "What is the workflow chain taught throughout this course?", options: ["Data → Chart → Done", "Raw Data → Question → Visual → Interpretation → Insight → Story → Decision", "Question → Answer → Chart", "Chart → Data → Insight"], correct_index: 1, explanation: "This chain is the throughline connecting every module in the course." },
      { question_text: "Why might a table still be the better choice over a chart in some cases?", options: ["Tables are always better", "When someone needs to look up exact, precise values rather than see a pattern", "Because charts take longer to build", "Tables are never appropriate"], correct_index: 1, explanation: "Precise value lookup (e.g. reconciling exact figures) is a table's strength, not a chart's." },
    ]);
    console.log(`✓ Module 1 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 1 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Data visualization is a tool for thinking and communicating, not decoration
- The same data can be shown as a number, a table, or a chart — each is right for a different job
- Human vision is fast at spotting position/slope/length changes, slow at parsing rows of numbers
- Exploratory visualization discovers patterns; explanatory visualization communicates them
- Every visualization should trace back to a real question

## Coming Up Next Week

Before you can choose the right chart, you need to understand the *data itself* — what type it is, and how it can be mapped onto a chart's visual properties (position, size, color, and more). That's visual encoding, and it's next.
`);
    console.log(`✓ Module 1 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 1 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
