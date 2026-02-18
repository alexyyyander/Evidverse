#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const I18N_PATH = path.join(ROOT, "src/lib/i18n.ts");
const SRC_PATH = path.join(ROOT, "src");
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(dirPath, out) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(fullPath);
    }
  }
}

function extractDictKeys(i18nText) {
  const keys = new Set();
  const re = /^\s*"([^"]+)":\s*\{/gm;
  let match;
  while ((match = re.exec(i18nText)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function addKey(used, rawKey, filePath) {
  if (!rawKey || rawKey.includes("${")) return;
  if (!used.has(rawKey)) {
    used.set(rawKey, []);
  }
  used.get(rawKey).push(filePath);
}

function extractUsedKeys(filePath) {
  const content = readText(filePath);
  const used = new Map();

  const directCallPatterns = [
    /\b(?:t|i18nText)\(\s*(["'`])([^"'`]+)\1/gm,
    /\btranslate\(\s*[^,]+,\s*(["'`])([^"'`]+)\1/gm,
  ];

  for (const re of directCallPatterns) {
    let match;
    while ((match = re.exec(content)) !== null) {
      addKey(used, match[2], filePath);
    }
  }

  return used;
}

function main() {
  if (!fs.existsSync(I18N_PATH)) {
    console.error(`[i18n-check] missing dictionary file: ${I18N_PATH}`);
    process.exit(1);
  }

  const dictKeys = extractDictKeys(readText(I18N_PATH));
  if (dictKeys.size === 0) {
    console.error("[i18n-check] no keys found in src/lib/i18n.ts");
    process.exit(1);
  }

  const sourceFiles = [];
  walkFiles(SRC_PATH, sourceFiles);
  const used = new Map();
  for (const filePath of sourceFiles) {
    const partial = extractUsedKeys(filePath);
    for (const [key, files] of partial.entries()) {
      if (!used.has(key)) {
        used.set(key, []);
      }
      used.get(key).push(...files);
    }
  }

  const missing = [];
  for (const [key, files] of used.entries()) {
    if (!dictKeys.has(key)) {
      missing.push({ key, files: Array.from(new Set(files)).sort() });
    }
  }

  if (missing.length > 0) {
    console.error(`[i18n-check] missing ${missing.length} translation key(s):`);
    for (const item of missing.sort((a, b) => a.key.localeCompare(b.key))) {
      console.error(`  - ${item.key}`);
      for (const filePath of item.files.slice(0, 3)) {
        console.error(`      ${path.relative(ROOT, filePath)}`);
      }
    }
    process.exit(1);
  }

  console.log(`[i18n-check] OK - ${used.size} used key(s), ${dictKeys.size} dictionary key(s)`);
}

main();
