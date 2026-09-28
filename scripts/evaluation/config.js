"use strict";
const path = require("node:path");
const assert = require("node:assert/strict");
const CHAIN_DEPENDENCY = "in-process deterministic evaluation stub";
const MODES = Object.freeze(["full", "no-anchor"]);
const profiles = Object.freeze({
  smoke: Object.freeze({ modes: MODES, concurrency: Object.freeze([1, 5]), runs: 1,
    warmupPerModePerConcurrency: 5, measuredPerModePerConcurrency: 20 }),
  formal: Object.freeze({ modes: MODES, concurrency: Object.freeze([1, 5, 10, 20, 50]), runs: 3,
    warmupPerModePerConcurrency: 100, measuredPerModePerConcurrency: 1000 }),
});
function totals(profile) {
  const groups = profile.modes.length * profile.concurrency.length * profile.runs;
  return { measured: groups * profile.measuredPerModePerConcurrency,
    warmups: groups * profile.warmupPerModePerConcurrency };
}
assert.deepEqual(totals(profiles.formal), { measured: 30000, warmups: 3000 });
assert.deepEqual(totals(profiles.smoke), { measured: 80, warmups: 20 });
function requireSmokeProfile(name = "smoke") {
  if (name !== "smoke") throw new Error("Only smoke execution is implemented. Formal is configuration-only and cannot run, even with --allow-formal.");
  return profiles.smoke;
}
module.exports = { CHAIN_DEPENDENCY, profiles, totals, requireSmokeProfile,
  OUTPUT_DIR: path.resolve(__dirname, "../../test-results/research") };
