/**
 * Populates Module 4 — Matplotlib & Seaborn (Week 4).
 * Run with: npx ts-node prisma/enrich-dataviz-module4.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 4";
const SETUP = dataMartSetup();

async function main() {
  console.log("🌱  Populating Module 4…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 4 Mission Briefing: Build Your First Visualizations");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🐍 This Week's Mission

Three weeks of theory — why visualization matters, how encoding works, which chart to choose — all lead here. This week you write real Python code and watch real charts render.

## This Week You'll Learn To

- Understand a Matplotlib chart's anatomy: Figure, Axes, titles, labels, legends
- Build the five core chart types from Module 3 as working code
- Use Seaborn for statistical charts that would take much more code in plain Matplotlib

## Why This Matters

Every lab from here forward assumes you're comfortable with this week's syntax. Take your time — this is the toolbox the rest of the course builds on.
`);
    console.log(`✓ Week 4 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Matplotlib Fundamentals: Anatomy of a Chart");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Figure and Axes

Every Matplotlib chart has two core objects:

- **Figure** — the entire canvas/window a chart is drawn on
- **Axes** — the actual plotting area inside the figure (confusingly, "Axes" is one object, not the plural of "axis" — it holds both the x-axis and y-axis)

\`\`\`python
plt.figure(figsize=(7, 4))   # create a Figure, 7 inches wide, 4 tall
plt.bar(["A", "B", "C"], [10, 25, 15])  # draws onto the current Axes
plt.show()   # render it
\`\`\`

## The Essentials Every Chart Needs

\`\`\`python
plt.figure(figsize=(7, 4))
plt.bar(["A", "B", "C"], [10, 25, 15], color="#0d9488")
plt.title("Chart Title")          # what is this chart about?
plt.xlabel("Category")            # what does the x-axis mean?
plt.ylabel("Value")               # what does the y-axis mean?
plt.show()
\`\`\`

A chart with no title or axis labels forces the viewer to guess — always set at least these three.

## Legends

When a chart encodes a third variable through color or marker style, a legend explains the mapping:

\`\`\`python
plt.plot(x1, y1, label="Region A")
plt.plot(x2, y2, label="Region B")
plt.legend()
plt.show()
\`\`\`

## Scale and Formatting

\`\`\`python
plt.xticks(rotation=30)              # rotate x labels so long text doesn't overlap
plt.yscale("log")                    # log scale — useful for very wide-ranging values
plt.tight_layout()                   # auto-fix spacing/overlap issues, use this on nearly every chart
\`\`\`

## Saving a Chart

\`\`\`python
plt.savefig("chart.png", dpi=150, bbox_inches="tight")
\`\`\`

In this course's labs, calling \`plt.show()\` at the end of a cell is what makes the chart render inline — you won't need \`savefig\` here, but it's how you'd export a chart for a slide deck or report in the real world.
`);
    console.log(`✓ Matplotlib Fundamentals (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Building Core Charts with Matplotlib");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Five Core Chart Types, in Code

Each of these follows the same shape: prepare the data, call the chart function, add title/labels, show it.

### Bar Chart

\`\`\`python
by_category = sales.groupby("category")["revenue"].sum().sort_values(ascending=False)
plt.figure(figsize=(7, 4))
plt.bar(by_category.index, by_category.values, color="#0d9488")
plt.title("Revenue by Category")
plt.ylabel("Revenue ($)")
plt.xticks(rotation=15)
plt.tight_layout()
plt.show()
\`\`\`

### Line Chart

\`\`\`python
monthly = sales.set_index("order_date").resample("ME")["revenue"].sum()
plt.figure(figsize=(8, 4))
plt.plot(monthly.index, monthly.values, marker="o", color="#0d9488")
plt.title("Monthly Revenue Over Time")
plt.ylabel("Revenue ($)")
plt.tight_layout()
plt.show()
\`\`\`

### Scatter Plot

\`\`\`python
plt.figure(figsize=(6, 5))
plt.scatter(sales["discount"], sales["quantity"], alpha=0.3, color="#0d9488")
plt.title("Discount vs. Quantity Sold")
plt.xlabel("Discount")
plt.ylabel("Quantity")
plt.tight_layout()
plt.show()
\`\`\`

### Histogram

\`\`\`python
plt.figure(figsize=(7, 4))
plt.hist(sales["revenue"], bins=30, color="#0d9488", edgecolor="white")
plt.title("Distribution of Order Revenue")
plt.xlabel("Revenue ($)")
plt.ylabel("Number of Orders")
plt.tight_layout()
plt.show()
\`\`\`

### Box Plot

\`\`\`python
regions = ["North", "South", "East", "West"]
data_by_region = [sales.loc[sales["region"] == r, "revenue"] for r in regions]
plt.figure(figsize=(7, 4))
plt.boxplot(data_by_region, labels=regions)
plt.title("Order Revenue Distribution by Region")
plt.ylabel("Revenue ($)")
plt.tight_layout()
plt.show()
\`\`\`

## Try It Yourself

In the lab, you'll build all five of these against DataMart's real data — then modify at least one to answer a slightly different question.
`);
    console.log(`✓ Building Core Charts with Matplotlib (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Seaborn: Statistical Visualization Made Easy");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Why Seaborn?

Seaborn is built on top of Matplotlib, aimed specifically at statistical visualization — it takes charts that would need many lines of Matplotlib and reduces them to one call, with better default styling.

## Seaborn Equivalents

### A Nicer Box Plot

\`\`\`python
import seaborn as sns
plt.figure(figsize=(7, 4))
sns.boxplot(data=sales, x="region", y="revenue", hue="region", legend=False)
plt.title("Order Revenue Distribution by Region (Seaborn)")
plt.tight_layout()
plt.show()
\`\`\`

Compare this to the Matplotlib version from the last lesson — no manual data-splitting into a list per region required. Seaborn understands "give me \`y\` grouped by \`x\`" directly from a DataFrame.

### A Histogram With a Smoothed Curve

\`\`\`python
plt.figure(figsize=(7, 4))
sns.histplot(sales["revenue"], bins=30, kde=True, color="#0d9488")
plt.title("Distribution of Order Revenue, With Density Curve")
plt.tight_layout()
plt.show()
\`\`\`

The \`kde=True\` option overlays a smoothed density curve — useful for reading a distribution's overall shape at a glance.

### A Scatter Plot With a Trend Line

\`\`\`python
plt.figure(figsize=(6, 5))
sns.regplot(data=sales.sample(300, random_state=1), x="discount", y="quantity", scatter_kws={"alpha": 0.3, "color": "#0d9488"}, line_kws={"color": "#dc2626"})
plt.title("Discount vs. Quantity, With Trend Line")
plt.tight_layout()
plt.show()
\`\`\`

\`sns.regplot\` fits and draws a trend line automatically — in plain Matplotlib this would need a separate regression calculation.

## When to Reach for Which

- **Matplotlib** — full control, any custom chart, the foundation Seaborn is built on
- **Seaborn** — statistical charts involving grouping, distributions, or relationships, faster and with better defaults

Most real analysts use both together: Seaborn for the statistical chart itself, plain Matplotlib calls (\`plt.title\`, \`plt.xlabel\`, ...) for final polish — exactly like the examples above.
`);
    console.log(`✓ Seaborn (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Five Charts, Five Questions");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🐍 Five Charts, Five Questions

Build all five core chart types against DataMart's sales data. For each one, the instructions cell tells you the question — write the chart, then add a comment answering: **what did you discover?**
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Chart 1 — Bar: 'Which category earns the most total profit?'",
        code: `${SETUP}
by_category = sales.groupby("category")["profit"].sum().sort_values(ascending=False)
plt.figure(figsize=(7, 4))
plt.bar(by_category.index, by_category.values, color="#0d9488")
plt.title("Total Profit by Category")
plt.ylabel("Profit ($)")
plt.xticks(rotation=15)
plt.tight_layout()
plt.show()

# What I discovered:
#
`,
      },
      {
        instructions: "Chart 2 — Line: 'How has monthly profit trended over the two years?'",
        code: `${SETUP}
monthly_profit = sales.set_index("order_date").resample("ME")["profit"].sum()
plt.figure(figsize=(8, 4))
plt.plot(monthly_profit.index, monthly_profit.values, marker="o", color="#0d9488")
plt.title("Monthly Profit Over Time")
plt.ylabel("Profit ($)")
plt.tight_layout()
plt.show()

# What I discovered:
#
`,
      },
      {
        instructions: "Chart 3 — Scatter: 'Is there a relationship between quantity and profit per order?'",
        code: `${SETUP}
plt.figure(figsize=(6, 5))
plt.scatter(sales["quantity"], sales["profit"], alpha=0.3, color="#0d9488")
plt.title("Quantity vs. Profit per Order")
plt.xlabel("Quantity")
plt.ylabel("Profit ($)")
plt.tight_layout()
plt.show()

# What I discovered:
#
`,
      },
      {
        instructions: "Chart 4 — Histogram: 'What does the distribution of customer ages look like?'",
        code: `${SETUP}
plt.figure(figsize=(7, 4))
plt.hist(customers["age"], bins=20, color="#0d9488", edgecolor="white")
plt.title("Distribution of Customer Ages")
plt.xlabel("Age")
plt.ylabel("Number of Customers")
plt.tight_layout()
plt.show()

# What I discovered:
#
`,
      },
      {
        instructions: "Chart 5 — Box Plot: 'How does order revenue spread differ by customer segment?'",
        code: `${SETUP}
sales_seg = sales.merge(customers[["customer_id", "customer_segment"]], on="customer_id")
segments = ["Consumer", "Corporate", "Small Business"]
data_by_segment = [sales_seg.loc[sales_seg["customer_segment"] == s, "revenue"] for s in segments]
plt.figure(figsize=(7, 4))
plt.boxplot(data_by_segment, labels=segments)
plt.title("Order Revenue Distribution by Customer Segment")
plt.ylabel("Revenue ($)")
plt.tight_layout()
plt.show()

# What I discovered:
#
`,
      },
    ]);
    console.log(`✓ Lab: Five Charts, Five Questions (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Choose Your Own Charts");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Challenge: Choose Your Own Charts

This time, no chart type is specified. Using the Chart Decision Framework from Module 3, decide what to build yourself for each question, then write the code.

1. "Which employee department has the highest average salary?"
2. "Is there a relationship between employee tenure (hire_date) and performance score?"
3. "What does the distribution of product prices look like across our 40 products?"

For each, write a comment stating which chart type you chose and why, before writing the code.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Work through all 3 questions — choose your own chart type for each, using the Module 3 framework.",
        code: `${SETUP}
# Question 1: chart type chosen = ___, because ___


# Question 2: chart type chosen = ___, because ___


# Question 3: chart type chosen = ___, because ___

`,
      },
    ]);
    console.log(`✓ Challenge: Choose Your Own Charts (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 4 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "In Matplotlib, what is the difference between a Figure and an Axes?", options: ["They are the same thing", "The Figure is the entire canvas/window; the Axes is the actual plotting area inside it", "Axes is only used for 3D charts", "Figure is for bar charts, Axes is for line charts"], correct_index: 1, explanation: "Figure is the outer canvas, Axes is the plotting area (holding the x/y axes) within it." },
      { question_text: "Why should every chart have a title and axis labels?", options: ["It's required by Matplotlib to run", "Without them, the viewer has to guess what the chart represents", "It makes the code run faster", "Only bar charts need labels"], correct_index: 1, explanation: "Titles and labels are the minimum needed for a chart to be self-explanatory." },
      { question_text: "What does plt.tight_layout() do?", options: ["Saves the chart to a file", "Automatically fixes spacing/overlap issues in a chart", "Changes the chart's colors", "Adds a legend"], correct_index: 1, explanation: "tight_layout() adjusts spacing so labels/titles don't get cut off or overlap — good practice on nearly every chart." },
      { question_text: "What is Seaborn built on top of?", options: ["Pandas only", "Matplotlib", "A completely separate rendering engine", "Excel"], correct_index: 1, explanation: "Seaborn is a statistical visualization layer built on top of Matplotlib." },
      { question_text: "What's the main advantage of sns.boxplot(data=df, x=..., y=...) over manually building a Matplotlib box plot?", options: ["It's identical in effort", "Seaborn groups data by a column directly from a DataFrame, without manually splitting it into separate lists first", "Matplotlib can't make box plots at all", "Seaborn doesn't support box plots"], correct_index: 1, explanation: "Seaborn's DataFrame-aware API groups data automatically — Matplotlib requires manually splitting data per group." },
      { question_text: "What does sns.histplot(..., kde=True) add to a histogram?", options: ["A legend", "A smoothed density curve overlay showing the distribution's overall shape", "Multiple colors", "A title"], correct_index: 1, explanation: "kde=True overlays a kernel density estimate curve, making the distribution's shape easier to read at a glance." },
      { question_text: "What does sns.regplot() add automatically that plain Matplotlib scatter doesn't?", options: ["Axis labels", "A fitted trend line, calculated automatically", "A title", "Color grouping"], correct_index: 1, explanation: "regplot() fits and draws a regression trend line without a separate manual calculation." },
      { question_text: "When should you reach for plain Matplotlib instead of Seaborn?", options: ["Never — always use Seaborn", "When you need full control over a custom chart, or for final polish on titles/labels/formatting", "Matplotlib can only make bar charts", "Only for geographic data"], correct_index: 1, explanation: "Matplotlib gives full low-level control and is often used for final formatting even on top of a Seaborn chart." },
      { question_text: "In the code samples, what does plt.savefig() do?", options: ["Displays the chart inline", "Exports the chart to an image file, e.g. for a slide deck or report", "Deletes the chart", "Only works with line charts"], correct_index: 1, explanation: "savefig() writes the current figure to a file — useful outside this course's inline lab rendering." },
      { question_text: "Why do most real analysts use both Matplotlib and Seaborn together?", options: ["They are required to be used together", "Seaborn handles statistical chart logic well; Matplotlib calls add final polish like titles/labels", "Seaborn can't render charts on its own", "It's faster to import both"], correct_index: 1, explanation: "Seaborn (built on Matplotlib) handles statistical grouping elegantly, while plain Matplotlib functions still handle titles, labels, and fine formatting." },
    ]);
    console.log(`✓ Module 4 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 4 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Every Matplotlib chart has a Figure (canvas) and Axes (plotting area)
- Titles, axis labels, legends, and \`tight_layout()\` belong on nearly every chart you build
- You built all five core chart types — bar, line, scatter, histogram, box plot — with real DataMart data
- Seaborn reduces statistical charts (grouped box plots, distributions with density curves, trend lines) to a single call with better defaults
- You chose your own chart types for new questions, without being told which to use

## Coming Up Next Week

You can now build any chart you choose — but a technically correct chart can still be confusing, cluttered, or misleading. Module 5 covers the design principles that turn a working chart into a clear one.
`);
    console.log(`✓ Module 4 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 4 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
