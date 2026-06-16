#!/usr/bin/env node

/**
 * check-structure-shape.js — Folder structure pattern detection
 *
 * Checks the directory tree itself for organizational patterns that
 * indicate structural problems. Does not read file contents.
 *
 * Usage: node check-structure-shape.js <target_dir>
 * Output: JSON findings array
 */

const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "coverage", "__tests__", "__mocks__", ".cache",
]);

const CODE_EXTENSIONS = new Set([".js", ".mjs", ".jsx", ".ts", ".tsx"]);

// Type-based folder names that indicate wrong organization
const TYPE_BASED_FOLDERS = new Set(["js", "css", "html", "scripts", "stylesheets", "templates"]);

// Config files expected at project root (not orphans)
const ROOT_CONFIG_PATTERNS = [
  /^\./, /^package\.json$/, /^tsconfig/, /^vite\.config/, /^webpack\.config/,
  /^next\.config/, /^nuxt\.config/, /^babel\.config/, /^jest\.config/,
  /^eslint/, /^prettier/, /^README/i, /^LICENSE/i, /^CHANGELOG/i,
  /^Makefile$/, /^Dockerfile$/, /^docker-compose/, /^\.env/,
  /^ARCHITECTURE/i, /^CLAUDE/i, /^MODULE/i,
];

function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node check-structure-shape.js <target_dir>");
    process.exit(1);
  }

  const findings = [];
  const totalFiles = countFiles(targetDir);

  checkTypeBased(targetDir, targetDir, totalFiles, findings);
  checkOrphanedRootFiles(targetDir, findings);
  checkMissingCoLocation(targetDir, targetDir, findings);
  checkEmptyFolders(targetDir, targetDir, findings);
  checkDepth(targetDir, targetDir, 0, findings);

  console.log(JSON.stringify({ findings }));
}

/**
 * Check for type-based top-level folders (src/js/, src/css/, src/html/)
 */
function checkTypeBased(dir, targetDir, totalFiles, findings) {
  // Check in both the target dir and src/ subdirectory
  const dirsToCheck = [dir];
  const srcDir = path.join(dir, "src");
  if (fs.existsSync(srcDir)) dirsToCheck.push(srcDir);

  for (const checkDir of dirsToCheck) {
    let entries;
    try {
      entries = fs.readdirSync(checkDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORE_DIRS.has(entry.name)) continue;

      if (TYPE_BASED_FOLDERS.has(entry.name.toLowerCase())) {
        const rel = path.relative(targetDir, path.join(checkDir, entry.name));
        const severity = totalFiles > 15 ? "S2-HINDERING" : "S3-DRIFTING";

        findings.push({
          id: "",
          phase: "auto",
          severity: severity,
          category: "sprawl",
          file: rel + "/",
          evidence: `Type-based folder "${entry.name}/" at ${rel}`,
          explanation: `Organizing by file type (${entry.name}/) does not scale. Files related to one feature are scattered across multiple folders. Organize by responsibility instead.`,
          fix: `Restructure into responsibility-based folders: components/, services/, utils/. Each component's JS, CSS, and tests live together.`,
          confidence: "confirmed",
          effort: totalFiles > 30 ? "large" : "medium",
        });
      }
    }
  }
}

/**
 * Check for code files at src/ root that likely belong in a subfolder
 */
function checkOrphanedRootFiles(targetDir, findings) {
  const srcDir = path.join(targetDir, "src");
  const checkDir = fs.existsSync(srcDir) ? srcDir : targetDir;

  let entries;
  try {
    entries = fs.readdirSync(checkDir, { withFileTypes: true });
  } catch {
    return;
  }

  // Only flag if there are also subdirectories (meaning structure exists but file is loose)
  const hasSubdirs = entries.some(
    (e) => e.isDirectory() && !IGNORE_DIRS.has(e.name) && !e.name.startsWith(".")
  );
  if (!hasSubdirs) return;

  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const ext = path.extname(entry.name);
    if (!CODE_EXTENSIONS.has(ext)) continue;

    // Skip known root files
    if (ROOT_CONFIG_PATTERNS.some((p) => p.test(entry.name))) continue;

    // Skip entry points
    if (["index", "main", "app", "App"].includes(path.basename(entry.name, ext))) continue;

    const rel = path.relative(targetDir, path.join(checkDir, entry.name));

    findings.push({
      id: "",
      phase: "auto",
      severity: "S3-DRIFTING",
      category: "sprawl",
      file: rel,
      evidence: `Code file "${entry.name}" at directory root alongside organized subdirectories`,
      explanation: `This file sits at the root level while other code is organized into folders. It likely belongs in one of the existing subdirectories.`,
      fix: `Determine this file's responsibility and move it to the appropriate layer folder (components/, utils/, services/)`,
      confidence: "candidate",
      effort: "trivial",
    });
  }
}

/**
 * Check component folders for missing co-located CSS
 */
function checkMissingCoLocation(dir, targetDir, findings) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const rel = path.relative(targetDir, dir);
  const isComponentDir = rel.split(path.sep).some((p) => p.toLowerCase() === "components");

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;

    const subDir = path.join(dir, entry.name);

    // If we're inside components/ and this is a component folder, check co-location
    if (isComponentDir) {
      checkComponentFolder(subDir, targetDir, entry.name, findings);
    }

    // Recurse
    checkMissingCoLocation(subDir, targetDir, findings);
  }
}

function checkComponentFolder(componentDir, targetDir, componentName, findings) {
  let entries;
  try {
    entries = fs.readdirSync(componentDir);
  } catch {
    return;
  }

  const hasJS = entries.some((e) => {
    const ext = path.extname(e);
    return CODE_EXTENSIONS.has(ext) && path.basename(e, ext) !== "index";
  });

  const hasCSS = entries.some((e) => path.extname(e) === ".css");

  // Only flag if there's a JS file but no CSS — suggests styles might be elsewhere
  // Don't flag if the component is purely logic (no rendering)
  if (hasJS && !hasCSS) {
    const rel = path.relative(targetDir, componentDir);

    findings.push({
      id: "",
      phase: "auto",
      severity: "S4-COSMETIC",
      category: "sprawl",
      file: rel + "/",
      evidence: `Component folder "${componentName}" has JS but no co-located CSS file`,
      explanation: `Component folders should contain all related files — JS, CSS, and tests. Missing CSS may mean styles are in a global stylesheet.`,
      fix: `If this component has styles, create ${componentName}.css in this folder. If it's purely logic, no action needed.`,
      confidence: "candidate",
      effort: "trivial",
    });
  }
}

/**
 * Check for empty folders (structural ghosts)
 */
function checkEmptyFolders(dir, targetDir, findings) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;

    const subDir = path.join(dir, entry.name);
    let subEntries;
    try {
      subEntries = fs.readdirSync(subDir);
    } catch {
      continue;
    }

    // Filter out hidden files
    const visibleEntries = subEntries.filter((e) => !e.startsWith("."));

    if (visibleEntries.length === 0) {
      const rel = path.relative(targetDir, subDir);
      findings.push({
        id: "",
        phase: "auto",
        severity: "S4-COSMETIC",
        category: "sprawl",
        file: rel + "/",
        evidence: `Empty folder "${entry.name}/"`,
        explanation: `Empty folders are structural ghosts — they suggest something was removed or planned but never built`,
        fix: `Remove the folder, or add the files it was meant to contain`,
        confidence: "confirmed",
        effort: "trivial",
      });
    }

    checkEmptyFolders(subDir, targetDir, findings);
  }
}

/**
 * Check for excessive nesting depth (>4 levels inside src/)
 */
function checkDepth(dir, targetDir, currentDepth, findings) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;

    const subDir = path.join(dir, entry.name);
    const depth = currentDepth + 1;

    if (depth > 4) {
      const rel = path.relative(targetDir, subDir);
      findings.push({
        id: "",
        phase: "auto",
        severity: "S3-DRIFTING",
        category: "sprawl",
        file: rel + "/",
        evidence: `Folder nested ${depth} levels deep`,
        explanation: `Deeply nested folders make navigation harder. Most web projects should stay within 3-4 levels of nesting.`,
        fix: `Flatten the structure — the deepest files should be reachable in 3-4 clicks from src/`,
        confidence: "confirmed",
        effort: "medium",
      });
    }

    checkDepth(subDir, targetDir, depth, findings);
  }
}

function countFiles(dir) {
  let count = 0;

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
      } else if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
        count++;
      }
    }
  }

  walk(dir);
  return count;
}

main();
