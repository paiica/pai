/**
 * Populates Module 10 — Final Visual Analytics Project (Week 10).
 * Run with: npx ts-node prisma/enrich-dataviz-module10.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, findSublesson, writeLessonContent, attachLab, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 10";
const SETUP = dataMartSetup();

async function main() {
  console.log("🌱  Populating Module 10 (Capstone)…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Welcome to Your Capstone");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🏆 You've Arrived at Week 10

Nine weeks ago, a table of numbers was just a table of numbers. Now you can look at a new dataset, know what chart to build, build it correctly, make it clear and honest, use it to find patterns, combine several into a dashboard, and turn the whole thing into a story someone can act on. This week proves you can do all of it, independently.

## What a Capstone Is (and Isn't)

There is no new technique to learn this week. The challenge is entirely in applying nine weeks of skills to a single, realistic business problem — start to finish, with nobody telling you which chart to use at each step.

## How This Week Works

1. **Review** everything you've learned, module by module
2. Read **the capstone scenario** — a realistic ask from DataMart's leadership team
3. Work through **four guided stages**: understanding the data and defining questions, exploring, building final visuals and a dashboard, and telling the story
4. Finish with a short **executive summary** — a real deliverable, portfolio-ready

Take your time. This is the week everything else was building toward.
`);
    console.log(`✓ Welcome to Your Capstone (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Review: Everything You've Learned");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Your Visualization Toolkit, Module by Module

**Module 1 — Why Visualization Matters**
Chart vs. table vs. number; exploratory vs. explanatory visualization.

**Module 2 — Data & Visual Encoding**
Data types (categorical, numerical, time-series, geographic); position/length/size/color/shape/angle/area, and Cleveland's accuracy ranking.

**Module 3 — Choosing the Right Chart**
The Chart Decision Framework: compare, trend, distribution, relationship, geography, composition.

**Module 4 — Matplotlib & Seaborn**
Figure/Axes, the five core chart types in real code, Seaborn for statistical charts.

**Module 5 — Design Principles & Visual Clarity**
Simplicity, hierarchy, color scales and accessibility, and the specific techniques that make a chart misleading.

**Module 6 — Exploratory Data Visualization**
Distribution, spread, outliers, correlation heatmaps, pair plots, segmentation — investigating a new dataset with no instructions.

**Module 7 — Time-Series & Geographic Visualization**
Resampling, seasonality, moving averages; geographic comparison and this platform's practical alternative to maps.

**Module 8 — Dashboards & Business Intelligence**
Dashboard vs. report, KPIs with context, dashboard layout and hierarchy, what BI tools like Tableau/Power BI add.

**Module 9 — Data Storytelling**
Chart ≠ insight ≠ recommendation; the five-part story structure; titles and annotations as communication.

## The Big Picture

Every one of these fits into one workflow, used throughout the entire course:

**Raw Data → Question → Visual → Interpretation → Insight → Story → Decision**

Keep this in mind all week — it's the actual structure your capstone will follow.
`);
    console.log(`✓ Review: Everything You've Learned (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "The Capstone Scenario");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📋 Your Assignment

You've just joined **DataMart Analytics** as a data visualization analyst. Leadership is planning next year's strategy and has one broad ask: **"Help us understand our sales performance, customer behavior, product performance, and regional trends — and tell us what we should do about it."**

That's deliberately open-ended. Real business requests usually are. Your job is to turn it into specific questions, then specific visualizations, then a specific recommendation.

## The Data You Already Know

- **sales** — every order: date, customer, product, category, region, quantity, revenue, profit, discount
- **customers** — who buys from DataMart: age, segment, city, region, signup date
- **products** — what DataMart sells: category, price, cost, inventory
- **employees** — DataMart's team: department, salary, performance score, hire date

## The Capstone Ahead

The next lesson, **Capstone Project: DataMart Visual Analytics**, is broken into four stages:

1. **Data Understanding & Questions** — describe the data, define what you're actually trying to find out
2. **Exploratory Visualizations** — investigate distribution, comparison, relationship, and trend
3. **Final Visualizations & Dashboard** — build the polished, audience-ready deliverable
4. **Data Story & Recommendations** — turn it all into a decision-ready story

## How to Approach It

Use the workflow from every module this course: start from a real question, not a chart type. Use the Chart Decision Framework from Module 3 for every visualization. Apply Module 5's clarity principles to everything you build for the final stage. Nothing in this capstone requires a technique you haven't already practiced — the challenge is doing it independently, end to end.

Good luck. Leadership is waiting. 🚀
`);
    console.log(`✓ The Capstone Scenario (${blocks} blocks)`);
  }

  const parent = await findLesson(prisma, SLUG, MOD, "Capstone Project: DataMart Visual Analytics");
  await writeLessonContent(prisma, parent.id, `
## 🏆 Capstone Project: DataMart Visual Analytics

Work through all four stages below, in order. Each stage is its own sublesson with its own lab.

1. **Data Understanding & Questions** — describe the data, define your analytical and business questions
2. **Exploratory Visualizations** — distribution, comparison, relationship, and time-series charts
3. **Final Visualizations & Dashboard** — your polished, audience-ready deliverable
4. **Data Story & Recommendations** — turn your findings into a decision-ready story

Open each stage below to continue.
`);
  console.log(`✓ Capstone Project: DataMart Visual Analytics (parent overview)`);

  {
    const s = await findSublesson(prisma, SLUG, MOD, "Capstone Project: DataMart Visual Analytics", "Data Understanding & Questions");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 1: Data Understanding & Questions

Before building a single chart, ground yourself in the data and the ask — exactly like Module 9's "Context" and "Problem" steps.

## Your Task

1. **Describe the dataset**: what tables are available, what does each row represent, who's the audience for this analysis (DataMart's leadership team)?
2. **Define at least 3 analytical questions** — specific, answerable-with-a-chart questions (e.g. "How does order revenue vary by region?")
3. **Define at least 3 business questions** — what leadership actually cares about, which your analytical questions should help answer (e.g. "Where should we focus next year's marketing budget?")

Write your answers as comments in the lab below — no charts yet, this stage is purely framing, exactly like Module 1's "Choose Without Charting."
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "Write your data understanding and questions as comments.",
        code: `# --- Data Understanding ---
# Tables available:
#
# What each row represents:
#
# Audience for this analysis:
#

# --- Analytical Questions (at least 3) ---
# 1.
# 2.
# 3.

# --- Business Questions (at least 3) ---
# 1.
# 2.
# 3.
`,
      },
    ]);
    console.log(`✓ Sublesson: Data Understanding & Questions (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, "Capstone Project: DataMart Visual Analytics", "Exploratory Visualizations");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 2: Exploratory Visualizations

Using Module 6's EDA techniques, build at least one chart of each type below, investigating your own questions from Stage 1.

## Required Charts

1. **A distribution visualization** (histogram or box plot)
2. **A comparison visualization** (bar chart)
3. **A relationship visualization** (scatter plot or correlation heatmap)
4. **A time-series visualization** (line chart)

A starting example is provided for the distribution chart — build the remaining three yourself.
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "Distribution — a worked example to start from.",
        code: `${SETUP}
plt.figure(figsize=(7, 4))
plt.hist(sales["revenue"], bins=30, color="#0d9488", edgecolor="white")
plt.title("Distribution of Order Revenue")
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Comparison — build a bar chart answering one of your Stage 1 questions.",
        code: `${SETUP}
# Build your comparison chart here

`,
      },
      {
        instructions: "Relationship — build a scatter plot or correlation heatmap.",
        code: `${SETUP}
# Build your relationship chart here

`,
      },
      {
        instructions: "Time-series — build a trend chart over the two-year period.",
        code: `${SETUP}
# Build your time-series chart here

`,
      },
    ]);
    console.log(`✓ Sublesson: Exploratory Visualizations (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, "Capstone Project: DataMart Visual Analytics", "Final Visualizations & Dashboard");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 3: Final Visualizations & Dashboard

Now build the polished, audience-ready version of your analysis — applying Module 5's design principles and Module 8's dashboard techniques.

## Your Task

1. Pick your **single strongest finding** from Stage 2's exploration
2. Build **one polished final chart** for it: strong claim-stating title (Module 9), clean color, no clutter
3. Build a **dashboard** combining a KPI summary, a trend, a comparison, and a breakdown — following Module 8's layout and hierarchy principles
`);
    await attachLab(prisma, s.id, [
      {
        instructions: "Build your one polished, presentation-ready chart.",
        code: `${SETUP}
# Build your final, polished chart here — strong title, clean design

`,
      },
      {
        instructions: "Build your dashboard: KPI summary, trend, comparison, breakdown, following Module 8's layout.",
        code: `${SETUP}
fig, axes = plt.subplots(2, 2, figsize=(12, 8))

# KPI panel


# Trend panel


# Comparison panel


# Breakdown panel


fig.suptitle("DataMart Analytics — Capstone Dashboard", fontsize=16, fontweight="bold")
plt.tight_layout()
plt.show()
`,
      },
    ]);
    console.log(`✓ Sublesson: Final Visualizations & Dashboard (${blocks} blocks, lab attached)`);
  }

  {
    const s = await findSublesson(prisma, SLUG, MOD, "Capstone Project: DataMart Visual Analytics", "Data Story & Recommendations");
    const { blocks } = await writeLessonContent(prisma, s.id, `
## Stage 4: Data Story & Recommendations

## Write Your Executive Summary

Using Module 9's five-part structure and the full chain (Data → Visualization → Pattern → Insight → Business Meaning → Recommendation), write a short executive summary of your capstone analysis — a few sentences is enough for each part.

- **Context** — one sentence
- **Problem** — one sentence
- **Evidence** — reference your Stage 2/3 charts
- **Insight** — what the evidence actually means, in plain language
- **Action** — a specific, evidence-based recommendation for DataMart's leadership

## Example (Don't Copy — Use Your Own Findings)

> "DataMart is planning next year's regional marketing budget. Leadership needs to know where investment would have the most impact. Our analysis shows the West region generates 45% more revenue than the South, our weakest region, despite similar customer counts. This suggests region-specific factors — not simply budget size — are driving the gap. We recommend investigating what's working in the West before finalizing an even budget split across all four regions."

## You're Done

There's no lab to run in this final stage — this is about turning everything you've built into a written recommendation, the real final step of the workflow you've practiced all course. When you're happy with your executive summary, move on to the course conclusion.

## Your Portfolio

By now you have several polished visualizations, a full dashboard, and a written data story — genuinely portfolio-ready work. Keep it organized: it's a real demonstration of exactly the skill this course set out to teach.
`);
    console.log(`✓ Sublesson: Data Story & Recommendations (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Course Conclusion: From Data to Insight");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🎉 From Data to Insight

Ten weeks ago, a chart might have just meant "whatever Excel makes when I click the chart button." Now you can look at a real, messy dataset and know exactly what to build, why, and what to say about it once you have.

## Everything You Can Now Do

- Explain why visualization works, and when a table or single number is actually the better choice
- Match any business question to the right chart type, using a real decision framework
- Build real, rendering charts in Matplotlib and Seaborn
- Apply design principles — hierarchy, color, accessibility — so a chart is clear, not just correct
- Spot and fix a misleading chart, and hold your own work to the same standard
- Use visualization to explore a brand-new dataset and find genuine patterns
- Visualize time-series and geographic data appropriately
- Design a dashboard around real KPIs with real context, not isolated numbers
- Turn a set of charts into a coherent, decision-driving data story

## A Note on This Platform's Adaptations

Two things worth remembering as you move into a professional tool: this course's labs ran entirely in Python (Matplotlib/Seaborn), since that's what this platform's sandbox supports — a real Tableau/Power BI environment adds live data connections and built-in interactivity on top, but every principle you practiced (chart choice, encoding, color, clarity, honest axes, storytelling) transfers directly and unchanged. Similarly, geographic visualization used region-grouped charts instead of true choropleth maps — the concepts are the same; only the specific tool differs.

## Where to Go From Here

- Try a real BI tool (Tableau Public and Power BI both have free versions) and rebuild one of your capstone charts in it
- Look for a public dataset that genuinely interests you, and run your own full workflow on it: question → chart → insight → story
- Revisit "SQL for Beginners" or "Python for Beginners" if you haven't already — a data visualization analyst who can also query and wrangle data independently is a genuinely valuable combination

You went from data to insight. Congratulations. 🏆
`);
    console.log(`✓ Course Conclusion (${blocks} blocks)`);
  }

  console.log("\n✅  Module 10 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
