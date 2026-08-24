"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const npmCli =
  process.env.npm_execpath ||
  path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js"
  );

const audit = (label, cwd, args) => {
  const result = spawnSync(process.execPath, [npmCli, "audit", "--json", ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (!result.stdout) {
    throw new Error(`${label} audit did not return JSON.`);
  }
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} audit returned invalid JSON.`);
  }
  if (report.error) {
    throw new Error(`${label} audit could not complete.`);
  }
  return report.metadata?.vulnerabilities || {};
};

const rootProduction = audit("Root production", root, ["--omit=dev"]);
const frontendProduction = audit("Frontend production", path.join(root, "frontend"), [
  "--omit=dev",
]);
const rootComplete = audit("Root complete", root, []);
const frontendComplete = audit("Frontend complete", path.join(root, "frontend"), []);

const blocking = [];
for (const [label, counts] of [
  ["root production", rootProduction],
  ["frontend production", frontendProduction],
  ["frontend complete", frontendComplete],
]) {
  if ((counts.critical || 0) > 0 || (counts.high || 0) > 0) blocking.push(label);
}
if ((rootComplete.critical || 0) > 0) blocking.push("root complete (critical)");

const summary = {
  policy: {
    block: "critical/high production, critical tooling, or critical/high frontend",
    review: "moderate production or high development-only",
  },
  rootProduction,
  frontendProduction,
  rootComplete,
  frontendComplete,
  acceptedDevelopmentHigh: rootComplete.high || 0,
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (blocking.length) {
  process.stderr.write(`Dependency security gate blocked: ${blocking.join(", ")}\n`);
  process.exitCode = 1;
}
