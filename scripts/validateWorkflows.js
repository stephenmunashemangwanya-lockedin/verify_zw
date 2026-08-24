const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const directory = path.resolve(".github/workflows");
const expected = ["ci.yml", "deploy.yml", "docker.yml", "e2e.yml", "release.yml", "security.yml"];
const errors = [];
for (const name of expected) {
  const file = path.join(directory, name);
  if (!fs.existsSync(file)) { errors.push(`${name}: missing`); continue; }
  let workflow; const source = fs.readFileSync(file, "utf8");
  try { workflow = YAML.parse(source); } catch (error) { errors.push(`${name}: ${error.message}`); continue; }
  if (!workflow.permissions) errors.push(`${name}: explicit workflow permissions are required`);
  if (/uses:\s*[^\s]+@(?:main|master|v\d+)(?:\s|$)/m.test(source)) errors.push(`${name}: actions must use exact release tags`);
  if (/write-all/.test(source)) errors.push(`${name}: write-all is forbidden`);
  if (/\.env(?:\.docker)?\b|backups\/|restore-test\//.test(String(workflow?.jobs && JSON.stringify(workflow.jobs).match(/upload-artifact[\s\S]*/)))) errors.push(`${name}: forbidden artifact path`);
}
if (errors.length) throw new Error(`Workflow validation failed:\n${errors.join("\n")}`);
console.log(JSON.stringify({ workflows: expected.length, yaml: "valid", policy: "passed" }));
