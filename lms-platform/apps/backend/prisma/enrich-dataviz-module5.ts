/**
 * Populates Module 5 — Design Principles & Visual Clarity (Week 5).
 * Run with: npx ts-node prisma/enrich-dataviz-module5.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 5";
const SETUP = dataMartSetup();

async function main() {
  console.log("🌱  Populating Module 5…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 5 Mission Briefing: Become a Visual Designer");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## ✨ This Week's Mission

You can now build any chart type correctly. This week is about making sure it's also *clear* — and honest.

> "A beautiful visualization can still be a bad visualization."

## This Week You'll Learn To

- Apply simplicity, hierarchy, and layout principles to reduce clutter
- Use color deliberately — and accessibly — instead of decoratively
- Recognize the specific techniques that make a chart misleading, even unintentionally

## Why This Matters

A technically correct chart (right type, real data) can still fail if it's cluttered, poorly labeled, or built with a manipulated axis. This week is where "correct" becomes "clear and honest."
`);
    console.log(`✓ Week 5 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Simplicity, Hierarchy, and Layout");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Simplicity: Remove What Doesn't Help

Every element on a chart — gridlines, borders, extra colors, a legend — should earn its place by making the chart easier to understand. If removing an element doesn't hurt clarity, remove it. This isn't about making charts plain; it's about making sure nothing competes with the actual message.

## Visual Hierarchy

Not every element on a chart is equally important. Good design makes the *most* important thing (the title, or the one bar you want someone to notice) visually dominant, and everything else quieter:

- A bold, large title vs. small, muted axis labels
- One highlighted bar in a different color, the rest in a neutral gray
- A key annotation in a larger font than the surrounding text

## Alignment and White Space

Misaligned titles, labels, and legends make a chart feel unpolished even when the data is right. White space isn't wasted space — it's what lets the eye rest and separates one idea from another. A chart crammed edge-to-edge with no margin is harder to read, not more informative.

## Consistency

If red means "loss" in one chart, it shouldn't mean "primary product" in the next chart in the same report. Consistency across a set of charts — same color meanings, same fonts, same style — lets an audience build a mental model once and reuse it.

## Titles as More Than Labels

A weak title just names the chart: "Sales by Region." A strong title *communicates the takeaway*: "Eastern Region Sales Outpaced All Others." You'll practice this specific technique in Module 9 — keep it in mind starting now.

## Annotations

A short text callout pointing directly at the interesting part of a chart ("Revenue dipped here after a stockout") does more communication work than an entire paragraph of surrounding prose. Use them sparingly, on the one or two points that matter most.
`);
    console.log(`✓ Simplicity, Hierarchy, and Layout (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Color: Scales, Meaning, and Accessibility");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Color Should Communicate, Not Decorate

Color is one of the weaker-accuracy encodings from Module 2 — which means it should be used deliberately, not just to make a chart "look nice."

## Three Kinds of Color Scale

**Sequential** — a single hue that gets darker/lighter as a value increases. Use for data that has a low-to-high order (revenue, age, temperature).

**Diverging** — two hues meeting at a neutral midpoint. Use for data with a meaningful zero or center point (profit vs. loss, above/below average).

**Categorical (qualitative)** — distinct, unrelated hues for unordered categories (product category, region). Using a sequential scale on categorical data falsely implies an order that doesn't exist — a genuine, common mistake.

## Accessibility

Roughly 1 in 12 men have some form of color vision deficiency, most commonly red-green. Practical rules:

- Never rely on **color alone** to distinguish categories — pair it with position, labels, or pattern
- Avoid red/green as your only two colors in a comparison
- Use colorblind-friendly palettes (Seaborn's default \`"colorblind"\` palette is a safe choice)
- Make sure text and chart elements have enough contrast against the background

\`\`\`python
import seaborn as sns
sns.set_palette("colorblind")
\`\`\`

## Avoiding Unnecessary Color

If a bar chart only needs one series, one consistent color communicates faster than a rainbow of unrelated hues per bar — the rainbow implies each bar means something categorically different, when they're really just five values of the same thing.

## The Underlying Rule

Ask, for every color choice: "does this color encode something the audience needs to know, or is it just decoration?" If it's decoration, simplify.
`);
    console.log(`✓ Color (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Misleading Visualizations");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Charts Can Lie — Even by Accident

A chart doesn't need fabricated numbers to mislead. Small design choices can distort how real, correct data is perceived.

## Truncated / Manipulated Axes

Starting a bar chart's y-axis at, say, 90 instead of 0 makes a 2% difference look like a 300% difference — the bar *lengths* (a highly accurate encoding, remember) no longer represent the real proportional difference between values. **Bar charts should almost always start their value axis at zero.** Line charts are more forgiving of this, since they show *trend*, not proportional comparison — but even there, an unlabeled truncated axis can exaggerate a trend's steepness.

## Inappropriate Scales

Switching from a linear to a logarithmic scale changes how differences visually appear — legitimate for some skewed data, but misleading if used specifically to flatten or dramatize a trend without telling the audience the scale changed.

## Misleading Proportions

In shape-based charts (e.g. sizing an icon by a value), using *diameter* instead of *area* to represent a value makes differences look larger than they are, since area scales with the square of diameter — doubling a value would double the diameter, but roughly quadruple the visual area.

## Excessive Decoration ("Chartjunk")

3D effects, drop shadows, unnecessary gridlines, and busy background textures don't add information — they add noise that makes the real data harder to read, and 3D specifically distorts the actual proportions being shown.

## Cherry-Picked Data and Poor Category Selection

Choosing a suspiciously narrow date range that happens to support a specific narrative, or grouping categories in a way that hides an inconvenient one inside "Other," is misleading through *selection*, not chart design — arguably more dangerous, since it can look completely honest on the surface.

## The Standard to Hold Yourself To

None of these require intent to be a problem — a truncated axis chosen by habit is just as misleading as one chosen deliberately. Part of this course's ethics coverage (Module 9 revisits this) is holding your own charts to the same scrutiny you'd apply to someone else's.
`);
    console.log(`✓ Misleading Visualizations (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Redesign for Clarity");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## ✨ Redesign for Clarity

Below is a chart that's technically correct but cluttered and unclear. Run it, then redesign it applying this week's principles: simplify, add hierarchy, fix the color, and write a stronger title.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "The cluttered version: unnecessary colors, a legend that isn't needed, a weak title, and no clear focal point.",
        code: `${SETUP}
by_category = sales.groupby("category")["revenue"].sum().sort_values(ascending=False)
colors = ["#e74c3c", "#f39c12", "#2ecc71", "#3498db", "#9b59b6"]

plt.figure(figsize=(7, 5))
bars = plt.bar(by_category.index, by_category.values, color=colors)
plt.title("Revenue by Category")
plt.grid(True, alpha=0.8)
plt.legend(bars, by_category.index, loc="upper right", fontsize=7)
plt.xticks(rotation=45)
plt.show()
`,
      },
      {
        instructions: "Redesign it: one consistent color, a highlighted top category, a stronger title, no redundant legend, less clutter.",
        code: `${SETUP}
by_category = sales.groupby("category")["revenue"].sum().sort_values(ascending=False)
colors = ["#0d9488"] + ["#a8d8d4"] * (len(by_category) - 1)  # highlight the top category

plt.figure(figsize=(7, 5))
plt.bar(by_category.index, by_category.values, color=colors)
plt.title(f"{by_category.index[0]} Leads All Categories in Revenue")  # title communicates the takeaway
plt.ylabel("Revenue ($)")
plt.xticks(rotation=15)
plt.tight_layout()
plt.show()

# What changed:
# - One consistent color instead of five unrelated hues (color now used for meaning: highlighting the leader)
# - No legend — the x-axis labels already say what each bar is, a legend was redundant
# - Heavy gridlines removed — they weren't adding information
# - Title states the finding, not just the chart's contents
`,
      },
    ]);
    console.log(`✓ Lab: Redesign for Clarity (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Spot the Problem");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🚨 Spot the Problem

Each cell below builds a deliberately misleading chart from real DataMart data. For each one: identify what's wrong, explain why it's misleading, and note how you'd fix it (as a comment) — some cells also include the honest, fixed version to compare against.
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Problem 1: a truncated y-axis. Run it, then compare to the honest version below.",
        code: `${SETUP}
by_region = sales.groupby("region")["revenue"].sum().sort_values(ascending=False)

plt.figure(figsize=(7, 4))
plt.bar(by_region.index, by_region.values, color="#0d9488")
plt.ylim(180000, 260000)  # truncated axis — doesn't start at zero
plt.title("Revenue by Region (misleading — truncated axis)")
plt.ylabel("Revenue ($)")
plt.tight_layout()
plt.show()

# What's wrong:
#
`,
      },
      {
        instructions: "The honest fix: same data, y-axis starting at zero.",
        code: `${SETUP}
by_region = sales.groupby("region")["revenue"].sum().sort_values(ascending=False)

plt.figure(figsize=(7, 4))
plt.bar(by_region.index, by_region.values, color="#0d9488")
plt.ylim(0, by_region.max() * 1.1)  # honest — starts at zero
plt.title("Revenue by Region (honest)")
plt.ylabel("Revenue ($)")
plt.tight_layout()
plt.show()

# Notice how much smaller the regional differences look now that they're
# shown at true proportional scale, instead of exaggerated by the truncated axis.
`,
      },
      {
        instructions: "Problem 2: cherry-picked date range. Run it, then compare to the fix.",
        code: `${SETUP}
# Cherry-picked: only showing the 2 best months to imply strong overall growth
cherry_picked = sales[(sales["order_date"] >= "2023-11-01") & (sales["order_date"] <= "2023-12-31")]
monthly = cherry_picked.set_index("order_date").resample("ME")["revenue"].sum()

plt.figure(figsize=(7, 4))
plt.plot(monthly.index, monthly.values, marker="o", color="#0d9488")
plt.title("Revenue Is Growing! (misleading — cherry-picked 2 months)")
plt.ylabel("Revenue ($)")
plt.tight_layout()
plt.show()

# What's wrong:
#
`,
      },
      {
        instructions: "The honest fix: the full two-year range, showing the real, more complicated pattern.",
        code: `${SETUP}
monthly_full = sales.set_index("order_date").resample("ME")["revenue"].sum()

plt.figure(figsize=(9, 4))
plt.plot(monthly_full.index, monthly_full.values, marker="o", color="#0d9488")
plt.title("Monthly Revenue, Full Two-Year Range (honest)")
plt.ylabel("Revenue ($)")
plt.tight_layout()
plt.show()

# The full range shows normal month-to-month variation, not a clean growth
# story — cherry-picking two months hid that complexity.
`,
      },
    ]);
    console.log(`✓ Challenge: Spot the Problem (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 5 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What is the guiding rule for whether a chart element (gridline, color, border) should stay?", options: ["Include as many elements as possible", "If removing it doesn't hurt clarity, it should be removed", "Every chart needs a legend", "Elements should never be removed"], correct_index: 1, explanation: "Simplicity means every element should earn its place by aiding understanding." },
      { question_text: "What does visual hierarchy mean in chart design?", options: ["Sorting data alphabetically", "Making the most important element visually dominant, and everything else quieter", "Using 3D effects", "Always using a bar chart"], correct_index: 1, explanation: "Hierarchy directs the viewer's attention to what matters most first." },
      { question_text: "When should you use a sequential color scale?", options: ["For unordered categories", "For data with a low-to-high order, like revenue or age", "Only for geographic data", "Never — sequential scales are outdated"], correct_index: 1, explanation: "Sequential scales (one hue, varying lightness) match data with an inherent order." },
      { question_text: "Why is using a sequential color scale on categorical data (like product category) a mistake?", options: ["It's not a mistake", "It falsely implies an order between categories that doesn't actually exist", "Categorical data can't be colored", "It uses too much memory"], correct_index: 1, explanation: "Sequential scales imply low-to-high order — misleading when applied to unordered categories." },
      { question_text: "Why should you avoid relying on color alone to distinguish categories?", options: ["Color is always accurate", "Roughly 1 in 12 men have color vision deficiency — color alone can make a chart unreadable for them", "It's against Matplotlib's rules", "Colors take longer to render"], correct_index: 1, explanation: "Accessible design pairs color with position, labels, or pattern so color isn't the only signal." },
      { question_text: "Why should bar charts almost always start their value axis at zero?", options: ["It's a Matplotlib requirement", "Bar length is a highly accurate encoding — truncating the axis distorts the proportional differences the lengths represent", "It makes the chart taller", "Zero is required for line charts too"], correct_index: 1, explanation: "A truncated bar-chart axis breaks the honest proportional comparison that bar length is supposed to represent." },
      { question_text: "What makes 'chartjunk' (3D effects, drop shadows, heavy decoration) a problem?", options: ["It adds useful detail", "It adds visual noise without adding information, and 3D specifically distorts real proportions", "It's only a problem in pie charts", "It makes charts load faster"], correct_index: 1, explanation: "Decoration that doesn't communicate anything just competes with the real data for attention — and 3D effects actively distort proportions." },
      { question_text: "Why is cherry-picking a narrow date range considered especially dangerous compared to a truncated axis?", options: ["It isn't dangerous", "It can look completely honest on the surface — the chart itself may be well-designed even though the underlying selection is misleading", "It's illegal", "It only affects line charts"], correct_index: 1, explanation: "Selection bias in the data itself can hide behind an otherwise well-built, honest-looking chart." },
      { question_text: "What's the difference between a diverging and a sequential color scale?", options: ["They are identical", "Diverging uses two hues meeting at a neutral midpoint (for data with a meaningful center, like profit/loss); sequential uses one hue for low-to-high order", "Diverging only works for maps", "Sequential is for categorical data only"], correct_index: 1, explanation: "Diverging scales suit data with a meaningful zero/center; sequential scales suit low-to-high ordered data." },
      { question_text: "What should you ask before adding any color to a chart, per this module?", options: ["Does it match the company brand colors?", "Does this color encode something the audience needs to know, or is it just decoration?", "Is it my favorite color?", "Will it print well in black and white?"], correct_index: 1, explanation: "Color should communicate meaning, not just decorate — that's the core test this module teaches." },
    ]);
    console.log(`✓ Module 5 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 5 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Simplicity, hierarchy, alignment, and white space make a chart easier to read, not just prettier
- Color should encode meaning (sequential, diverging, categorical) — and always stay accessible, never the only signal
- Truncated axes, inappropriate scales, misleading proportions, chartjunk, and cherry-picked data can all mislead an audience, even without fabricating numbers
- Bar charts should almost always start at zero — length is too accurate an encoding to distort

## Coming Up Next Week

With solid design habits in place, Module 6 turns visualization into a genuine investigation tool: exploratory data analysis, where you use charts to discover what's actually going on in a brand-new dataset.
`);
    console.log(`✓ Module 5 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 5 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
