/**
 * Populates Module 6 — Exploratory Data Visualization (Week 6).
 * Run with: npx ts-node prisma/enrich-dataviz-module6.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 6";
const SETUP = dataMartSetup();
const SETUP_WH = dataMartSetup({ worldHealth: true });

async function main() {
  console.log("🌱  Populating Module 6…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 6 Mission Briefing: Discover Hidden Patterns");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🕵️ This Week's Mission

Every lesson so far has visualized data to answer a question you already had. This week flips that: you'll use visualization *to find* the questions worth asking in the first place. This is exploratory data analysis (EDA) — and it's one of the most genuinely useful skills in this entire course.

## This Week You'll Learn To

- Use visualization to assess distribution, spread, and outliers in a new dataset
- Use visualization to find relationships, correlation, and segment differences
- Investigate a completely new dataset with no instructions on what to look for

## Why This Matters

In a real job, nobody hands you a dataset with the interesting finding already labeled. EDA is how you find it yourself, before you ever build a polished, explanatory chart.
`);
    console.log(`✓ Week 6 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "EDA Through Visualization: Distribution and Spread");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The First Questions to Ask About Any New Column

When you meet a new numerical column, visualization answers four questions faster than \`.describe()\` alone:

- **Central tendency** — where's the middle? (a histogram's peak, a box plot's median line)
- **Spread** — how wide is the range of typical values?
- **Shape** — is it symmetric, or skewed to one side? Does it have one peak or several?
- **Outliers** — are there values far outside the typical range?

## Histograms for Shape

\`\`\`python
plt.figure(figsize=(7, 4))
plt.hist(sales["revenue"], bins=30, color="#0d9488", edgecolor="white")
plt.title("Distribution of Order Revenue")
plt.tight_layout()
plt.show()
\`\`\`

A right-skewed shape (a long tail toward high values, common in revenue/price data) tells you the *mean* will be pulled higher than the *median* — worth checking both, not just one.

## Box Plots for Outliers

A box plot marks points beyond 1.5× the interquartile range as individual dots — an explicit, visual outlier flag that a histogram doesn't give you as directly:

\`\`\`python
plt.figure(figsize=(5, 5))
plt.boxplot(sales["revenue"])
plt.title("Order Revenue — Outlier Check")
plt.tight_layout()
plt.show()
\`\`\`

## Why This Matters Before Any Other Analysis

Outliers can distort averages, correlations, and even chart scales (recall Module 5's truncated-axis problem — an extreme outlier can force an axis range that flattens every other value). Checking distribution and spread first is standard practice before drawing any conclusion from a new dataset.
`);
    console.log(`✓ EDA: Distribution and Spread (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "EDA Through Visualization: Relationships and Segmentation");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Correlation Heatmaps: Scan Many Relationships at Once

Instead of building a scatter plot for every possible pair of numerical columns, a correlation heatmap shows all pairwise relationships in one view:

\`\`\`python
import seaborn as sns
numeric_cols = sales[["quantity", "revenue", "profit", "discount"]]
plt.figure(figsize=(6, 5))
sns.heatmap(numeric_cols.corr(), annot=True, cmap="RdBu_r", center=0, vmin=-1, vmax=1)
plt.title("Correlation Between Sales Metrics")
plt.tight_layout()
plt.show()
\`\`\`

\`cmap="RdBu_r", center=0\` uses a **diverging** color scale (Module 5) — correctly, since correlation has a meaningful center point (zero = no relationship). Values close to +1 or -1 are worth investigating with an actual scatter plot next.

## Pair Plots: Every Relationship, at a Glance

Seaborn's \`pairplot\` builds a full grid of scatter plots (every numeric column against every other) plus histograms on the diagonal, in one call — a genuinely fast way to scan an entire new dataset for relationships:

\`\`\`python
sns.pairplot(sales[["quantity", "revenue", "profit", "discount"]].sample(300, random_state=1))
plt.show()
\`\`\`

Sampling first (\`.sample(300, ...)\`) keeps this fast and readable on a large dataset — a pair plot with thousands of overlapping points becomes unreadable.

## Segmentation: Does the Pattern Differ by Group?

A relationship that looks weak overall can hide a strong pattern within one segment. Grouped charts test this directly:

\`\`\`python
plt.figure(figsize=(7, 4))
sns.boxplot(data=sales, x="region", y="profit", hue="region", legend=False)
plt.title("Profit Distribution by Region")
plt.tight_layout()
plt.show()
\`\`\`

## The EDA Habit

Distribution first, then relationships, then segmentation — in that order, you'll rarely miss an obvious pattern in a new dataset.
`);
    console.log(`✓ EDA: Relationships and Segmentation (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Data Visualization Detective");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🕵️ Data Visualization Detective

Meet a **brand-new dataset**: a simulated country-level snapshot of GDP per capita, life expectancy, population, and continent, called \`world_health\`. You're not told what to look for — investigate it yourself using this week's techniques.

## Your Task

Work through the cells below (distribution, correlation, segmentation), then answer: what patterns exist, what variables seem related, are there outliers, do continents differ, and what would you investigate next?
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Start with distribution — look at GDP per capita's shape and spread.",
        code: `${SETUP_WH}
plt.figure(figsize=(7, 4))
plt.hist(world_health["gdp_per_capita"], bins=15, color="#0d9488", edgecolor="white")
plt.title("Distribution of GDP per Capita")
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Check for a relationship between GDP per capita and life expectancy.",
        code: `${SETUP_WH}
plt.figure(figsize=(6, 5))
plt.scatter(world_health["gdp_per_capita"], world_health["life_expectancy"], alpha=0.7, color="#0d9488")
plt.title("GDP per Capita vs. Life Expectancy")
plt.xlabel("GDP per Capita ($)")
plt.ylabel("Life Expectancy (years)")
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Check whether the relationship differs by continent — segmentation.",
        code: `${SETUP_WH}
import seaborn as sns
plt.figure(figsize=(7, 5))
sns.scatterplot(data=world_health, x="gdp_per_capita", y="life_expectancy", hue="continent", s=80)
plt.title("GDP vs. Life Expectancy, by Continent")
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Write your investigation notes: what patterns, relationships, outliers, or group differences did you find, and what would you investigate next?",
        code: `# Patterns I found:
#
# Relationships between variables:
#
# Outliers or unusual points:
#
# What I'd investigate next:
#
`,
      },
    ]);
    console.log(`✓ Lab: Data Visualization Detective (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Five Observations");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Challenge: Five Observations

Return to DataMart's own \`sales\`, \`customers\`, and \`products\` data. Using any of this week's techniques (histograms, box plots, correlation heatmaps, pair plots, grouped charts), build whatever charts you need to discover **at least five genuinely meaningful observations** — things leadership would actually want to know, not trivial facts.

For each observation, write one sentence stating the finding and name which chart revealed it.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Build whatever charts you need to find 5 meaningful observations in DataMart's data.",
        code: `${SETUP}
# Build your exploratory charts here


# Observation 1:
# Observation 2:
# Observation 3:
# Observation 4:
# Observation 5:
`,
      },
    ]);
    console.log(`✓ Challenge: Five Observations (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 6 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What is exploratory data analysis (EDA) used for?", options: ["Building final presentation charts for an executive", "Using visualization to discover patterns in a dataset before you know what you're looking for", "Cleaning missing data only", "Only used in machine learning"], correct_index: 1, explanation: "EDA is about discovery — finding what's worth investigating, not communicating a known finding." },
      { question_text: "What four things should you check first when meeting a new numerical column?", options: ["Only the mean", "Central tendency, spread, shape, and outliers", "Just the maximum value", "The column's data type only"], correct_index: 1, explanation: "These four give you a fast, complete first read on any new numerical variable." },
      { question_text: "Why might a right-skewed distribution matter for choosing a summary statistic?", options: ["It doesn't matter", "A long tail pulls the mean higher than the median, so both are worth checking, not just one", "Skewed data can't be visualized", "Right-skewed data has no outliers"], correct_index: 1, explanation: "Skew causes mean and median to diverge — checking both avoids a misleading single-number summary." },
      { question_text: "What does a box plot show that a histogram doesn't as directly?", options: ["The exact mean", "An explicit visual flag for individual outlier points", "The data type", "The number of columns"], correct_index: 1, explanation: "Box plots mark points beyond 1.5x IQR as individual outlier dots, more explicitly than a histogram's shape." },
      { question_text: "What does a correlation heatmap let you do that building individual scatter plots doesn't, as efficiently?", options: ["Show exact values only", "Scan many pairwise relationships across a whole dataset at once", "Replace the need for any other chart", "Only works with categorical data"], correct_index: 1, explanation: "A heatmap summarizes every pairwise correlation in one view, helping you decide which specific relationships deserve a scatter plot next." },
      { question_text: "Why does a correlation heatmap use a diverging color scale (e.g. center=0)?", options: ["Diverging scales are just prettier", "Correlation has a meaningful center point — zero means no relationship — matching what a diverging scale is built for", "It's required by Seaborn", "Sequential scales can't show negative numbers"], correct_index: 1, explanation: "Diverging scales suit data with a meaningful zero/center, which correlation values (-1 to +1) have." },
      { question_text: "Why sample the data before building a pair plot on a large dataset?", options: ["Sampling is required by Seaborn", "A pair plot with too many overlapping points on a large dataset becomes unreadable", "It makes the correlations more accurate", "Pair plots only work on small datasets by definition"], correct_index: 1, explanation: "Sampling keeps the pair plot fast and visually readable, avoiding overplotting." },
      { question_text: "What does 'segmentation' mean in the context of EDA?", options: ["Deleting parts of the dataset", "Checking whether a pattern or relationship differs across groups/categories", "Resizing a chart", "Converting numerical data to categorical"], correct_index: 1, explanation: "Segmentation checks if an overall pattern actually holds within specific subgroups, or differs between them." },
      { question_text: "What is the recommended order for an EDA investigation, per this module?", options: ["Segmentation, then distribution, then relationships", "Distribution first, then relationships, then segmentation", "Order doesn't matter at all", "Always start with a pie chart"], correct_index: 1, explanation: "Understanding a variable's own distribution first gives context before investigating how it relates to or varies across others." },
      { question_text: "Why is EDA described as one of the most useful real-world skills in this course?", options: ["It's the easiest skill to learn", "In real jobs, nobody hands you a dataset with the interesting finding already labeled — you have to find it yourself", "It replaces the need for any other visualization skill", "It only applies to academic research"], correct_index: 1, explanation: "Real analytical work usually starts with an unlabeled dataset — EDA is how you find what's actually worth reporting." },
    ]);
    console.log(`✓ Module 6 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 6 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- EDA uses visualization to discover patterns, not just communicate known ones
- Histograms and box plots reveal a column's shape, spread, and outliers
- Correlation heatmaps and pair plots scan many relationships at once
- Grouped/segmented charts test whether a pattern holds across different subgroups
- You investigated a completely new dataset with no instructions on what to find

## Coming Up Next Week

Two specific, high-value data types get their own dedicated toolset next: time and place. Module 7 covers visualizing trends over time and patterns across geography.
`);
    console.log(`✓ Module 6 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 6 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
