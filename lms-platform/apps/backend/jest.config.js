const path = require("path");

// Prisma 6's default @prisma/client entry resolves through a conditional
// "#main-entry-point" package import that Jest's resolver doesn't handle the
// same way Node/ts-node do — it silently loses the generated enum exports
// (e.g. ExamAttemptStatus) under ts-jest. Point tests straight at the
// generated client file, which has the real exports.
const generatedPrismaClient = path.resolve(__dirname, "../../../node_modules/.prisma/client/index.js");

/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  moduleFileExtensions: ["js", "json", "ts"],
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.spec.json" }],
  },
  moduleNameMapper: {
    "^@prisma/client$": generatedPrismaClient,
  },
  collectCoverageFrom: ["**/*.service.ts"],
  coverageDirectory: "../coverage",
};
