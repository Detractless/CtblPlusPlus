#!/usr/bin/env node

/**
 * check-fetch-in-components.js — API call layer violation detection
 *
 * Scans files inside components/ directories for patterns that indicate
 * direct API interaction. Components should delegate to services.
 *
 * Usage: node check-fetch-in-components.js <target_dir>
 * Output: JSON findings array
 */

const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "coverage", "__tests__", "__mocks__", ".cache",
]);

const CODE_EXTENSIONS = new Set([".js", ".mjs", ".jsx", ".ts", ".tsx"]);

// Patterns that indicate direct API interaction
const FETCH_PATTERNS = [
  { pattern: /\bfetch\s*\(/, name: "fetch()" },
  { pattern: /\baxios\s*[.(]/, name: "axios" },
  { pattern: /\bXMLHttpRequest\b/, name: "XMLHttpRequest" },
  { pattern: /\$\.(ajax|get|post|put|delete)\s*\(/, name: "$.ajax" },
  { pattern: /new\s+WebSocket\s*\(/, name: "WebSocket" },
  { pattern: /navigator\.sendBeacon\s*\(/, name: "navigator.sendBeacon" },
];

function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node check-fetch-in-components.js <target_dir>");
    process.exit(1);
  }

  const findings = [];
  walk(targetDir, targetDir, findings);
  console.log(JSON.stringify({ findings }));
}

function walk(dir, targetDir, findings) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, targetDir, findings);
      continue;
    }

    // Only check files inside components/ directories
    const rel = path.relative(targetDir, fullPath);
    const inComponents = rel.split(path.sep).some((p) => p.toLowerCase() === "components");
    if (!inComponents) continue;

    const ext = path.extname(entry.name);
    if (!CODE_EXTENSIONS.has(ext)) continue;

    // Skip test files
    if (entry.name.includes(".test.") || entry.name.includes(".spec.")) continue;

    let content;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comments
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

      // Skip string literals (rough: line is mostly a string assignment)
      if (/^\s*(const|let|var)\s+\w+\s*=\s*['"`]/.test(line)) continue;

      for (const { pattern, name } of FETCH_PATTERNS) {
        if (pattern.test(line)) {
          findings.push({
            id: "",
            phase: "auto",
            severity: "S1-BLOCKING",
            category: "layer-violation",
            file: rel,
            evidence: `Line ${i + 1}: ${trimmed.substring(0, 120)}${trimmed.length > 120 ? "..." : ""}`,
            explanation: `Component file contains ${name} — direct API interaction belongs in services/, not components/`,
            fix: `Extract the API call into a service function (e.g., services/${suggestServiceName(rel)}.js) and call it from the component`,
            confidence: "confirmed",
            effort: "small",
          });
          break; // One finding per line is enough
        }
      }
    }
  }
}

function suggestServiceName(componentPath) {
  const parts = componentPath.split(path.sep);
  const compIdx = parts.findIndex((p) => p.toLowerCase() === "components");
  if (compIdx >= 0 && compIdx + 1 < parts.length) {
    const componentName = parts[compIdx + 1];
    // PascalCase → camelCase + "Service"
    return componentName.charAt(0).toLowerCase() + componentName.slice(1) + "Service";
  }
  return "apiService";
}

main();
