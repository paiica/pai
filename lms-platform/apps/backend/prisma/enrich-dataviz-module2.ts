/**
 * Populates Module 2 — Understanding Data & Visual Encoding (Week 2).
 * Run with: npx ts-node prisma/enrich-dataviz-module2.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { findLesson, writeLessonContent, attachLab, writeQuiz, dataMartSetup } from "./dataviz-lib";

const prisma = new PrismaClient();
const SLUG = "data-visualization-from-data-to-insight";
const MOD = "Module 2";
const SETUP = dataMartSetup();

async function main() {
  console.log("🌱  Populating Module 2…\n");

  {
    const l = await findLesson(prisma, SLUG, MOD, "Week 2 Mission Briefing: Master Visual Encodings");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🎨 This Week's Mission

Before you can choose the right chart, you need two things: to know what *kind* of data you're holding, and to understand how a chart actually represents a number visually — through position, length, size, color, and more. That mapping is called **visual encoding**, and it's the foundation every chart type in Module 3 is built on.

## This Week You'll Learn To

- Classify data as categorical, numerical, continuous, discrete, time-series, or geographic
- Name the visual encodings a chart can use: position, length, size, color, shape, angle, area
- Explain why some encodings are easier for people to read accurately than others

## Why This Matters

Every chart type is really just a specific *combination* of visual encodings applied to specific data types. Understanding the building blocks first means Module 3's "which chart do I use?" question will already feel intuitive.
`);
    console.log(`✓ Week 2 Mission Briefing (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Types of Data");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Knowing Your Data Comes First

Every column in a dataset falls into a data type, and that type constrains which visual encodings and chart types make sense for it.

## Categorical Data

Values that name a category, with no inherent numeric order. In DataMart's data: \`category\` ("Electronics", "Books", ...), \`region\` ("North", "South", ...), \`customer_segment\`.

## Numerical Data

Values you can do arithmetic on. This splits into two further types:

- **Continuous** — can take any value in a range, including fractions (\`revenue\`, \`price\`, \`profit\`)
- **Discrete** — countable, whole-number values (\`quantity\`, \`inventory\`)

## Time-Series Data

Values indexed by time — \`order_date\` in the sales data. Time-series data is technically a special case of continuous/ordered data, but it gets its own category because it has a property nothing else does: a guaranteed, meaningful order that charts should almost always preserve left-to-right.

## Geographic Data

Values tied to a physical location — \`region\` and \`city\` in the customer data. Geographic data can often be treated as categorical (grouping/comparing by region) or plotted on an actual map, depending on the question.

## Why This Classification Matters

A chart type that works beautifully for numerical data can be meaningless for categorical data, and vice versa. A line chart implies a continuous path between points — draw one connecting "Electronics" to "Books" to "Clothing" and you've implied an order and a trend that doesn't exist. Knowing your data type up front prevents mistakes like this before they happen.

## Try It

For each DataMart column below, name its data type: \`profit\`, \`region\`, \`signup_date\`, \`discount\`, \`customer_segment\`, \`inventory\`.
`);
    console.log(`✓ Types of Data (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "What Is Visual Encoding?");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## Mapping Numbers to Pixels

A chart doesn't magically "show" data — it maps each data value onto some visual property of a mark on the screen. That mapping is called **visual encoding**. The main encodings available to a chart designer are:

- **Position** — where a mark sits on an axis (a dot's x/y location)
- **Length** — how long a mark is (a bar's height)
- **Size** — how big a mark is (a bubble's diameter)
- **Color** — hue or shade (a heatmap cell's color, a category's fill color)
- **Shape** — a mark's form (circle vs. triangle vs. square)
- **Angle** — the angle of a mark (a pie slice)
- **Area** — the 2D space a mark covers (a treemap rectangle)

## The Same Number, Different Encodings

Take "revenue by category" — five numbers, one per category. You could encode those five numbers using:

- **Position** along a shared axis (a dot plot)
- **Length** of a bar (a bar chart)
- **Angle**/area of a slice (a pie chart)
- **Color** intensity (a single-row heatmap)

All four represent the *same underlying data*. They are not equally easy to read accurately.

## Why Some Encodings Beat Others

Statistician William Cleveland ran controlled experiments on exactly this question — how accurately can people compare values encoded different ways? The widely-replicated finding, roughly ranked from most to least accurate:

**Position along a common axis** → **Length** → **Angle / Slope** → **Area** → **Color / Density**

This is *why* bar charts (length, or position of the bar's end, along a shared baseline) are so reliably effective, and why pie charts (angle and area) are comparatively harder to read precisely — it's not personal taste, it's measurable human perception.

This ranking will directly explain several of the chart-choice rules in Module 3.
`);
    console.log(`✓ What Is Visual Encoding? (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Lab: Visual Encoding Challenge");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🎨 Visual Encoding Challenge

You'll represent the *same* summary — revenue by category — using three different visual encodings, then compare how easy each is to read accurately.

## Your Task

1. Run the bar chart cell (length/position encoding)
2. Run the pie chart cell (angle/area encoding)
3. Run the horizontal dot plot cell (pure position encoding)
4. Answer: without looking at the numbers, can you rank the 5 categories correctly from each chart? Which one was fastest and most confident to read?
`);
    await attachLab(prisma, l.id, [
      {
        instructions: "Bar chart — length/position encoding.",
        code: `${SETUP}
by_category = sales.groupby("category")["revenue"].sum().sort_values(ascending=False)

plt.figure(figsize=(7, 4))
plt.bar(by_category.index, by_category.values, color="#0d9488")
plt.title("Revenue by Category — Bar Chart (Length Encoding)")
plt.ylabel("Revenue ($)")
plt.xticks(rotation=20)
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Pie chart — angle/area encoding.",
        code: `${SETUP}
by_category = sales.groupby("category")["revenue"].sum().sort_values(ascending=False)

plt.figure(figsize=(6, 6))
plt.pie(by_category.values, labels=by_category.index, autopct="%1.0f%%")
plt.title("Revenue by Category — Pie Chart (Angle/Area Encoding)")
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Horizontal dot plot — pure position encoding.",
        code: `${SETUP}
by_category = sales.groupby("category")["revenue"].sum().sort_values()

plt.figure(figsize=(7, 4))
plt.scatter(by_category.values, by_category.index, s=120, color="#0d9488", zorder=3)
for val in by_category.values:
    plt.axhline(0, color="none")  # keep axis clean, no-op placeholder
plt.title("Revenue by Category — Dot Plot (Position Encoding)")
plt.xlabel("Revenue ($)")
plt.grid(axis="x", alpha=0.3)
plt.tight_layout()
plt.show()
`,
      },
      {
        instructions: "Answer question 4 as a comment: which chart was fastest/most confident to read, and why?",
        code: `# Your answer:
#
`,
      },
    ]);
    console.log(`✓ Lab: Visual Encoding Challenge (${blocks} blocks, lab attached)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Challenge: Rank the Encodings");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## 🧩 Challenge: Rank the Encodings

Rank these six visual encodings from **easiest** to **hardest** for a person to accurately compare two values with: **position along a shared axis, length, angle, area, color intensity, shape**.

For each one, briefly explain *why* it belongs where you put it — referencing what you learned about Cleveland's perception rankings.

Then answer: a colleague wants to show "market share by 5 companies" and reaches for a pie chart by default. Using this week's ranking, what would you suggest instead, and why?
`);
    console.log(`✓ Challenge: Rank the Encodings (${blocks} blocks)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 2 Quiz");
    await writeQuiz(prisma, l.id, [
      { question_text: "What data type is DataMart's `category` column (Electronics, Books, ...)?", options: ["Continuous numerical", "Categorical", "Discrete numerical", "Time-series"], correct_index: 1, explanation: "Category names have no inherent numeric order — that's categorical data." },
      { question_text: "What's the difference between continuous and discrete numerical data?", options: ["There is no difference", "Continuous can take any value in a range including fractions; discrete is countable whole numbers", "Discrete is always larger than continuous", "Continuous data can't be charted"], correct_index: 1, explanation: "Revenue (continuous) can be $45.32; quantity (discrete) is always a whole number of units." },
      { question_text: "Why does time-series data get its own category, even though dates are technically ordered numbers?", options: ["It doesn't need special treatment", "It has a guaranteed, meaningful left-to-right order that charts should almost always preserve", "Dates can't be plotted", "Time-series data is always categorical"], correct_index: 1, explanation: "Time's inherent order is what makes line charts over time meaningful — it's worth treating as its own type." },
      { question_text: "What is 'visual encoding'?", options: ["Compressing image files", "Mapping a data value onto a visual property of a mark, like position, length, or color", "A type of database index", "Converting text to numbers"], correct_index: 1, explanation: "Visual encoding is how a chart translates a number into something visible — position, length, size, color, etc." },
      { question_text: "According to Cleveland's perception research referenced in this module, which encoding is generally read MOST accurately?", options: ["Color intensity", "Position along a common axis", "Angle", "Area"], correct_index: 1, explanation: "Position along a shared axis tops Cleveland's accuracy ranking — this is part of why bar/dot charts work so well." },
      { question_text: "Why are pie charts generally harder to read precisely than bar charts?", options: ["Pie charts use more colors", "Pie charts rely on angle/area encoding, which people compare less accurately than length/position", "Pie charts are always wrong", "Bar charts can't show percentages"], correct_index: 1, explanation: "Angle and area comparisons are measurably less accurate for humans than length/position comparisons." },
      { question_text: "What mistake does drawing a line chart between categorical values like 'Electronics', 'Books', 'Clothing' create?", options: ["No mistake — it's fine", "It implies a continuous trend/order between categories that doesn't actually exist", "It makes the chart too colorful", "It's technically impossible to do"], correct_index: 1, explanation: "Line charts imply a meaningful path between points — nonsensical for unordered categorical values." },
      { question_text: "Which of these is a numerical, continuous DataMart column?", options: ["region", "customer_segment", "revenue", "category"], correct_index: 2, explanation: "Revenue can take any fractional dollar value — continuous numerical data." },
      { question_text: "Which visual encoding does a bubble chart's circle size represent?", options: ["Position", "Color", "Size (or area)", "Angle"], correct_index: 2, explanation: "Bubble size encodes a value through the size/area of the circle mark." },
      { question_text: "Why does understanding data types matter before choosing a chart?", options: ["It doesn't matter", "Different data types are suited to different chart types and encodings — mismatching them can mislead or confuse the audience", "All charts work for all data types equally well", "Only numerical data can be charted"], correct_index: 1, explanation: "A chart type implies things about the data (like order or continuity) — using the wrong type for your data can actively mislead." },
    ]);
    console.log(`✓ Module 2 Quiz (10 questions)`);
  }

  {
    const l = await findLesson(prisma, SLUG, MOD, "Module 2 Summary");
    const { blocks } = await writeLessonContent(prisma, l.id, `
## What You Learned This Week

- Data comes in types — categorical, numerical (continuous/discrete), time-series, geographic — and the type constrains which charts make sense
- Visual encoding is how a chart maps a data value to a visual property: position, length, size, color, shape, angle, area
- Cleveland's perception research ranks encodings by accuracy: position and length are read most accurately; angle, area, and color are read less accurately
- The same data encoded different ways (bar vs. pie vs. dot plot) is not equally easy to interpret correctly

## Coming Up Next Week

Now that you know the building blocks, it's time to assemble them: Module 3 walks through exactly which chart type to reach for, for comparison, trend, distribution, relationship, composition, and geographic questions — using a decision framework you'll use for the rest of the course.
`);
    console.log(`✓ Module 2 Summary (${blocks} blocks)`);
  }

  console.log("\n✅  Module 2 complete.\n");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
