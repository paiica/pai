/**
 * Shared helpers for SQL for Beginners: From Zero to SQL Hero. Reuses
 * the generic lesson/lab/quiz helpers built for the Python course
 * (they were never Python-specific) and adds the DataMart sample
 * database + a `run_sql()` wrapper.
 *
 * Technical note: this platform's lab sandbox executes Python only
 * (confirmed: LabPanel.tsx's Monaco editor is hardcoded
 * defaultLanguage="python", and the backend's executeCell() calls E2B's
 * Python-only runCode()) — there's no native SQL execution engine.
 * Real SQL still runs for real here: every lab uses Python's built-in
 * sqlite3 module to load the DataMart database and execute whatever
 * SQL string the student writes inside run_sql("""..."""), with results
 * pretty-printed. SQLite is a genuine, fully relational SQL database —
 * SELECT/WHERE/JOIN/GROUP BY/HAVING/subqueries/CASE/window functions
 * all work identically to PostgreSQL for everything this course
 * teaches. The dialect requested was PostgreSQL; this is a deliberate,
 * necessary adaptation to the platform's actual execution engine, not
 * a silent scope cut — flagged here and in the course's own content.
 */
export { findLesson, findSublesson, writeLessonContent, attachLab, writeQuiz, type QuizQuestionDef } from "./python-zero-to-hero-lib";

// The run_sql() helper every lab starts with — pretty-prints column
// headers and rows so query output reads like a real result set.
// Floats are rounded to 2 places for display only (the underlying value
// and any further calculation is untouched) — SQLite's raw floating-point
// sums otherwise print as e.g. 209.98000000000002, a distracting artifact
// students would hit constantly, weeks before ROUND() is taught on purpose
// in Module 4.
export const RUN_SQL_HELPER = `def _fmt(v):
    if isinstance(v, float):
        return f"{v:.2f}"
    return str(v)

def run_sql(query):
    cur.execute(query)
    if cur.description:
        columns = [d[0] for d in cur.description]
        rows = cur.fetchall()
        widths = [max(len(str(c)), *(len(_fmt(r[i])) for r in rows)) if rows else len(str(c)) for i, c in enumerate(columns)]
        print(" | ".join(str(c).ljust(w) for c, w in zip(columns, widths)))
        print("-+-".join("-" * w for w in widths))
        for row in rows:
            print(" | ".join(_fmt(v).ljust(w) for v, w in zip(row, widths)))
        print(f"\\n({len(rows)} row{'s' if len(rows) != 1 else ''})")
    else:
        conn.commit()
        print("Query executed successfully.")
`;

// Each table's CREATE + INSERT as a standalone Python/sqlite3 snippet.
// Composed progressively — Module 1 gets just customers, Module 6 adds
// order_items, etc., matching "let the database grow as their
// knowledge grows."
export const TABLE_SETUP: Record<string, string> = {
  customers: `cur.execute("""
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    city TEXT,
    province TEXT,
    signup_date TEXT
)
""")
cur.executemany("INSERT INTO customers VALUES (?,?,?,?,?,?,?)", [
    (1, "Maria", "Chen", "maria.chen@email.com", "Toronto", "ON", "2023-01-15"),
    (2, "James", "Okafor", "james.okafor@email.com", "Ottawa", "ON", "2023-02-20"),
    (3, "Priya", "Sharma", "priya.sharma@email.com", "Vancouver", "BC", "2023-01-05"),
    (4, "Liam", "Tremblay", "liam.tremblay@email.com", "Montreal", "QC", "2023-03-10"),
    (5, "Sophie", "Martin", "sophie.martin@email.com", "Toronto", "ON", "2023-04-22"),
    (6, "Noah", "Kelly", "noah.kelly@email.com", "Calgary", "AB", "2023-02-14"),
    (7, "Ava", "Singh", "ava.singh@email.com", "Toronto", "ON", "2023-05-01"),
    (8, "Ethan", "Wilson", "ethan.wilson@email.com", "Ottawa", "ON", "2023-03-18"),
    (9, "Olivia", "Brown", "olivia.brown@email.com", "Vancouver", "BC", "2023-06-09"),
    (10, "Lucas", "Nguyen", "lucas.nguyen@email.com", "Winnipeg", "MB", "2023-04-02"),
])`,

  products: `cur.execute("""
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    product_name TEXT,
    category TEXT,
    price REAL,
    stock_quantity INTEGER
)
""")
cur.executemany("INSERT INTO products VALUES (?,?,?,?,?)", [
    (1, "Wireless Mouse", "Electronics", 24.99, 150),
    (2, "Mechanical Keyboard", "Electronics", 89.99, 60),
    (3, "USB-C Charger", "Electronics", 19.99, 200),
    (4, "Bluetooth Headphones", "Electronics", 129.99, 45),
    (5, "Coffee Maker", "Home", 59.99, 30),
    (6, "Blender", "Home", 39.99, 40),
    (7, "Desk Lamp", "Home", 24.99, 80),
    (8, "Cotton T-Shirt", "Clothing", 14.99, 300),
    (9, "Denim Jeans", "Clothing", 49.99, 120),
    (10, "Running Shoes", "Clothing", 79.99, 90),
    (11, "Python Programming Book", "Books", 34.99, 55),
    (12, "SQL for Beginners Book", "Books", 29.99, 70),
])`,

  orders: `cur.execute("""
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date TEXT,
    status TEXT,
    total_amount REAL
)
""")
cur.executemany("INSERT INTO orders VALUES (?,?,?,?,?)", [
    (1, 1, "2023-05-01", "Completed", 69.97),
    (2, 2, "2023-05-03", "Completed", 89.99),
    (3, 3, "2023-05-05", "Completed", 39.98),
    (4, 1, "2023-05-10", "Completed", 24.99),
    (5, 4, "2023-05-12", "Cancelled", 79.99),
    (6, 5, "2023-05-15", "Completed", 149.98),
    (7, 6, "2023-05-18", "Completed", 39.99),
    (8, 7, "2023-05-20", "Pending", 129.99),
    (9, 2, "2023-05-22", "Completed", 74.98),
    (10, 8, "2023-05-25", "Completed", 79.98),
    (11, 3, "2023-06-01", "Completed", 29.99),
    (12, 9, "2023-06-03", "Completed", 209.98),
    (13, 5, "2023-06-05", "Completed", 19.99),
    (14, 10, "2023-06-08", "Pending", 49.99),
    (15, 1, "2023-06-10", "Completed", 64.97),
])`,

  order_items: `cur.execute("""
CREATE TABLE order_items (
    order_item_id INTEGER PRIMARY KEY,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price REAL
)
""")
cur.executemany("INSERT INTO order_items VALUES (?,?,?,?,?)", [
    (1, 1, 1, 2, 24.99), (2, 1, 3, 1, 19.99),
    (3, 2, 2, 1, 89.99),
    (4, 3, 7, 1, 24.99), (5, 3, 8, 1, 14.99),
    (6, 4, 7, 1, 24.99),
    (7, 5, 10, 1, 79.99),
    (8, 6, 4, 1, 129.99), (9, 6, 3, 1, 19.99),
    (10, 7, 6, 1, 39.99),
    (11, 8, 4, 1, 129.99),
    (12, 9, 9, 1, 49.99), (13, 9, 1, 1, 24.99),
    (14, 10, 5, 1, 59.99), (15, 10, 3, 1, 19.99),
    (16, 11, 12, 1, 29.99),
    (17, 12, 4, 1, 129.99), (18, 12, 10, 1, 79.99),
    (19, 13, 3, 1, 19.99),
    (20, 14, 9, 1, 49.99),
    (21, 15, 11, 1, 34.99), (22, 15, 8, 2, 14.99),
])`,

  employees: `cur.execute("""
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    department TEXT,
    hire_date TEXT
)
""")
cur.executemany("INSERT INTO employees VALUES (?,?,?,?,?)", [
    (1, "David", "Kim", "Sales", "2021-03-01"),
    (2, "Sarah", "Lopez", "Sales", "2021-07-15"),
    (3, "Michael", "Chen", "Marketing", "2020-11-20"),
    (4, "Emma", "Davis", "Marketing", "2022-01-10"),
    (5, "Ryan", "Patel", "Customer Support", "2021-05-05"),
    (6, "Grace", "Anderson", "Customer Support", "2022-08-18"),
])`,

  departments: `cur.execute("""
CREATE TABLE departments (
    department_id INTEGER PRIMARY KEY,
    department_name TEXT
)
""")
cur.executemany("INSERT INTO departments VALUES (?,?)", [
    (1, "Sales"), (2, "Marketing"), (3, "Customer Support"),
])`,
};

// Builds the full setup snippet for the tables a given lab needs, plus
// the run_sql() helper — this is the boilerplate every lab starts with.
export function dataMartSetup(tables: (keyof typeof TABLE_SETUP)[]): string {
  const tableCode = tables.map((t) => TABLE_SETUP[t]).join("\n\n");
  return `import sqlite3

conn = sqlite3.connect(":memory:")
cur = conn.cursor()

# --- DataMart setup ---
${tableCode}
conn.commit()

${RUN_SQL_HELPER}`;
}
