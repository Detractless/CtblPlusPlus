#!/usr/bin/env node

/**
 * check-file-size.js — File size threshold detection
 *
 * Counts lines in code files and flags those exceeding thresholds.
 * Size is a signal for Part-Auto's SRP verification, not a verdict.
 *
 * Usage: node check-file-size.js <target_dir>
 * Output: JSON findings array
 */

const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "coverage", "__tests__", "__mocks__", ".cache",
]);

const CODE_EXTENSIONS = new Set([".js", ".mjs", ".jsx", ".ts", ".tsx"]);

const THRESHOLDS = {
  SOFT: 150,    // Component soft flag
  HARD: 300,    // Hard flag for any file
  CRITICAL: 500, // Almost certainly needs splitting
};

function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node check-file-size.js <target_dir>");
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

    const lineCount = content.split("\n").length;
    const relPath = path.relative(targetDir, fullPath);
    const isComponent = isComponentFile(fullPath, targetDir);
    const fileType = isComponent ? "component" : getFileType(fullPath, targetDir);

    if (lineCount >= THRESHOLDS.CRITICAL) {
      findings.push({
        id: "",
        phase: "auto",
        severity: "S2-HINDERING",
        category: "cohesion",
        file: relPath,
        evidence: `${lineCount} lines (${fileType} file, threshold: ${THRESHOLDS.CRITICAL})`,
        explanation: `File exceeds ${THRESHOLDS.CRITICAL} lines — almost certainly doing too much for a single module`,
        fix: `Identify distinct responsibilities and split into focused files`,
        confidence: "confirmed",
        effort: "medium",
      });
    } else if (lineCount >= THRESHOLDS.HARD) {
      findings.push({
        id: "",
        phase: "auto",
        severity: "S3-DRIFTING",
        category: "cohesion",
        file: relPath,
        evidence: `${lineCount} lines (${fileType} file, threshold: ${THRESHOLDS.HARD})`,
        explanation: `File exceeds ${THRESHOLDS.HARD} lines — review for multiple responsibilities`,
        fix: `Check if this file does one complex thing (fine) or multiple simple things (split)`,
        confidence: "candidate",
        effort: "medium",
      });
    } else if (isComponent && lineCount >= THRESHOLDS.SOFT) {
      findings.push({
        id: "",
        phase: "auto",
        severity: "S3-DRIFTING",
        category: "cohesion",
        file: relPath,
        evidence: `${lineCount} lines (component file, threshold: ${THRESHOLDS.SOFT})`,
        explanation: `Component exceeds ${THRESHOLDS.SOFT} lines — may contain logic that belongs in a separate file`,
        fix: `Check for fetch calls, data transforms, or complex state that could be extracted`,
        confidence: "candidate",
        effort: "small",
      });
    }
  }
}

function isComponentFile(filePath, targetDir) {
  const rel = path.relative(targetDir, filePath);
  return rel.split(path.sep).some((p) => p.toLowerCase() === "components");
}

function getFileType(filePath, targetDir) {
  const rel = path.relative(targetDir, filePath);
  const parts = rel.split(path.sep);

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (["pages", "routes"].includes(lower)) return "page";
    if (["services"].includes(lower)) return "service";
    if (["utils", "lib", "shared"].includes(lower)) return "utility";
    if (["store"].includes(lower)) return "store";
    if (["constants"].includes(lower)) return "constants";
  }
  return "module";
}

main();
