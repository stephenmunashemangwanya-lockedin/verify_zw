const fs = require("fs");
const path = require("path");

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ["coverage", "frontend/coverage", "frontend/dist", "test-results", "artifacts/test", "sbom"];
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".md", ".txt", ".xml", ".yaml", ".yml"]);
const forbiddenNames = /(^|[/\\])(?:\.env(?:\..*)?|.*\.(?:dump|backup|age|gpg|enc)|id_rsa|.*\.pem)$/i;
const forbiddenContent = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
  /(?:DB_PASSWORD|JWT_SECRET|PINATA_JWT|DEPLOYER_PRIVATE_KEY)\s*[:=]\s*["']?(?!<|\$\{|\[REDACTED\]|fake|test|ci-placeholder)[^\s"']{8,}/i,
];
const files = [];
const walk = (candidate) => {
  if (!fs.existsSync(candidate)) return;
  const stat = fs.statSync(candidate);
  if (stat.isDirectory()) for (const entry of fs.readdirSync(candidate)) walk(path.join(candidate, entry));
  else files.push(candidate);
};
for (const root of roots) walk(path.resolve(root));
for (const file of files) {
  const relative = path.relative(process.cwd(), file);
  if (forbiddenNames.test(relative)) throw new Error(`Forbidden CI artifact filename: ${relative}`);
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of forbiddenContent) if (pattern.test(content)) throw new Error(`Potential secret in CI artifact: ${relative}`);
}
console.log(JSON.stringify({ scannedFiles: files.length, secretScan: "passed" }));
