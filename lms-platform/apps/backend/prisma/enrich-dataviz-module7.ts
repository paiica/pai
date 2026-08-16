/**
 * Populates Module 7 — Time-Series & Geographic Visualization (Week 7).
 * Run with: npx ts-node prisma/enrich-dataviz-module7.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 7";
const SETUP = dataMartSetup();

async function main() {
  console.log("🌱  Populating Module 7…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 7 Mission Briefing: Analyze Time & Place");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🌎 This Week's Mission

Two data types are common enough, and specific enough, to deserve their own dedicated techniques: **time** and **place**. Nearly every business dataset has a date column and a location column — this week makes sure you can visualize both correctly.

## This Week You'll Learn To

- Visualize trends, seasonality, and period-over-period comparisons in time-series data
- Visualize geographic patterns — and know this platform's real limitations for doing so
- Recognize when a map is actually the *wrong* choice, even for geographic data

## A Platform Note, Upfront

This course's lab sandbox runs Python (pandas/Matplotlib/Seaborn) — it does not have a mapping library like GeoPandas or Folium available, and interactive map output can't render in this lab UI at all. You'll learn the real concepts and see how professional choropleth/symbol maps work, and build the *practical alternative* this platform actually supports: geographic comparison through bar charts and heatmaps grouped by region. This is a genuine, common technique in real analytics work, not just a workaround.
`);
    console.log(`✓ Week 7 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Visualizing Trends Over Time");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## The Building Block: A Line Chart Over Time

You've built these since Module 4 — but time-series visualization has a few techniques specifically worth knowing.

## Resampling: Choosing the Right Time Granularity

Daily sales data is often too noisy to show a clear trend. Resampling to a coarser period smooths it out:

\`\`\`python
monthly = sales.set_index("order_date").resample("ME")["revenue"].sum()  # "ME" = month end
plt.figure(figsize=(9, 4))
plt.plot(monthly.index, monthly.values, marker="o", color="#0d9488")
plt.title("Monthly Revenue Over Time")
plt.tight_layout()
plt.show()
\`\`\`

## Seasonality

**Seasonality** is a pattern that repeats at a regular interval — sales spiking every December, traffic dropping every weekend. Plotting each year as a separate line, aligned by month, makes seasonality directly visible:

\`\`\`python
ts = sales.set_index("order_date").resample("ME")["revenue"].sum().reset_index()
ts["year"] = ts["order_date"].dt.year
ts["month"] = ts["order_date"].dt.month

plt.figure(figsize=(8, 4))
for year, grp in ts.groupby("year"):
    plt.plot(grp["month"], grp["revenue"], marker="o", label=str(year))
plt.title("Monthly Revenue by Year — Spotting Seasonality")
plt.xlabel("Month")
plt.legend(title="Year")
plt.tight_layout()
plt.show()
\`\`\`

## Moving Averages (Conceptually)

A **moving average** smooths short-term noise by averaging each point with its neighbors — e.g. a 3-month moving average replaces each month's value with the average of it and the two before it. This makes the underlying trend easier to see through noisy month-to-month swings:

\`\`\`python
monthly_series = sales.set_index("order_date").resample("ME")["revenue"].sum()
moving_avg = monthly_series.rolling(window=3).mean()

plt.figure(figsize=(9, 4))
plt.plot(monthly_series.index, monthly_series.values, alpha=0.4, label="Actual monthly revenue")
plt.plot(moving_avg.index, moving_avg.values, color="#dc2626", linewidth=2, label="3-month moving average")
plt.legend()
plt.title("Monthly Revenue With a Smoothed Trend Line")
plt.tight_layout()
plt.show()
\`\`\`

## Comparing Periods

"How does this year compare to last year?" is common enough to deserve a specific technique — plotting both years on the same month-aligned x-axis (exactly like the seasonality chart above) makes year-over-year comparison direct, instead of asking a viewer to mentally shift one line relative to the other.
`);
    console.log(`✓ Visualizing Trends Over Time (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Visualizing Geographic Patterns");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Real Map Types (Concepts)

**Choropleth maps** shade geographic regions (countries, states, provinces) by a data value — darker means higher, following the same sequential-color-scale principle from Module 5. Used for "which state has the highest sales" style questions.

**Symbol maps** place a marker (often sized or colored by value) at a specific point location — a city, a store, an event. Used for point-based data rather than region-based data.

Both require an actual mapping/GIS library (GeoPandas, Folium, Plotly) with real geographic boundary data — outside what this course's lab sandbox supports, as noted at the start of this module.

## Geographic Aggregation

Before any map gets built, geographic data usually needs aggregating to the right level first — individual customer addresses rolled up to city, city rolled up to region, exactly like DataMart's \`region\` column already represents an aggregation of individual cities.

## The Practical Alternative This Course Uses

A bar chart or heatmap grouped by region communicates the same regional comparison a choropleth map would, without needing geographic boundary data at all:

\`\`\`python
by_region = sales.groupby("region")["revenue"].sum().sort_values(ascending=False)
plt.figure(figsize=(7, 4))
plt.bar(by_region.index, by_region.values, color="#0d9488")
plt.title("Revenue by Region")
plt.tight_layout()
plt.show()
\`\`\`

For two dimensions at once (region AND month, for example), a heatmap works the same way it did in Module 6:

\`\`\`python
import seaborn as sns
pivot = sales.assign(month=sales["order_date"].dt.to_period("M").astype(str)).pivot_table(
    index="region", columns="month", values="revenue", aggfunc="sum"
)
plt.figure(figsize=(10, 4))
sns.heatmap(pivot, cmap="YlGnBu")
plt.title("Revenue by Region and Month")
plt.tight_layout()
plt.show()
\`\`\`

## Limitations of Maps (Real or Substitute)

- A map can only show what geographic boundaries you actually have — a country-level map hides city-level variation
- Area on a map doesn't correlate with population or business volume — a huge, sparsely-populated region can visually dominate a map while representing very little actual data
- If the real comparison isn't inherently about *location*, a map often communicates worse than a plain bar chart — the next lesson makes this case directly
`);
    console.log(`✓ Visualizing Geographic Patterns (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Time & Place");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🌎 Time & Place

Build one time-series visualization and one geographic visualization against DataMart's data, then explain the insight each one reveals.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Time: build a monthly revenue trend with a 3-month moving average overlaid.",
        code: `${SETUP}
monthly_series = sales.set_index("order_date").resample("ME")["revenue"].sum()
moving_avg = monthly_series.rolling(window=3).mean()

plt.figure(figsize=(9, 4))
plt.plot(monthly_series.index, monthly_series.values, alpha=0.4, label="Actual")
plt.plot(moving_avg.index, moving_avg.values, color="#dc2626", linewidth=2, label="3-month moving average")
plt.title("Monthly Revenue Trend")
plt.legend()
plt.tight_layout()
plt.show()

# Insight:
#
`,
      },
      {
        instructions: "Place: build a regional comparison (this platform's practical alternative to a choropleth map).",
        code: `${SETUP}
by_region = sales.groupby("region")["profit"].sum().sort_values(ascending=False)
plt.figure(figsize=(7, 4))
plt.bar(by_region.index, by_region.values, color="#0d9488")
plt.title("Profit by Region")
plt.ylabel("Profit ($)")
plt.tight_layout()
plt.show()

# Insight:
#
`,
      },
    ]);
    console.log(`✓ Lab: Time & Place (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: When Is a Map Worse Than a Bar Chart?");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Challenge: When Is a Map Worse Than a Bar Chart?

Maps feel like the "correct" choice for anything geographic — but they aren't automatically the best choice. Answer:

1. DataMart has exactly 4 regions. Would a choropleth map or a simple bar chart more clearly let someone rank the regions by revenue? Why?
2. Under what circumstances would a map genuinely communicate something a bar chart couldn't?
3. A colleague wants to map "revenue per country" but 90% of DataMart's revenue comes from just 2 countries, with tiny amounts from 15 others. What problem would a choropleth map run into here, and what would you suggest instead?

This is the same judgment-call skill from Module 3's chart framework, applied specifically to geographic data.
`);
    console.log(`✓ Challenge: When Is a Map Worse Than a Bar Chart? (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 7 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What is 'resampling' in time-series visualization?", options: ["Deleting old data", "Aggregating data to a coarser time granularity (e.g. daily to monthly) to reduce noise", "Randomly sampling rows", "A type of map"], correct_index: 1, explanation: "Resampling smooths noisy fine-grained data by summarizing it at a coarser time interval." },
      { question_text: "What is seasonality?", options: ["A chart color scheme", "A pattern that repeats at a regular interval, like sales spiking every December", "Any upward trend", "A type of outlier"], correct_index: 1, explanation: "Seasonality is a regularly repeating pattern, often visualized by plotting multiple years aligned by month." },
      { question_text: "What does a moving average do?", options: ["Deletes outliers", "Smooths short-term noise by averaging each point with its neighboring points", "Converts categorical data to numerical", "Only works on geographic data"], correct_index: 1, explanation: "A moving average (e.g. 3-month) reduces noise so the underlying trend is easier to see." },
      { question_text: "What is a choropleth map?", options: ["A type of bar chart", "A map that shades geographic regions by a data value, using color intensity", "A pie chart variant", "A 3D scatter plot"], correct_index: 1, explanation: "Choropleth maps use a sequential/diverging color scale across regions — same principle as Module 5's color lessons, applied to geography." },
      { question_text: "Why does this course's lab use bar charts/heatmaps by region instead of real choropleth maps?", options: ["Bar charts are always better than maps", "This platform's lab sandbox doesn't have a mapping/GIS library available, and can't render interactive map output at all", "Choropleth maps are outdated", "DataMart has no regional data"], correct_index: 1, explanation: "This is a stated, deliberate platform limitation — a practical, honest adaptation, not a claim that maps are never useful." },
      { question_text: "What is a real limitation of maps, even outside this platform's constraints?", options: ["Maps have no limitations", "Area on a map doesn't correlate with population or business volume — a large, sparse region can visually dominate", "Maps can't use color", "Maps only work with categorical data"], correct_index: 1, explanation: "A visually large region can misleadingly dominate a map even if it represents very little of the actual data." },
      { question_text: "For DataMart's exactly 4 regions, why might a simple bar chart communicate a ranking more clearly than a map?", options: ["Bar charts are always better regardless of context", "With few, non-adjacent categories, position/length (bar chart) is a more accurate encoding for ranking than color intensity across arbitrary shapes on a map", "Maps can't show 4 categories", "Bar charts require less data"], correct_index: 1, explanation: "Ranking by value is exactly what bar length communicates best — a map's value comes from showing spatial relationships, which isn't the point of a simple 4-region ranking." },
      { question_text: "What problem would a choropleth map likely have if 90% of revenue comes from just 2 of 17 countries?", options: ["No problem at all", "Most of the map would look nearly blank/uniform, making the map far less informative than a simple ranked bar chart of the top countries", "Maps can't show percentages", "The map would show too much detail"], correct_index: 1, explanation: "Extreme concentration in a couple of categories is usually better shown by a ranked bar chart than a mostly-empty-looking map." },
      { question_text: "What does 'geographic aggregation' mean?", options: ["Deleting geographic data", "Rolling up individual locations to a coarser geographic level, e.g. addresses to city, city to region", "Converting a map to a bar chart", "A type of outlier detection"], correct_index: 1, explanation: "Aggregation groups finer-grained locations into broader geographic units before visualizing." },
      { question_text: "What's the core lesson of this module's final challenge?", options: ["Always use a map for geographic data", "A chart type being technically 'correct' for the data type doesn't automatically make it the clearest choice for the specific question", "Bar charts should never be used for geographic data", "Maps are obsolete"], correct_index: 1, explanation: "Just like Module 3's framework, geographic data still requires judgment about which specific chart communicates the question best." },
    ]);
    console.log(`✓ Module 7 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 7 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Resampling smooths noisy time-series data to reveal trends
- Plotting years aligned by month reveals seasonality and enables year-over-year comparison
- Moving averages smooth short-term noise while preserving the underlying trend
- Choropleth and symbol maps are the standard tools for geographic data — this platform substitutes region-grouped bar charts and heatmaps
- A map isn't automatically the best choice for geographic data — the same judgment from Module 3 applies

## Coming Up Next Week

Individual charts are one thing — combining several into a single, coherent view for a real audience is another skill entirely. Module 8 covers dashboards, KPIs, and business intelligence platforms.
`);
    console.log(`✓ Module 7 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 7 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
