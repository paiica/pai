import { chromium } from "playwright";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "apps/backend/.env") });

const SECRET = process.env.JWT_ACCESS_SECRET;
const USER_ID = "51243916-1a0e-4835-9d3a-3414e2d2b7bf"; // admin@paii.ca, super_admin
const COURSE_ID = "13d5eb81-e4ef-4c00-8cef-833a6edec0b6"; // AI Foundations

const token = jwt.sign({ sub: USER_ID, email: "admin@paii.ca", role: "super_admin" }, SECRET, { expiresIn: "1h" });

// 1x1 red pixel PNG
const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const testImgPath = resolve(__dirname, "test-pixel.png");
writeFileSync(testImgPath, Buffer.from(pngBase64, "base64"));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));

await page.goto("http://localhost:3002/login");
await page.evaluate(({ token, userId }) => {
  localStorage.setItem("pai-admin-auth", JSON.stringify({
    state: { user: { id: userId, email: "admin@paii.ca", role: "super_admin" }, accessToken: token, refreshToken: null },
    version: 0,
  }));
}, { token, userId: USER_ID });

await page.goto(`http://localhost:3002/courses/${COURSE_ID}/builder`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: resolve(__dirname, "shot-1-builder.png") });

// Select the Perceptron lesson
await page.getByText("The Perceptron: Your First Neural Network", { exact: false }).first().click();
await page.waitForTimeout(1000);
await page.screenshot({ path: resolve(__dirname, "shot-2-lesson-selected.png") });

// Find the image toolbar button (title starts with "Insert image")
const imageButton = page.locator('button[title^="Insert image"]').first();
const buttonVisible = await imageButton.isVisible().catch(() => false);
console.log("Image button visible:", buttonVisible);

if (buttonVisible) {
  const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 5000 }).catch(() => null);
  await imageButton.click();
  const fileChooser = await fileChooserPromise;
  console.log("File chooser opened:", !!fileChooser);

  if (fileChooser) {
    await fileChooser.setFiles(testImgPath);
    await page.waitForTimeout(3000); // allow upload to complete
    await page.screenshot({ path: resolve(__dirname, "shot-3-after-upload.png") });

    const imgInEditor = await page.locator(".ProseMirror img").count();
    console.log("Images found in editor content:", imgInEditor);
    if (imgInEditor > 0) {
      const src = await page.locator(".ProseMirror img").first().getAttribute("src");
      console.log("Inserted image src:", src);
    }
  }
}

console.log("Console errors:", JSON.stringify(consoleErrors, null, 2));

await browser.close();
