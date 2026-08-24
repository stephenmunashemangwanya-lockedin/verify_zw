import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

const dist = path.resolve("dist");
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const entryMatch = html.match(/<script[^>]+src="\/assets\/([^"]+\.js)"/);
if (!entryMatch)
  throw new Error("Unable to identify the production entry chunk.");

const assets = path.join(dist, "assets");
const scripts = fs.readdirSync(assets).filter((file) => file.endsWith(".js"));
const entry = entryMatch[1];
const entryBytes = fs.statSync(path.join(assets, entry)).size;
const maximumInitialBytes = 500_000;

if (entryBytes > maximumInitialBytes) {
  throw new Error(
    `Initial entry ${entry} is ${entryBytes} bytes; budget is ${maximumInitialBytes}.`
  );
}
if (!scripts.some((file) => file.startsWith("Dashboard-"))) {
  throw new Error("Dashboard/Recharts code is not isolated in a lazy chunk.");
}
if (!scripts.some((file) => file.startsWith("Management-"))) {
  throw new Error(
    "Authenticated management code is not isolated in a lazy chunk."
  );
}
if (
  fs
    .readdirSync(dist, { recursive: true })
    .some((file) => String(file).endsWith(".map"))
) {
  throw new Error("Public production source maps must remain disabled.");
}

const bytes = fs.readFileSync(path.join(assets, entry));
process.stdout.write(
  `${JSON.stringify(
    {
      entry,
      entryBytes,
      entryGzipBytes: zlib.gzipSync(bytes).length,
      budgetBytes: maximumInitialBytes,
      lazyChunks: scripts.filter((file) => file !== entry).sort(),
    },
    null,
    2
  )}\n`
);
