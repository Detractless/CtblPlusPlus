#!/usr/bin/env node

/**
 * check-naming.js — Naming convention violations
 *
 * Scans directory tree for file/folder names that violate structural
 * naming conventions. Does not read file contents.
 *
 * Usage: node check-naming.js <target_dir>
 * Output: JSON findings array
 */

const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "coverage", "__tests__", "__mocks__", ".cache", "assets",
]);

// Junk-drawer file names (with optional version suffix)
const JUNK_DRAWER_PATTERN = /^(utils|helpers|misc|common|shared|funcs|functions)(V?\d+)?\.([jt]sx?|mjs)$/i;

// Forbidden folder names
const FORBIDDEN_FOLDERS = new Set(["new", "old", "temp", "backup", "tmp"]);

// PascalCase check: starts with uppercase, no hyphens or underscores
const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;

// camelCase check: starts with lowercase
const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;

const CODE_EXTENSIONS = new Set([".js", ".mjs", ".jsx", ".ts", ".tsx"]);

function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node check-naming.js <target_dir>");
    process.exit(1);
  }

  const findings = [];
  walk(targetDir, targetDir, findings);
  console.log(JSON.stringify({ findings }));
}

function walk(current, targetDir, findings) {
  let entries;
  try {
    entries = fs.readdirSync(current, { withFileTypes: true });
  } catch {
    return;
  }

  // Determine context: are we inside a components/ folder?
  const rel = path.relative(targetDir, current);
  const parts = rel.split(path.sep);
  const inComponents = parts.some((p) => p.toLowerCase() === "components");
  const inServices = parts.some((p) => ["services", "utils", "lib"].includes(p.toLowerCase()));

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(current, entry.name);
    const relPath = path.relative(targetDir, fullPath);

    if (entry.isDirectory()) {
      // Check for forbidden folder names
      if (FORBIDDEN_FOLDERS.has(entry.name.toLowerCase())) {
        findings.push({
          id: "",
          phase: "auto",
          severity: "S4-COSMETIC",
          category: "naming",
          file: relPath,
          evidence: `Folder named "${entry.name}"`,
          explanation: `Folders named ${entry.name}/ suggest temporary or transitional content that should be resolved, not committed`,
          fix: `Rename to describe the folder's actual purpose, or remove if contents are no longer needed`,
          confidence: "confirmed",
          effort: "trivial",
        });
      }

      walk(fullPath, targetDir, findings);
      continue;
    }

    // Only check code files
    const ext = path.extname(entry.name);
    if (!CODE_EXTENSIONS.has(ext)) {
      // Check CSS naming against sibling JS
      if (ext === ".css") {
        checkCssNaming(current, entry.name, relPath, findings);
      }
      continue;
    }

    const baseName = path.basename(entry.name, ext);

    // Junk-drawer names
    if (JUNK_DRAWER_PATTERN.test(entry.name)) {
      // index.js inside component folders is the re-export pattern — skip
      if (baseName.toLowerCase() === "index" && inComponents) continue;

      findings.push({
        id: "",
        phase: "auto",
        severity: "S3-DRIFTING",
        category: "naming",
        file: relPath,
        evidence: `File named "${entry.name}"`,
        explanation: `"${baseName}" is a junk-drawer name — it will attract unrelated code over time. Name the file for what the code actually does.`,
        fix: `Rename to describe the specific responsibility (e.g., formatDate.js, validateEmail.js)`,
        confidence: "confirmed",
        effort: "trivial",
      });
      continue;
    }

    // Component file casing: should be PascalCase
    if (inComponents && baseName !== "index") {
      if (!PASCAL_CASE.test(baseName)) {
        findings.push({
          id: "",
          phase: "auto",
          severity: "S4-COSMETIC",
          category: "naming",
          file: relPath,
          evidence: `Component file "${entry.name}" is not PascalCase`,
          explanation: `Component files should be PascalCase to match their exported class/function name`,
          fix: `Rename to ${toPascalCase(baseName)}${ext}`,
          confidence: "confirmed",
          effort: "trivial",
        });
      }
    }

    // Service/utility file casing: should be camelCase
    if (inServices && baseName !== "index") {
      if (!CAMEL_CASE.test(baseName) && !PASCAL_CASE.test(baseName)) {
        findings.push({
          id: "",
          phase: "auto",
          severity: "S4-COSMETIC",
          category: "naming",
          file: relPath,
          evidence: `Service/utility file "${entry.name}" uses non-standard casing`,
          explanation: `Service and utility files should be camelCase (formatDate.js) or PascalCase for classes`,
          fix: `Rename to ${toCamelCase(baseName)}${ext}`,
          confidence: "confirmed",
          effort: "trivial",
        });
      }
    }
  }
}

function checkCssNaming(dir, cssFileName, relPath, findings) {
  const cssBase = path.basename(cssFileName, ".css");

  // Look for a matching JS/TS file in the same directory
  let hasMatch = false;
  for (const ext of CODE_EXTENSIONS) {
    if (fs.existsSync(path.join(dir, cssBase + ext))) {
      hasMatch = true;
      break;
    }
  }

  // If in a component folder and no matching JS file, check for any JS file
  if (!hasMatch) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }

    const jsFiles = entries.filter((e) => {
      const ext = path.extname(e);
      return CODE_EXTENSIONS.has(ext) && path.basename(e, ext) !== "index";
    });

    if (jsFiles.length === 1) {
      const jsBase = path.basename(jsFiles[0], path.extname(jsFiles[0]));
      if (jsBase !== cssBase) {
        findings.push({
          id: "",
          phase: "auto",
          severity: "S4-COSMETIC",
          category: "naming",
          file: relPath,
          evidence: `CSS file "${cssFileName}" does not match component file "${jsFiles[0]}"`,
          explanation: `Component CSS should match its component's name for co-location clarity`,
          fix: `Rename to ${jsBase}.css`,
          confidence: "confirmed",
          effort: "trivial",
        });
      }
    }
  }
}

function toPascalCase(str) {
  return str
    .replace(/[-_]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function toCamelCase(str) {
  return str
    .replace(/[-_]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

main();
