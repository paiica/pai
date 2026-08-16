/**
 * Populates Module 3 — Choosing the Right Chart (Week 3).
 * Run with: npx ts-node prisma/enrich-dataviz-module3.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 3";
const SETUP = dataMartSetup();

async function main() {
  console.log("🌱  Populating Module 3…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 3 Mission Briefing: Choose the Right Chart");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧩 This Week's Mission

You now know why visualization matters and how data maps onto visual encodings. This week answers the question you'll ask constantly for the rest of your career: **"which chart do I actually use?"**

## This Week You'll Learn To

- Match a business question to the right chart type — bar, line, scatter, histogram, box plot, pie, heatmap, area, map
- Apply a simple decision framework instead of guessing
- Spot and fix a chart that was the wrong choice for its question

## Why This Matters

Chart selection is the single highest-leverage decision you make before writing any code. The best-designed bar chart in the world still fails if a scatter plot was actually the right tool for the question.
`);
    console.log(`✓ Week 3 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Charts for Comparison and Trend");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Bar Charts — For Comparison

**Question shape:** "How does A compare to B (and C, and D)?"

Bar charts use length/position along a shared baseline — the most accurately-read encoding from Module 2 — to compare discrete categories. Use them for "revenue by category," "headcount by department," "average score by group."

**Rule of thumb:** if your x-axis is categorical and you're comparing a number across categories, reach for a bar chart first.

## Line Charts — For Trend

**Question shape:** "How has A changed over time?"

Line charts connect points in a meaningful order (almost always time) so the *slope* between points — another well-read encoding — shows direction and rate of change. Use them for "monthly revenue," "daily active users," "quarterly growth."

**Rule of thumb:** if your x-axis is time (or another meaningfully ordered sequence), and you care about the *shape* of change, reach for a line chart.

## A Common Mix-Up

Using a line chart for categorical comparisons (implying an order/trend between "Electronics" and "Books" that doesn't exist) or a bar chart for a long time series (losing the sense of continuous change) are both chart-selection mistakes you'll be able to spot and avoid after this week.
`);
    console.log(`✓ Charts for Comparison and Trend (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Charts for Relationship and Distribution");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Scatter Plots — For Relationship

**Question shape:** "Is there a relationship between A and B?"

Scatter plots place each observation using position on two numerical axes at once. Patterns — a rising trend, a cluster, an outlier — become visible where a table of two columns would show nothing. Use them for "does discount size relate to quantity sold?"

## Histograms — For Distribution (One Variable)

**Question shape:** "What does the spread of A look like?"

A histogram bins a single numerical column and shows how many observations fall in each bin — revealing shape (is it symmetric? skewed? does it have two peaks?), center, and spread. Use them for "what's the distribution of order revenue?"

## Box Plots — For Distribution and Outliers

**Question shape:** "What's the spread of A, and are there outliers — especially compared across groups?"

A box plot summarizes a distribution's median, quartiles, and outliers in a compact shape, and — unlike a histogram — several box plots line up cleanly side by side for comparison. Use them for "compare order revenue distribution across regions."

## Histogram vs. Box Plot

Both show distribution, but a histogram shows more *shape* detail for one group, while a box plot is far better for *comparing spread across several groups at once*. This week's lab will show both, side by side, on the same data.
`);
    console.log(`✓ Charts for Relationship and Distribution (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Charts for Composition and Geography");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Pie / Donut Charts — Use With Caution

**Question shape:** "What share of the whole does each part represent?"

Pie charts encode values with angle and area — recall from Module 2 that these are read *less* accurately than position or length. A pie chart with more than 4-5 slices, or slices of similar size, becomes genuinely hard to read correctly. **A bar chart almost always communicates the same "share of whole" comparison more clearly.** Reach for a pie chart only when you have very few categories and the point really is "one big piece vs. the rest."

## Heatmaps — For Patterns Across Two Dimensions

**Question shape:** "How does A vary across both B and C at once?"

A heatmap uses color to encode a value across a 2D grid — useful for "revenue by month and region" where a single bar or line chart can't show both dimensions at once. The tradeoff: color is a lower-accuracy encoding, so heatmaps are better for spotting *broad* patterns than reading *precise* values.

## Area Charts — For Trend + Composition

**Question shape:** "How has the total changed over time, AND how is that total split among categories?"

A stacked area chart shows both at once — but stacking makes every layer except the bottom one hard to read precisely, since each layer's baseline is another layer's uneven top edge. Use with real caution, and only for a handful of categories.

## Maps — For Geographic Patterns

**Question shape:** "How does A vary by physical location?"

Maps are the only chart type built specifically for geographic data. They're covered fully in Module 7 — this week, just know when a question is geographic enough to reach for one.

## Composition, Chosen Carefully

For "share of whole," the framework in the next lesson will default you to a bar chart first, and only reach for pie/stacked alternatives when the specific shape of the question calls for it.
`);
    console.log(`✓ Charts for Composition and Geography (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "The Chart Decision Framework");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## One Question to Ask Every Time

Before opening Matplotlib, ask: **"Do I want to compare, show a trend, show a distribution, show a relationship, show composition, or show geography?"**

## The Framework

| Do I want to... | → Reach for |
|---|---|
| **Compare** categories | Bar chart |
| Show a **trend** over time | Line chart |
| Show a **distribution** | Histogram / box plot |
| Show a **relationship** | Scatter plot |
| Show **geographic patterns** | Map |
| Show **composition** | Stacked bar (carefully) — or a bar chart of shares |

## Using the Framework

This isn't a rigid lookup table — real questions sometimes combine two of these ("how has each category's share of revenue changed over time?" is trend *and* composition). When that happens, ask which one matters more to the *specific* audience and question, and lead with that.

## Worked Example

**Business question:** "Which product categories have the widest range of order sizes?"

1. What am I doing? Comparing spread *across groups* → distribution + comparison
2. Best fit: box plot (built for exactly "compare distributions across categories")
3. Not a histogram — that shows one distribution's shape well, but stacking 5 histograms is hard to compare at a glance
4. Not a bar chart — bars show a single summary number per category, not a full distribution

You'll use this exact framework in this week's lab and challenge, and every module from here on.
`);
    console.log(`✓ The Chart Decision Framework (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Chart Selection Challenge");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧩 Chart Selection Challenge

For each of the 15 business questions below, name the chart type you'd reach for **and** explain why, using this week's decision framework. You are not building any charts yet — this is entirely about the judgment call.

1. "Compare total revenue across our 5 product categories."
2. "How has monthly revenue trended over the last two years?"
3. "Is there a relationship between discount percentage and quantity sold?"
4. "What does the distribution of individual order revenue look like?"
5. "Compare the spread of order revenue across our 4 regions."
6. "What share of total revenue does each region represent?"
7. "How does revenue vary by both month and region at the same time?"
8. "Which cities have the highest customer concentration?"
9. "How has each category's share of total revenue shifted over the two years?"
10. "Compare average employee performance score across departments."
11. "Is there a relationship between employee salary and performance score?"
12. "What's the age distribution of our customer base?"
13. "Compare inventory levels across our 40 products (quick overview, not exact numbers)."
14. "How many customers signed up each month since 2021?"
15. "Compare Consumer vs. Corporate vs. Small Business average order revenue."

For question 9, explain why it's a harder case than the others — which two of the framework's six "goals" does it combine?
`);
    console.log(`✓ Lab: Chart Selection Challenge (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Visualization Makeover: Wrong Chart, Right Chart");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🔧 Makeover: Wrong Chart, Right Chart

Below is a chart someone on DataMart's team built — and it's the wrong choice for its question. Run it, look at it critically, then rebuild it correctly.

**The question it's trying to answer:** "Compare average order revenue across all 5 product categories."

**The chart someone built:** a pie chart of *average* revenue (not a share-of-total, which is what pie charts are actually for) with a legend that requires constant back-and-forth eye movement to match colors to labels.

## Your Task

1. Run the "wrong chart" cell and look at it critically — what makes it hard to read?
2. Build the corrected version: a bar chart, sorted by value, with labels directly instead of a separate legend
3. Explain in a comment why the bar chart communicates the same information more clearly
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "The wrong chart: a pie chart of an average (not a share-of-whole), which pie charts aren't built for.",
        code: `${SETUP}
avg_by_category = sales.groupby("category")["revenue"].mean()

plt.figure(figsize=(6, 6))
plt.pie(avg_by_category.values, labels=avg_by_category.index, autopct="%1.0f%%")
plt.title("Average Order Revenue by Category (unclear pie chart)")
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Build the corrected version: a sorted bar chart with direct labels instead of a legend.",
        code: `${SETUP}
avg_by_category = sales.groupby("category")["revenue"].mean().sort_values(ascending=False)

plt.figure(figsize=(7, 4))
bars = plt.bar(avg_by_category.index, avg_by_category.values, color="#0d9488")
plt.title("Average Order Revenue by Category")
plt.ylabel("Average Revenue ($)")
plt.xticks(rotation=15)
for bar, val in zip(bars, avg_by_category.values):
    plt.text(bar.get_x() + bar.get_width() / 2, val, f"\${val:.0f}", ha="center", va="bottom", fontsize=9)
plt.tight_layout()
plt.show()

# Why this is clearer:
# - A pie chart's angle/area encoding isn't built for comparing averages — it implies "share of a whole,"
#   which an average is not. A bar chart's length encoding is read far more accurately (Module 2).
# - Sorting by value lets you read the ranking instantly, without hunting through a legend.
# - Direct value labels remove the need to estimate slice size or match colors to a legend at all.
`,
      },
    ]);
    console.log(`✓ Visualization Makeover (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 3 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "A business question asks to compare a number across 5 categories. What chart type does the framework suggest first?", options: ["Line chart", "Bar chart", "Pie chart", "Scatter plot"], correct_index: 1, explanation: "Comparing categories is a bar chart's core job — length/position encoding, read most accurately." },
      { question_text: "What chart type is best for 'how has monthly revenue changed over 2 years'?", options: ["Bar chart", "Line chart", "Pie chart", "Box plot"], correct_index: 1, explanation: "Trend over time is exactly what line charts are built for — the ordered x-axis and slope carry the meaning." },
      { question_text: "Which chart type is built specifically to show a relationship between two numerical variables?", options: ["Histogram", "Scatter plot", "Pie chart", "Bar chart"], correct_index: 1, explanation: "Scatter plots place two numbers on two axes at once, revealing correlation, clusters, or outliers." },
      { question_text: "What's the main advantage of a box plot over a histogram when comparing distributions across several groups?", options: ["Box plots use more color", "Several box plots line up cleanly side-by-side for comparison; stacking histograms is much harder to compare", "Histograms can't show outliers", "Box plots show more shape detail"], correct_index: 1, explanation: "Box plots compress a distribution into a compact summary specifically so multiple groups can be compared at a glance." },
      { question_text: "Why should pie charts generally be used with caution?", options: ["They can't display percentages", "They rely on angle/area encoding, which is read less accurately than length/position, especially with many or similar-sized slices", "They only work with 2 categories", "They are outdated and never appropriate"], correct_index: 1, explanation: "Pie charts aren't wrong, but their encoding is measurably harder to read precisely — a bar chart usually communicates the same comparison more clearly." },
      { question_text: "What does a heatmap let you show that a single bar or line chart cannot?", options: ["Exact precise values", "How a value varies across two dimensions at once (e.g. month AND region)", "Only categorical data", "3D data"], correct_index: 1, explanation: "Heatmaps use a 2D grid + color to show patterns across two dimensions simultaneously." },
      { question_text: "What is the main risk of a stacked area chart?", options: ["It can't show time", "Every layer except the bottom one is hard to read precisely, since its baseline is another layer's uneven edge", "It only works for one category", "It requires geographic data"], correct_index: 1, explanation: "Stacking makes upper layers' actual values hard to judge, since they don't start from a flat, shared baseline." },
      { question_text: "In the makeover lab, why was a pie chart the wrong choice for showing 'average order revenue by category'?", options: ["Pie charts can't be built in Matplotlib", "An average isn't a 'share of a whole' — the value pie charts are built to represent — and its angle/area encoding is less accurate than a bar's length", "The data had too few categories", "Pie charts are always wrong in every situation"], correct_index: 1, explanation: "Averages aren't parts of a whole, and the pie's encoding is harder to read precisely than a sorted bar chart with labels." },
      { question_text: "A question combines 'trend over time' with 'composition by category.' What does this module say to do?", options: ["It's impossible to visualize", "Recognize it combines two of the framework's goals, and decide which matters more to the audience before choosing", "Always default to a pie chart", "Ignore the composition part"], correct_index: 1, explanation: "The framework is a starting point, not a rigid rule — combined questions need a judgment call about which goal is primary." },
      { question_text: "Which chart type is reserved specifically for geographic questions, covered fully in a later module?", options: ["Histogram", "Map", "Box plot", "Scatter plot"], correct_index: 1, explanation: "Maps are the dedicated tool for location-based patterns, covered in depth in Module 7." },
    ]);
    console.log(`✓ Module 3 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 3 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Bar charts for comparison, line charts for trend — the two most common chart jobs
- Scatter plots for relationships, histograms and box plots for distributions
- Pie/donut, heatmap, and area charts each have a specific, narrower use case — and real limitations worth knowing
- The Chart Decision Framework: compare, trend, distribution, relationship, geography, or composition — pick the goal first, then the chart
- A chart can be technically well-built and still be the *wrong choice* for its question

## Coming Up Next Week

Time to actually build. Module 4 introduces Matplotlib and Seaborn — the tools you'll use to turn every chart type from this week into real, rendering code.
`);
    console.log(`✓ Module 3 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 3 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
