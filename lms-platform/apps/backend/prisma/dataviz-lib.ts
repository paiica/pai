/**
 * Shared helpers for "Data Visualization: From Data to Insight". Reuses the
 * generic lesson/lab/quiz helpers built for the Python/SQL "Zero to Hero"
 * courses (never Python-specific) and adds the DataMart Analytics dataset.
 *
 * Technical notes (read before adding new lessons):
 *
 * 1. Lab rendering: this platform's LabPanel already has first-class support
 *    for matplotlib figures. After a cell runs, the frontend (E2B path) or
 *    the Pyodide runtime (browser path, see apps/frontend/src/lib/lab-runtime.ts)
 *    captures every open matplotlib figure as a base64 PNG and renders it
 *    inline (`<img src="data:image/png;base64,...">`). Calling `plt.show()`
 *    (or just leaving a figure open) at the end of a cell is enough — no
 *    special plumbing needed. numpy/matplotlib/pandas run for free in the
 *    student's own browser via Pyodide (auto-detected — see
 *    detectLabRuntime/HEAVY_PACKAGE_PATTERNS); seaborn installs on demand
 *    via micropip the first time a lesson imports it (already used
 *    successfully elsewhere in this codebase, e.g. seed-mlcourse-ai.ts).
 * 2. What's NOT supported: the lab UI only renders `png`/`text` results, not
 *    `html` — so Plotly/Bokeh-style interactive HTML charts won't display,
 *    and there's no Tableau/Power BI integration at all. Every "dashboard"
 *    lab in this course is therefore a static multi-panel matplotlib figure
 *    (`plt.subplots(...)`), not a real interactive BI tool. This is a
 *    deliberate, necessary adaptation to the platform's actual lab
 *    capabilities — flagged here and inside Module 8's own lesson content,
 *    exactly like the SQL course flagged SQLite-not-PostgreSQL.
 * 3. No persistent file system / CSV upload exists between cells beyond a
 *    single lab session, so every lab's SETUP block constructs the dataset
 *    in-memory as a pandas DataFrame (numpy random generation with a fixed
 *    seed = fully deterministic and reproducible across every student run).
 */
export { findLesson, findSublesson, writeLessonContent, attachLab, writeQuiz, type QuizQuestionDef } from "./python-zero-to-hero-lib";

// Builds the four DataMart Analytics tables as pandas DataFrames, in-memory,
// with a fixed random seed — every student (and every re-run) gets the
// exact same numbers, so lesson text can safely reference concrete figures
// (e.g. "West leads regional revenue") without ever going stale.
export const DATAMART_SETUP = `import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

np.random.seed(42)

# --- products ---
categories = ["Electronics", "Home & Kitchen", "Clothing", "Sports & Outdoors", "Books"]
n_products = 40
product_names = [f"{categories[i % len(categories)].split(' ')[0]} Item {i+1}" for i in range(n_products)]
product_categories = [categories[i % len(categories)] for i in range(n_products)]
cost = np.round(np.random.uniform(5, 200, n_products), 2)
price = np.round(cost * np.random.uniform(1.3, 2.5, n_products), 2)
inventory = np.random.randint(0, 500, n_products)
products = pd.DataFrame({
    "product_id": range(1, n_products + 1), "product_name": product_names,
    "category": product_categories, "price": price, "cost": cost, "inventory": inventory,
})

# --- customers ---
n_customers = 200
regions = ["North", "South", "East", "West"]
cities_by_region = {
    "North": ["Toronto", "Ottawa", "Montreal"], "South": ["Miami", "Houston", "Atlanta"],
    "East": ["New York", "Boston", "Philadelphia"], "West": ["Los Angeles", "Seattle", "San Francisco"],
}
segments = ["Consumer", "Corporate", "Small Business"]
cust_region = np.random.choice(regions, n_customers)
cust_city = [np.random.choice(cities_by_region[r]) for r in cust_region]
cust_age = np.random.randint(18, 70, n_customers)
cust_segment = np.random.choice(segments, n_customers, p=[0.6, 0.25, 0.15])
signup_dates = pd.to_datetime("2021-01-01") + pd.to_timedelta(np.random.randint(0, 730, n_customers), unit="D")
customers = pd.DataFrame({
    "customer_id": range(1, n_customers + 1), "age": cust_age, "customer_segment": cust_segment,
    "city": cust_city, "region": cust_region, "signup_date": signup_dates,
})

# --- sales ---
n_sales = 1200
start_date = pd.to_datetime("2022-01-01")
date_range_days = 729
order_dates = start_date + pd.to_timedelta(np.random.randint(0, date_range_days, n_sales), unit="D")
sale_customer = np.random.randint(1, n_customers + 1, n_sales)
sale_product = np.random.randint(1, n_products + 1, n_sales)
sale_category = products.set_index("product_id").loc[sale_product, "category"].values
sale_region = customers.set_index("customer_id").loc[sale_customer, "region"].values
sale_quantity = np.random.randint(1, 8, n_sales)
unit_price = products.set_index("product_id").loc[sale_product, "price"].values
unit_cost = products.set_index("product_id").loc[sale_product, "cost"].values
discount = np.round(np.random.choice([0, 0, 0, 0.05, 0.1, 0.15, 0.2], n_sales), 2)
revenue = np.round(sale_quantity * unit_price * (1 - discount), 2)
profit = np.round(sale_quantity * (unit_price * (1 - discount) - unit_cost), 2)
sales = pd.DataFrame({
    "order_id": range(1, n_sales + 1), "order_date": order_dates, "customer_id": sale_customer,
    "product_id": sale_product, "category": sale_category, "region": sale_region,
    "quantity": sale_quantity, "revenue": revenue, "profit": profit, "discount": discount,
})

# --- employees ---
n_employees = 25
depts = ["Sales", "Marketing", "Support", "Operations", "Engineering"]
employees = pd.DataFrame({
    "employee_id": range(1, n_employees + 1), "department": np.random.choice(depts, n_employees),
    "salary": np.random.randint(45000, 130000, n_employees),
    "performance_score": np.round(np.random.uniform(2.0, 5.0, n_employees), 1),
    "hire_date": pd.to_datetime("2018-01-01") + pd.to_timedelta(np.random.randint(0, 2000, n_employees), unit="D"),
})
`;

// A second, smaller illustrative dataset for variety in the exploratory
// modules — clearly labeled as simulated (not scraped from a real public
// source) so the course's own ethics-of-visualization lessons stay
// consistent with how its own datasets are presented.
export const WORLD_HEALTH_SETUP = `import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

np.random.seed(7)

# Simulated country-level health/development snapshot for practicing
# distribution, relationship, and geographic-style visualizations.
countries = [
    "Canada", "United States", "Brazil", "Mexico", "United Kingdom", "France", "Germany",
    "Nigeria", "Kenya", "South Africa", "Egypt", "India", "China", "Japan", "South Korea",
    "Indonesia", "Australia", "Norway", "Sweden", "Poland",
]
continents = [
    "North America", "North America", "South America", "North America", "Europe", "Europe", "Europe",
    "Africa", "Africa", "Africa", "Africa", "Asia", "Asia", "Asia", "Asia",
    "Asia", "Oceania", "Europe", "Europe", "Europe",
]
n = len(countries)
gdp_per_capita = np.round(np.random.lognormal(mean=9.7, sigma=0.9, size=n), 0)
life_expectancy = np.clip(np.round(58 + gdp_per_capita / 3500 + np.random.normal(0, 3, n), 1), 45, 86)
population_millions = np.round(np.random.lognormal(mean=3.0, sigma=1.3, size=n), 1)

world_health = pd.DataFrame({
    "country": countries, "continent": continents,
    "gdp_per_capita": gdp_per_capita, "life_expectancy": life_expectancy,
    "population_millions": population_millions,
})
`;

// Composes the setup a lab needs: which DataMart tables plus (optionally)
// the world-health dataset, always ending with the matplotlib import
// already present in both setups above.
export function dataMartSetup(opts?: { worldHealth?: boolean }): string {
  return opts?.worldHealth ? `${DATAMART_SETUP}\n${WORLD_HEALTH_SETUP}` : DATAMART_SETUP;
}
