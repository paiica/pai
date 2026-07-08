#!/usr/bin/env node
// Rewrites the cross-app URL variables in each app's .env.local from the single
// source of truth at ../.env.shared.json, without touching any other line
// (secrets, API keys, etc.) that already lives in that file.
//
// Usage: npm run env:generate

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const shared = JSON.parse(fs.readFileSync(path.join(root, ".env.shared.json"), "utf8"));

// appDir -> { ENV_VAR_NAME: sharedKey }
const APPS = {
  "marketing-site": {
    NEXT_PUBLIC_SITE_URL: "MARKETING_URL",
    NEXT_PUBLIC_LMS_URL: "PORTAL_URL",
    NEXT_PUBLIC_API_URL: "API_URL",
  },
  admin: {
    NEXT_PUBLIC_API_URL: "API_URL",
    NEXT_PUBLIC_LMS_URL: "PORTAL_URL",
    NEXT_PUBLIC_MARKETING_URL: "MARKETING_URL",
    NEXT_PUBLIC_PROFESSORS_URL: "PROFESSORS_URL",
  },
  professors: {
    NEXT_PUBLIC_API_URL: "API_URL",
    NEXT_PUBLIC_LMS_URL: "PORTAL_URL",
    NEXT_PUBLIC_ADMIN_URL: "ADMIN_URL",
  },
  affiliate: {
    NEXT_PUBLIC_API_URL: "API_URL",
    NEXT_PUBLIC_MARKETING_URL: "MARKETING_URL",
    NEXT_PUBLIC_FRONTEND_URL: "PORTAL_URL",
  },
  "lms-platform/apps/frontend": {
    NEXT_PUBLIC_API_URL: "API_URL",
    NEXT_PUBLIC_SITE_URL: "PORTAL_URL",
    NEXT_PUBLIC_MARKETING_URL: "MARKETING_URL",
    NEXT_PUBLIC_PAIIEXAMS_URL: "PAIIEXAMS_URL",
  },
  "lms-platform/apps/paiiexams": {
    NEXT_PUBLIC_API_URL: "API_URL",
    NEXT_PUBLIC_ADMIN_URL: "EXAM_ADMIN_URL",
    NEXT_PUBLIC_STUDENT_PORTAL_URL: "PORTAL_URL",
    NEXT_PUBLIC_PORTAL_URL: "PORTAL_URL",
  },
  "lms-platform/apps/exam-admin": {
    NEXT_PUBLIC_API_URL: "API_URL",
  },
};

for (const [appDir, varMap] of Object.entries(APPS)) {
  const envPath = path.join(root, appDir, ".env.local");
  const existingLines = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8").split("\n")
    : [];

  const managedKeys = new Set(Object.keys(varMap));
  const untouchedLines = existingLines.filter((line) => {
    const key = line.split("=")[0]?.trim();
    return !managedKeys.has(key);
  });

  const managedLines = Object.entries(varMap).map(
    ([envVar, sharedKey]) => `${envVar}=${shared[sharedKey]}`,
  );

  const output = [...managedLines, ...untouchedLines]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+$/, "\n");

  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, output);
  console.log(`Updated ${appDir}/.env.local`);
}
