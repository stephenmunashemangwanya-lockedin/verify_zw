const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const root = path.resolve(__dirname, "..");
const openapiPath = path.join(root, "docs", "openapi.yaml");
const collectionPath = path.join(root, "docs", "postman", "Zimbabwe-Skill-Verification-Platform.postman_collection.json");
const environmentPath = path.join(root, "docs", "postman", "Local.postman_environment.json");
const specText = fs.readFileSync(openapiPath, "utf8");
const specification = YAML.parse(specText);
if (specification.openapi !== "3.0.3" || !specification.info || !specification.components?.securitySchemes?.BearerAuth) throw new Error("OpenAPI metadata or BearerAuth is invalid.");

const mounts = [
  ["/api/auth", "authRoutes"], ["/api/users", "userRoutes"], ["/api/institutions", "institutionRoutes"],
  ["/api/students", "studentRoutes"], ["/api/credentials", "credentialRoutes"], ["/api/verify", "verificationRoutes"],
  ["/api/verification-logs", "verificationLogRoutes"], ["/api/audit-logs", "auditRoutes"], ["/api/dashboard", "dashboardRoutes"],
  ["/health", "healthRoutes"], ["/metrics", "metricsRoutes"], ["/api/docs", "docsRoutes"],
];
const normalize = (value) => value.replace(/:([A-Za-z0-9_]+)/g, "{$1}").replace(/\/$/, "") || "/";
const actual = new Set();
for (const [prefix, moduleName] of mounts) {
  const router = require(path.join(root, "backend", "routes", moduleName));
  for (const layer of router.stack || []) {
    if (!layer.route) continue;
    for (const method of Object.keys(layer.route.methods)) actual.add(`${method.toUpperCase()} ${normalize(prefix + (layer.route.path === "/" ? "" : layer.route.path))}`);
  }
}
// Swagger UI is mounted as middleware so Express does not expose a route-layer
// method; its browser entry point is nevertheless an implemented GET route.
actual.add("GET /api/docs");
const documented = new Set();
const operationIds = [];
for (const [route, item] of Object.entries(specification.paths || {})) for (const method of ["get", "post", "put", "patch", "delete"]) if (item[method]) documented.add(`${method.toUpperCase()} ${route}`);
for (const item of Object.values(specification.paths || {})) for (const method of ["get", "post", "put", "patch", "delete"]) if (item[method]?.operationId) operationIds.push(item[method].operationId);
if (new Set(operationIds).size !== operationIds.length) throw new Error("Duplicate OpenAPI operationId detected.");
const componentGroups = specification.components || {};
const visit = (value) => { if (!value || typeof value !== "object") return; if (typeof value.$ref === "string" && value.$ref.startsWith("#/components/")) { const [, , group, name] = value.$ref.split("/"); if (!componentGroups[group]?.[name]) throw new Error(`Missing OpenAPI reference: ${value.$ref}`); } for (const child of Object.values(value)) visit(child); };
visit(specification);
const missing = [...actual].filter((route) => !documented.has(route));
const invented = [...documented].filter((route) => !actual.has(route));
if (missing.length || invented.length) throw new Error(`Route mismatch. Missing: ${missing.join(", ") || "none"}. Invented: ${invented.join(", ") || "none"}.`);
if (process.argv.includes("--openapi-only")) { console.log(`OpenAPI 3.0.3 valid: ${documented.size} operations.`); process.exit(0); }

const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));
const environment = JSON.parse(fs.readFileSync(environmentPath, "utf8"));
if (!collection.info?.schema?.includes("collection") || !Array.isArray(collection.item) || !Array.isArray(environment.values)) throw new Error("Postman artifacts are invalid.");
if (new Set(collection.item.map((folder) => folder.name)).size !== collection.item.length) throw new Error("Duplicate Postman folder detected.");
for (const required of ["Health", "Authentication", "Users", "Institutions", "Students", "Credentials", "Verification", "Verification Logs", "Audit Logs", "Dashboard", "QR Codes", "Generated Certificates", "Blockchain Administration"]) if (!collection.item.some((folder) => folder.name === required)) throw new Error(`Missing Postman folder: ${required}`);
for (const key of ["baseUrl", "token", "userId", "institutionId", "studentId", "credentialId", "publicToken", "certificateHash", "samplePdfPath"]) if (!environment.values.some((entry) => entry.key === key)) throw new Error(`Missing Postman environment variable: ${key}`);
const docs = fs.readdirSync(path.join(root, "docs"), { recursive: true }).filter((name) => /\.(md|ya?ml|json)$/i.test(name)).map((name) => fs.readFileSync(path.join(root, "docs", name), "utf8")).join("\n");
const secretScanDocs = docs.replace(/\bsha256:[a-f0-9]{64}\b/gi, "sha256:<digest>");
const forbidden = [/(?:0x)?[a-f0-9]{64}\b/i, /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\./, /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, /(?:DB_PASSWORD|JWT_SECRET|PINATA_JWT|PRIVATE_KEY)\s*[=:]\s*(?!<)[^\s]+/i];
for (const pattern of forbidden) if (pattern.test(secretScanDocs)) throw new Error(`Documentation secret scan failed for ${pattern}.`);
console.log(JSON.stringify({ openapi: specification.openapi, operations: documented.size, operationIds: operationIds.length, postmanFolders: collection.item.length, environmentVariables: environment.values.length, secretScan: "passed" }));
