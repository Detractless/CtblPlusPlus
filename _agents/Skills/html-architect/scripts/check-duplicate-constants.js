#!/usr/bin/env node

/**
 * check-duplicate-constants.js — Duplicate constant detection
 *
 * Finds constant values and exported names that appear identically
 * in multiple files. Produces candidates for Part-Auto verification
 * (same string might mean different things in different contexts).
 *
 * Usage: node check-duplicate-constants.js <target_dir>
 * Output: JSON findings array
 */

const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "coverage", "__tests__", "__mocks__", ".cache",
]);

const CODE_EXTENSIONS = new Set([".js", ".mjs", ".jsx", ".ts", ".tsx"]);

// Common strings that are not meaningful duplicates
const IGNORE_VALUES = new Set([
  "", "none", "default", "true", "false", "null", "undefined",
  "GET", "POST", "PUT", "DELETE", "PATCH",
  "utf-8", "utf8", "application/json", "Content-Type",
  "click", "change", "submit", "input", "load", "error",
  "div", "span", "button", "form", "input",
  "flex", "block", "none", "hidden", "visible",
  "left", "right", "center", "top", "bottom",
]);

const MIN_VALUE_LENGTH = 4;

function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node check-duplicate-constants.js <target_dir>");
    process.exit(1);
  }

  const files = collectFiles(targetDir);
  const constantMap = new Map(); // value → [{file, name, line}]
  const exportNameMap = new Map(); // exported name → [{file, line}]

  for (const filePath of files) {
    const content = readFileSafe(filePath);
    if (!content) continue;

    const rel = path.relative(targetDir, filePath);
    const constants = extractConstants(content, rel);

    for (const c of constants) {
      // Track by value
      if (c.value && c.value.length >= MIN_VALUE_LENGTH && !IGNORE_VALUES.has(c.value)) {
        if (!constantMap.has(c.value)) constantMap.set(c.value, []);
        constantMap.get(c.value).push({ file: rel, name: c.name, line: c.line });
      }

      // Track by exported name
      if (c.exported && c.name) {
        if (!exportNameMap.has(c.name)) exportNameMap.set(c.name, []);
        exportNameMap.get(c.name).push({ file: rel, line: c.line, value: c.value });
      }
    }
  }

  const findings = [];

  // Report duplicate values
  for (const [value, locations] of constantMap) {
    if (locations.length < 2) continue;

    // Deduplicate files (same file defining it twice is a different problem)
    const uniqueFiles = [...new Set(locations.map((l) => l.file))];
    if (uniqueFiles.length < 2) continue;

    const displayValue = value.length > 60 ? value.substring(0, 60) + "..." : value;
    const fileList = locations
      .map((l) => `${l.file}:${l.line} (${l.name || "literal"})`)
      .join(", ");

    findings.push({
      id: "",
      phase: "auto",
      severity: "S2-HINDERING",
      category: "duplication",
      file: locations[0].file,
      evidence: `Value "${displayValue}" defined in ${uniqueFiles.length} files: ${fileList}`,
      explanation: `Identical constant value appears in multiple files — when one copy is updated and the other isn't, behavior diverges silently`,
      fix: `Define once in constants/ and import everywhere. Value: "${displayValue}"`,
      confidence: "candidate",
      effort: "small",
    });
  }

  // Report duplicate export names (different files exporting the same name)
  for (const [name, locations] of exportNameMap) {
    if (locations.length < 2) continue;

    const uniqueFiles = [...new Set(locations.map((l) => l.file))];
    if (uniqueFiles.length < 2) continue;

    // Skip if values are different (same name, different purpose — still worth flagging)
    const uniqueValues = [...new Set(locations.map((l) => l.value).filter(Boolean))];

    const fileList = locations.map((l) => l.file).join(", ");

    findings.push({
      id: "",
      phase: "auto",
      severity: uniqueValues.length === 1 ? "S2-HINDERING" : "S3-DRIFTING",
      category: "duplication",
      file: locations[0].file,
      evidence: `Export name "${name}" defined in ${uniqueFiles.length} files: ${fileList}${uniqueValues.length > 1 ? " (different values)" : " (same value)"}`,
      explanation: uniqueValues.length === 1
        ? `Same constant exported under the same name from multiple files — consolidate to one source of truth`
        : `Same export name used in multiple files with different values — potential confusion for importers`,
      fix: uniqueValues.length === 1
        ? `Keep one definition, re-export or import from the canonical location`
        : `Rename to distinguish purpose (e.g., AUTH_API_URL vs USER_API_URL)`,
      confidence: "candidate",
      effort: "small",
    });
  }

  console.log(JSON.stringify({ findings }));
}

function collectFiles(dir) {
  const results = [];

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith(".")) continue;

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(entry.name);
        if (CODE_EXTENSIONS.has(ext)) {
          // Skip test files
          if (!entry.name.includes(".test.") && !entry.name.includes(".spec.")) {
            results.push(fullPath);
          }
        }
      }
    }
  }

  walk(dir);
  return results;
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function extractConstants(content, filePath) {
  const constants = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

    // Match: const NAME = "value" or const NAME = 'value'
    const constMatch = trimmed.match(
      /^(?:export\s+)?(?:const|let|var)\s+([A-Z_][A-Z_0-9]*)\s*=\s*['"](.*?)['"]/
    );
    if (constMatch) {
      constants.push({
        name: constMatch[1],
        value: constMatch[2],
        line: i + 1,
        exported: trimmed.startsWith("export"),
      });
      continue;
    }

    // Match: const camelName = "value" (non-SCREAMING_SNAKE but still a constant)
    const camelConstMatch = trimmed.match(
      /^(?:export\s+)?const\s+(\w+)\s*=\s*['"](.*?)['"]/
    );
    if (camelConstMatch) {
      constants.push({
        name: camelConstMatch[1],
        value: camelConstMatch[2],
        line: i + 1,
        exported: trimmed.startsWith("export"),
      });
      continue;
    }

    // Match: URL-like strings assigned anywhere (common duplication vector)
    const urlMatch = trimmed.match(
      /['"](https?:\/\/[^'"]+|\/api\/[^'"]+)['"]/
    );
    if (urlMatch) {
      constants.push({
        name: null,
        value: urlMatch[1],
        line: i + 1,
        exported: false,
      });
    }
  }

  return constants;
}

main();
