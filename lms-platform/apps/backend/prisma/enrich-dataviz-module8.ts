/**
 * Populates Module 8 — Dashboards & Business Intelligence (Week 8).
 * Run with: npx ts-node prisma/enrich-dataviz-module8.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 8";
const SETUP = dataMartSetup();

async function main() {
  console.log("🌱  Populating Module 8…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 8 Mission Briefing: Build the Dashboard");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📊 This Week's Mission

Every chart so far has answered one question. A **dashboard** answers several at once, for someone who's going to come back and check it regularly — a fundamentally different design problem.

## This Week You'll Learn To

- Explain what makes a dashboard different from a one-off report
- Design KPIs that actually mean something, with context instead of isolated numbers
- Understand what Tableau and Power BI add on top of everything you already know
- Build a static, multi-panel dashboard combining several chart types into one coherent view

## A Platform Note, Upfront

This lab sandbox renders static images — no clickable filters, no drill-down, no live interactivity. You'll learn these concepts fully (they're standard in any real BI tool), and build the practical alternative this platform supports: a well-organized multi-panel dashboard layout, with "filtering" simulated by writing code that pre-filters the data, exactly like a real filter control would.
`);
    console.log(`✓ Week 8 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "What Makes a Dashboard Work");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Dashboard vs. Report

A **report** is built once, for one moment — a specific analysis, delivered and done. A **dashboard** is built to be checked *repeatedly*, by someone who needs an up-to-date read on how things are going, at a glance, every time they open it.

That difference changes everything about how you design one.

## What a Dashboard Should Answer

A well-designed dashboard answers four questions, at a glance:

1. **What is happening?** — the current state, usually via KPIs
2. **Why is it happening?** — a breakdown that explains the top-level number
3. **Where is it happening?** — a segment or region view
4. **What should I investigate?** — something that stands out as unusual, worth a closer look

## Layout and Information Hierarchy

The most important number goes top-left (where eyes land first, in left-to-right reading cultures) and largest. Supporting detail goes below or to the side, smaller. This is visual hierarchy (Module 5) applied to an entire screen instead of one chart.

## Audience

A dashboard for an executive needs 3-5 KPIs and nothing else — they're checking in for 10 seconds. A dashboard for an analyst can go much deeper, with more charts and more filters, because they're spending real time in it. The same underlying data can need two completely different dashboards for two different audiences.

## Filters, Interactivity, and Drill-Down (Concepts)

- **Filters** let a viewer narrow the whole dashboard to a specific segment (e.g. "just the West region") without rebuilding anything
- **Interactivity** — hovering for exact values, clicking to highlight related charts — helps a viewer explore without needing a dozen separate static views
- **Drill-down** lets a viewer click a summary number and see the detail underneath it (e.g. click "Total Revenue" and see revenue broken down by category)

These are standard in tools like Tableau and Power BI — this course's lab sandbox can't render them live, but you need to recognize and design for them conceptually, since you'll likely use a real BI tool professionally.
`);
    console.log(`✓ What Makes a Dashboard Work (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Designing Effective KPIs");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What Makes a Good KPI

A **KPI** (key performance indicator) is a single number meant to summarize how something important is going. Common business KPIs: revenue, profit, growth rate, customer count, conversion rate, average order value (AOV).

## The Rule This Module Insists On

**A KPI without context is close to meaningless.** "$812,056 in revenue" tells you almost nothing on its own — is that good? Better than last month? Behind target? A number alone can't answer that.

## Giving a KPI Context

Every KPI on a real dashboard should be shown next to at least one comparison:

- **Vs. a prior period** — "$812K, up 12% from last quarter"
- **Vs. a target** — "$812K of a $900K goal (90%)"
- **Vs. a benchmark** — "$812K, compared to an industry average of $750K"

A number with an arrow, a percentage change, or a small trend sparkline next to it does far more communication work than the number alone.

## Common KPI Definitions

- **Revenue** — total sales value
- **Profit** — revenue minus cost
- **Growth (rate)** — percentage change in a metric over a period
- **Customer count** — number of distinct customers, often over a period
- **Conversion rate** — percentage of some larger group that completed a specific action
- **Average order value (AOV)** — total revenue ÷ number of orders

## Try It

Using DataMart's data, what would a well-contextualized "Total Revenue" KPI card need to include, beyond just the dollar figure? You'll build exactly this in the lab.
`);
    console.log(`✓ Designing Effective KPIs (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Business Intelligence Platforms: Tableau and Power BI");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Programmatic vs. BI Visualization

Everything you've built so far is **programmatic visualization** — Python code producing a static chart. **Business intelligence (BI) visualization** — Tableau, Power BI — is a different approach: drag-and-drop chart building, connected live to a database, with built-in interactivity, filters, and drill-down, usually used to build dashboards non-programmers on a business team can also maintain.

## What They Add on Top of Everything You Know

- **Live data connections** — a Tableau/Power BI dashboard can refresh automatically as the underlying database updates, instead of re-running a script
- **Built-in interactivity** — filters, tooltips, and drill-down are native features, not something you'd hand-code
- **No-code chart building** — drag a field onto an axis, the tool infers a reasonable chart type
- **Sharing and permissions** — publishing a dashboard to a team, with access control, is a first-class feature

## What Doesn't Change

Every principle from this entire course still applies inside Tableau or Power BI: choosing the right chart type (Module 3), visual encoding (Module 2), color and clarity (Module 5), honest axes (Module 5). The tool changes; the thinking behind a good visualization doesn't. A cluttered, misleading dashboard is just as possible to build in Tableau as it is in Matplotlib.

## This Course's Approach

This lab sandbox is Python-only, so you won't build inside Tableau or Power BI directly here — but everything you've practiced transfers directly. If you go on to use one professionally, the hardest part (knowing *what* to build and *why*) is exactly what this course has been teaching.
`);
    console.log(`✓ Business Intelligence Platforms (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Build Your First Dashboard");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📊 Build Your First Dashboard

Build a single, multi-panel dashboard combining: a KPI summary, a trend chart, a category comparison, and a regional visualization — following this week's layout and hierarchy principles.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Build the full dashboard in one figure using subplots.",
        code: `${SETUP}
fig, axes = plt.subplots(2, 2, figsize=(12, 8))

# --- KPI panel (top-left): the most important numbers, with context ---
total_revenue = sales["revenue"].sum()
total_profit = sales["profit"].sum()
avg_order_value = sales["revenue"].mean()
margin = total_profit / total_revenue * 100
axes[0, 0].axis("off")
axes[0, 0].text(0.05, 0.85, f"\${total_revenue:,.0f}", fontsize=26, fontweight="bold", color="#0d9488")
axes[0, 0].text(0.05, 0.72, "Total Revenue", fontsize=11, color="#555")
axes[0, 0].text(0.05, 0.50, f"\${total_profit:,.0f}  profit  ({margin:.0f}% margin)", fontsize=13)
axes[0, 0].text(0.05, 0.35, f"\${avg_order_value:,.0f}  average order value", fontsize=13)
axes[0, 0].set_title("KPI Summary", loc="left", fontweight="bold")

# --- Trend panel (top-right): what's happening over time ---
monthly = sales.set_index("order_date").resample("ME")["revenue"].sum()
axes[0, 1].plot(monthly.index, monthly.values, color="#0d9488", marker="o", markersize=3)
axes[0, 1].set_title("Revenue Trend", loc="left", fontweight="bold")

# --- Category panel (bottom-left): why it's happening ---
by_category = sales.groupby("category")["revenue"].sum().sort_values(ascending=False)
axes[1, 0].bar(by_category.index, by_category.values, color="#0d9488")
axes[1, 0].set_title("Revenue by Category", loc="left", fontweight="bold")
axes[1, 0].tick_params(axis="x", rotation=25)

# --- Regional panel (bottom-right): where it's happening ---
by_region = sales.groupby("region")["revenue"].sum().sort_values(ascending=False)
axes[1, 1].bar(by_region.index, by_region.values, color="#0d9488")
axes[1, 1].set_title("Revenue by Region", loc="left", fontweight="bold")

fig.suptitle("DataMart Analytics — Executive Dashboard", fontsize=16, fontweight="bold")
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Now simulate a filter: rebuild the same dashboard, filtered to just the West region — this is what clicking a real filter control would produce.",
        code: `${SETUP}
filtered = sales[sales["region"] == "West"]

fig, axes = plt.subplots(2, 2, figsize=(12, 8))

total_revenue = filtered["revenue"].sum()
total_profit = filtered["profit"].sum()
margin = total_profit / total_revenue * 100
axes[0, 0].axis("off")
axes[0, 0].text(0.05, 0.85, f"\${total_revenue:,.0f}", fontsize=26, fontweight="bold", color="#0d9488")
axes[0, 0].text(0.05, 0.72, "Total Revenue — West Region", fontsize=11, color="#555")
axes[0, 0].text(0.05, 0.50, f"\${total_profit:,.0f}  profit  ({margin:.0f}% margin)", fontsize=13)
axes[0, 0].set_title("KPI Summary (Filtered: West)", loc="left", fontweight="bold")

monthly = filtered.set_index("order_date").resample("ME")["revenue"].sum()
axes[0, 1].plot(monthly.index, monthly.values, color="#0d9488", marker="o", markersize=3)
axes[0, 1].set_title("Revenue Trend — West", loc="left", fontweight="bold")

by_category = filtered.groupby("category")["revenue"].sum().sort_values(ascending=False)
axes[1, 0].bar(by_category.index, by_category.values, color="#0d9488")
axes[1, 0].set_title("Revenue by Category — West", loc="left", fontweight="bold")
axes[1, 0].tick_params(axis="x", rotation=25)

axes[1, 1].axis("off")
axes[1, 1].text(0.1, 0.5, "In a real BI tool, this panel\\nwould update live as you click\\nthe region filter.", fontsize=11, style="italic", color="#777")

fig.suptitle("DataMart Analytics — Executive Dashboard (Filtered)", fontsize=16, fontweight="bold")
plt.tight_layout()
plt.show()
`,
      },
    ]);
    console.log(`✓ Lab: Build Your First Dashboard (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Redesign the Cluttered Dashboard");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Challenge: Redesign the Cluttered Dashboard

Below is a dashboard someone built badly: no clear hierarchy, a KPI with no context, inconsistent colors, and panels in a confusing order. Run it, then redesign it applying everything from this week and Module 5.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "The cluttered version.",
        code: `${SETUP}
fig, axes = plt.subplots(2, 2, figsize=(12, 8))

by_category = sales.groupby("category")["revenue"].sum()
axes[0, 0].bar(by_category.index, by_category.values, color=["red", "blue", "green", "orange", "purple"])
axes[0, 0].set_title("category chart")

axes[0, 1].axis("off")
axes[0, 1].text(0.3, 0.5, f"{sales['revenue'].sum():.0f}", fontsize=14)  # no context, no formatting, tiny

by_region = sales.groupby("region")["revenue"].sum()
axes[1, 0].pie(by_region.values, labels=by_region.index)  # pie chart for 4 regions — Module 3 would flag this

monthly = sales.set_index("order_date").resample("ME")["revenue"].sum()
axes[1, 1].plot(monthly.index, monthly.values, color="magenta")
axes[1, 1].set_title("trend")

plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Your redesign: fix the hierarchy (KPI first, largest, with context), consistent color, replace the pie chart, and clear titles.",
        code: `${SETUP}
# Redesign the dashboard here, applying Module 5's principles and this week's KPI/hierarchy rules

`,
      },
    ]);
    console.log(`✓ Challenge: Redesign the Cluttered Dashboard (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 8 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What's the key difference between a report and a dashboard?", options: ["They are the same thing", "A report is built once for one moment; a dashboard is built to be checked repeatedly for an up-to-date read", "Dashboards can't use charts", "Reports are always longer"], correct_index: 1, explanation: "The repeated-use nature of a dashboard changes its whole design approach compared to a one-off report." },
      { question_text: "What four questions should a well-designed dashboard answer?", options: ["Who, what, when, where", "What is happening, why is it happening, where is it happening, what should I investigate", "Only 'what is happening'", "How much did it cost to build"], correct_index: 1, explanation: "These four questions structure a dashboard's KPI, breakdown, segment, and highlight sections." },
      { question_text: "Why is 'a KPI without context is close to meaningless' true?", options: ["It isn't true", "A number alone (e.g. '$812,056 in revenue') doesn't say whether that's good, bad, improving, or behind target", "KPIs should never include numbers", "Context makes a KPI harder to read"], correct_index: 1, explanation: "Comparison to a prior period, target, or benchmark is what makes a KPI actionable." },
      { question_text: "What is average order value (AOV)?", options: ["The most expensive order", "Total revenue divided by number of orders", "The number of orders placed", "A type of chart"], correct_index: 1, explanation: "AOV is a standard KPI calculated as total revenue / order count." },
      { question_text: "Why might an executive's dashboard look very different from an analyst's dashboard on the same data?", options: ["Executives can't read charts", "Different audiences need different depth — an executive checking in for 10 seconds needs 3-5 KPIs; an analyst spending real time can use more detail", "It's always the same dashboard for everyone", "Analysts don't need KPIs"], correct_index: 1, explanation: "Audience determines depth and complexity — matching Module 1's exploratory-vs-explanatory distinction, applied to dashboards." },
      { question_text: "What does 'drill-down' mean on a dashboard?", options: ["Deleting old data", "Clicking a summary number to see the detail underneath it, e.g. clicking Total Revenue to see it broken down by category", "A type of color scale", "Filtering by date only"], correct_index: 1, explanation: "Drill-down lets a viewer go from a summary to underlying detail interactively." },
      { question_text: "What's the main advantage BI tools like Tableau/Power BI add over programmatic (Python) visualization?", options: ["They can visualize data that Python can't", "Live data connections, built-in interactivity/filters, and no-code chart building for non-programmers", "They automatically choose the correct chart type every time", "They eliminate the need for design principles"], correct_index: 1, explanation: "BI tools add interactivity, live connections, and accessibility for non-programmers — the underlying visualization principles stay the same." },
      { question_text: "According to this module, does using a real BI tool like Tableau change the fundamental visualization principles taught in this course?", options: ["Yes, completely different rules apply", "No — chart selection, encoding, color, and clarity principles all still apply inside a BI tool", "Only color principles apply", "BI tools have no design considerations"], correct_index: 1, explanation: "The tool changes; the underlying thinking about what makes a chart clear and honest does not." },
      { question_text: "Why does this course's lab dashboard simulate a 'filter' by pre-filtering the DataFrame in code, instead of a clickable control?", options: ["It's identical to a real filter — no difference at all", "This platform's lab sandbox renders static images with no live interactivity, so filtering is simulated by producing the filtered view directly", "Filters are not a real BI concept", "Pandas can't filter data"], correct_index: 1, explanation: "A stated, deliberate platform limitation — the resulting filtered view is conceptually the same as what a real filter control would produce." },
      { question_text: "In the cluttered-dashboard challenge, why is a pie chart for exactly 4 regions flagged as a problem?", options: ["Pie charts can never be used", "Angle/area encoding (Module 2) is less accurate than the length/position encoding a bar chart would use for the same 4-category comparison", "4 is too many categories for any chart", "Pie charts require a special library"], correct_index: 1, explanation: "This connects back to Module 3's chart-selection framework: a bar chart is the better default even inside a dashboard." },
    ]);
    console.log(`✓ Module 8 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 8 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Dashboards are built for repeated checking, not a single moment — that changes their design
- A good dashboard answers: what's happening, why, where, and what to investigate
- KPIs need context (vs. period, target, or benchmark) to mean anything
- Tableau/Power BI add live data, interactivity, and no-code building — but every principle from this course still applies inside them
- You built a full multi-panel dashboard, and a filtered version of it

## Coming Up Next Week

You can now build a chart, a clear chart, and a full dashboard. The last piece is turning any of that into a genuine, persuasive story — Module 9 covers data storytelling.
`);
    console.log(`✓ Module 8 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 8 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
