/**
 * Populates Module 9 — Data Storytelling (Week 9).
 * Run with: npx ts-node prisma/enrich-dataviz-module9.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 9";
const SETUP = dataMartSetup();

async function main() {
  console.log("🌱  Populating Module 9…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 9 Mission Briefing: Tell the Data Story");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📖 This Week's Mission

You can build a chart, make it clear, and combine several into a dashboard. This week's skill is different from all of those: turning a set of correct, clear charts into something that actually changes what someone decides to do.

## This Week You'll Learn To

- Explain why a chart, an insight, and a recommendation are three different things
- Structure a data story: context, problem, evidence, insight, action
- Write titles and annotations that communicate a finding, not just describe a chart
- Build a short sequence of visualizations that tells one coherent story

## Why This Matters

A brilliant analysis that nobody acts on has failed at its actual job. Storytelling is what turns "I found something" into "here's what we should do about it."
`);
    console.log(`✓ Week 9 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "From Charts to Stories");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Three Different Things

This module rests on one distinction, worth committing to memory:

**Chart ≠ Insight.** A chart is just a representation of data. "Here's a bar chart of revenue by region" is not, by itself, an insight — it's a display.

**Insight ≠ Recommendation.** "The West region earns the most revenue" is an insight — a meaningful pattern, stated in plain language. It's still not a recommendation. It doesn't say what anyone should *do*.

## The Full Chain

**Data → Visualization → Pattern → Insight → Business Meaning → Recommendation**

Walk it in order, using a real DataMart example:

1. **Data** — the raw \`sales\` table
2. **Visualization** — a bar chart of revenue by region
3. **Pattern** — the West bar is visibly the tallest
4. **Insight** — "The West region generates more revenue than any other region"
5. **Business meaning** — "Something about how DataMart operates in the West — marketing spend, store density, customer demand — is working better than in other regions"
6. **Recommendation** — "Investigate what's driving West's performance, and evaluate whether it can be replicated in the South, our weakest region"

## Where Most Analysis Stops Short

A huge amount of real-world analytical work stops at step 3 or 4 — a chart gets shared, or an insight gets stated, and the chain just ends there. The audience is left to figure out steps 5 and 6 themselves, which they often won't. Good data storytelling walks the *entire* chain, explicitly, every time.

## What This Means for Your Audience

For everything you present from now on, ask: have I only shown a chart? Have I stated the insight? Have I connected it to what it means for the business? Have I said what should happen next? Each step you skip is work you're leaving for your audience to do themselves.
`);
    console.log(`✓ From Charts to Stories (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Story Structure: Context, Problem, Evidence, Insight, Action");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## A Five-Part Structure

Almost any data story fits this shape — use it as a checklist, in order.

### 1. Context

What's the situation? Set the scene before showing anything. *"DataMart operates across four regions, and leadership is planning next year's regional marketing budget."*

### 2. Problem

Why does this matter right now? What decision or question is actually at stake? *"Leadership needs to know where additional marketing spend would have the biggest impact."*

### 3. Evidence

What does the data actually show? This is where your visualizations go — the chart(s) that support what comes next.

### 4. Insight

What does the evidence mean, stated in plain language? Not "here's a chart," but "here's what it tells us."

### 5. Action

What should happen next, based on the insight? A recommendation, specific enough to act on.

## A Worked Example

**Context:** DataMart is planning next year's regional marketing budget.
**Problem:** Leadership needs to know which region would benefit most from additional investment.
**Evidence:** [a bar chart: revenue by region, showing West leading, South trailing]
**Insight:** "West earns 45% more revenue than South, our lowest-performing region, despite having a similar customer count."
**Action:** "Recommend a deeper investigation into South's underperformance before allocating next year's marketing budget evenly across regions — the current gap suggests region-specific factors, not just budget size, are driving the difference."

## Using This Structure

Not every story needs all five parts spelled out explicitly in every sentence — but if you can't answer all five questions about your own analysis, it isn't finished yet. You'll build a full one in this week's lab.
`);
    console.log(`✓ Story Structure (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Titles and Annotations as Communication");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## A Title Can Do More Than Label

**Weak title:** "Sales by Region"

This just describes the chart's *contents*. A viewer still has to look at the chart, interpret it, and figure out what it means themselves.

**Strong title:** "Eastern Region Sales Outpaced Other Regions"

This states the *finding* directly. The chart now supports a claim the viewer can absorb in one glance, before they've even studied the bars.

## Turning Weak Titles Into Strong Ones

| Weak (describes) | Strong (communicates) |
|---|---|
| "Monthly Revenue" | "Revenue Grew Steadily Through Q4" |
| "Revenue by Category" | "Electronics Drives Nearly a Third of All Revenue" |
| "Customer Age Distribution" | "Most Customers Are Between 25 and 45" |
| "Discount vs. Quantity" | "Bigger Discounts Don't Reliably Drive More Volume" |

Notice the pattern: a strong title is a complete claim someone could actually disagree with or act on — not just a label.

## Annotations: Pointing at What Matters

An annotation is a short text callout placed directly on the chart, at the exact point it's explaining:

\`\`\`python
plt.annotate(
    "Holiday spike",
    xy=(peak_date, peak_value),           # the point being annotated
    xytext=(peak_date, peak_value * 1.15), # where the text sits
    arrowprops=dict(arrowstyle="->", color="#dc2626"),
    fontsize=10, color="#dc2626",
)
\`\`\`

Use annotations sparingly, on the one or two points your story actually needs — annotate every point and you've just built a second, messier legend.

## Titles and Annotations Together

A strong title states the finding; an annotation points at the exact evidence for it. Used together, a viewer doesn't have to search the chart for what you mean — you've told them, twice, in two different ways.
`);
    console.log(`✓ Titles and Annotations (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Tell the Story");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 📖 Tell the Story

Build a sequence of 3-5 visualizations that together tell one coherent story about DataMart's customer segments — following the five-part structure from this week.

## Your Task

1. Write your **Context** and **Problem** as a comment
2. Build 3-5 charts as your **Evidence** — each with a strong, claim-stating title
3. Write your **Insight** as a comment
4. Write your **Action** (recommendation) as a comment

A starting chart is provided — build on it, don't just stop there.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Context and Problem — write these first, as comments.",
        code: `# Context:
#
# Problem:
#
`,
      },
      {
        instructions: "Evidence, chart 1 — a starting point, comparing customer segments by average order value.",
        code: `${SETUP}
sales_seg = sales.merge(customers[["customer_id", "customer_segment"]], on="customer_id")
avg_by_segment = sales_seg.groupby("customer_segment")["revenue"].mean().sort_values(ascending=False)

plt.figure(figsize=(7, 4))
plt.bar(avg_by_segment.index, avg_by_segment.values, color="#0d9488")
plt.title(f"{avg_by_segment.index[0]} Customers Spend the Most per Order")  # a claim, not a label
plt.ylabel("Average Order Revenue ($)")
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Evidence, chart 2 — build your own, continuing the story (e.g. how many customers are in each segment, or how segments differ some other way).",
        code: `${SETUP}
# Build your second chart here — continue the story from chart 1

`,
      },
      {
        instructions: "Evidence, chart 3 (optional 4th/5th) — build another chart that adds to the story.",
        code: `${SETUP}
# Build your third chart here

`,
      },
      {
        instructions: "Insight and Action — write these as comments, completing the story.",
        code: `# Insight:
#
# Action (recommendation):
#
`,
      },
    ]);
    console.log(`✓ Lab: Tell the Story (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: The Executive Briefing");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧠 Challenge: The Executive Briefing

Build a **single chart** — just one — that could stand alone as a one-page briefing for DataMart's executive team. It must include:

- A title that states a real finding (not just describes the chart)
- At least one annotation pointing at the most important data point
- A one-sentence insight and one-sentence recommendation, written as comments below the chart

Choose your own question and chart type, using everything from Modules 1-9. Remember: an executive is spending 10 seconds with this — every element has to earn its place.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Build your one-page executive briefing chart, with a strong title, an annotation, and a written insight + recommendation.",
        code: `${SETUP}
# Build your single executive-briefing chart here


# Insight:
#
# Recommendation:
#
`,
      },
    ]);
    console.log(`✓ Challenge: The Executive Briefing (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 9 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What is the relationship between a chart and an insight?", options: ["They are the same thing", "A chart is just a representation of data; an insight is a meaningful pattern stated in plain language", "A chart is always more useful than an insight", "Insights don't require charts"], correct_index: 1, explanation: "A chart displays data — it takes a further step to state what pattern it actually reveals." },
      { question_text: "What is the relationship between an insight and a recommendation?", options: ["They are identical", "An insight describes what the data shows; a recommendation says what should be done about it", "Recommendations don't need insights", "Insights are only for executives"], correct_index: 1, explanation: "An insight is descriptive; a recommendation is prescriptive — a genuinely separate, further step." },
      { question_text: "What is the full chain taught in this module?", options: ["Data → Chart → Done", "Data → Visualization → Pattern → Insight → Business Meaning → Recommendation", "Chart → Data → Insight", "Insight → Data → Chart"], correct_index: 1, explanation: "This chain shows how many steps separate raw data from an actionable recommendation." },
      { question_text: "What are the five parts of the story structure taught this week?", options: ["Intro, body, conclusion", "Context, Problem, Evidence, Insight, Action", "Title, chart, legend, axis, footer", "Data, chart, color, title, share"], correct_index: 1, explanation: "This five-part structure organizes a data story from situation-setting through to a recommendation." },
      { question_text: "Why is 'Sales by Region' considered a weak chart title?", options: ["It's too short", "It describes the chart's contents rather than communicating an actual finding", "It doesn't include a number", "Titles should never mention 'Sales'"], correct_index: 1, explanation: "A weak title just labels the chart; a strong title states a claim the viewer can absorb immediately." },
      { question_text: "What makes 'Eastern Region Sales Outpaced Other Regions' a strong title?", options: ["It's longer than the weak version", "It states a specific, checkable claim/finding, not just a description of what's shown", "It doesn't mention a region", "Strong titles must always use exclamation points"], correct_index: 1, explanation: "A strong title communicates the actual takeaway, functioning almost like a headline." },
      { question_text: "What is an annotation, in the context of a chart?", options: ["A footnote at the bottom of a report", "A short text callout placed directly on the chart at the exact point it explains", "A type of legend", "A second chart"], correct_index: 1, explanation: "Annotations point directly at the specific evidence for a claim, right where it appears on the chart." },
      { question_text: "Why should annotations be used sparingly?", options: ["Matplotlib limits you to one annotation per chart", "Annotating every point just creates a second, messier legend, defeating the purpose of highlighting what matters most", "Annotations slow down chart rendering", "They are only allowed on line charts"], correct_index: 1, explanation: "Annotations work by drawing attention to the one or two most important points — overusing them removes that focus." },
      { question_text: "In the worked DataMart example, what is the 'business meaning' step (between insight and recommendation)?", options: ["Restating the raw data", "Connecting the insight to a plausible business explanation, e.g. what might be driving the pattern", "The chart's title", "A second chart"], correct_index: 1, explanation: "Business meaning bridges 'here's what the data shows' and 'here's what to do about it' by considering why the pattern might exist." },
      { question_text: "What is the risk of an analysis that stops at step 3 or 4 of the chain (pattern or insight) without going further?", options: ["There is no risk", "The audience is left to figure out the business meaning and recommendation themselves, which they often won't do", "The chart will render incorrectly", "It becomes too long"], correct_index: 1, explanation: "Stopping short leaves the most valuable, action-oriented part of the analysis undone, for the audience to guess at." },
    ]);
    console.log(`✓ Module 9 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 9 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Chart ≠ insight, and insight ≠ recommendation — three genuinely different steps
- The full chain: Data → Visualization → Pattern → Insight → Business Meaning → Recommendation
- The five-part story structure: Context, Problem, Evidence, Insight, Action
- A strong title states a finding; a weak title just describes the chart
- Annotations point directly at the evidence for a claim, used sparingly
- You built a full multi-chart story and a single-chart executive briefing

## Coming Up Next Week

Every skill from the last nine weeks comes together in a real capstone visual analytics project, using everything you've built — from your first bar chart to a complete data story. 🏆
`);
    console.log(`✓ Module 9 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 9 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
