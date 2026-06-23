import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["face-api.js"],
  outputFileTracingRoot: path.join(__dirname, "../../.."),
};

export default config;
