#!/usr/bin/env node

/**
 * run-audit.js — Orchestrator for html-architect Auto phase
 *
 * Runs all structural audit scripts against a target directory
 * and combines their output into a single findings list.
 *
 * Usage: node run-audit.js <target_dir> [check1,check2,...]
 *
 * Examples:
 *   node run-audit.js ./src                    # run all checks
 *   node run-audit.js ./src imports,naming     # run specific checks
 */

const { execSync } = require("child_process");
const path = require("path");

const SCRIPTS_DIR = __dirname;

const CHECKS = {
  imports: "audit-imports.js",
  "fetch-in-components": "check-fetch-in-components.js",
  naming: "check-naming.js",
  filesize: "check-file-size.js",
  duplicates: "check-duplicate-constants.js",
  structure: "check-structure-shape.js",
};

// Execution order matters — most critical first
const EXECUTION_ORDER = [
  "imports",
  "fetch-in-components",
  "naming",
  "filesize",
  "duplicates",
  "structure",
];

function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node run-audit.js <target_dir> [check1,check2,...]");
    process.exit(1);
  }

  const resolvedDir = path.resolve(targetDir);
  const requestedChecks = process.argv[3]
    ? process.argv[3].split(",").map((c) => c.trim())
    : EXECUTION_ORDER;

  // Validate requested checks
  for (const check of requestedChecks) {
    if (!CHECKS[check]) {
      console.error(`Unknown check: "${check}". Available: ${Object.keys(CHECKS).join(", ")}`);
      process.exit(1);
    }
  }

  const allFindings = [];
  const scriptsRun = [];
  const scriptsClean = [];
  const errors = [];
  let findingCounter = 1;

  for (const check of EXECUTION_ORDER) {
    if (!requestedChecks.includes(check)) continue;

    const scriptPath = path.join(SCRIPTS_DIR, CHECKS[check]);

    try {
      const output = execSync(`node "${scriptPath}" "${resolvedDir}"`, {
        encoding: "utf-8",
        timeout: 30000,
      });

      const result = JSON.parse(output);

      if (result.findings && result.findings.length > 0) {
        // Assign sequential IDs
        for (const finding of result.findings) {
          finding.id = `AUTO-${String(findingCounter).padStart(3, "0")}`;
          findingCounter++;
        }
        allFindings.push(...result.findings);
        scriptsRun.push(check);
      } else {
        scriptsClean.push(check);
        scriptsRun.push(check);
      }
    } catch (err) {
      // Script failed — report but continue
      errors.push({
        script: check,
        error: err.stderr || err.message,
      });
    }
  }

  // Deduplicate: same file + same category = keep only the higher severity
  const deduped = deduplicateFindings(allFindings);

  const severityCounts = { S1: 0, S2: 0, S3: 0, S4: 0 };
  for (const f of deduped) {
    const tier = f.severity.split("-")[0];
    if (severityCounts[tier] !== undefined) severityCounts[tier]++;
  }

  const output = {
    findings: deduped,
    summary: {
      total: deduped.length,
      by_severity: severityCounts,
      scripts_run: scriptsRun,
      scripts_clean: scriptsClean,
      errors: errors,
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

function deduplicateFindings(findings) {
  const seen = new Map();
  const SEVERITY_RANK = { S1: 0, S2: 1, S3: 2, S4: 3 };

  for (const f of findings) {
    const key = `${f.file}::${f.category}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, f);
    } else {
      // Keep the higher severity finding
      const existingRank = SEVERITY_RANK[existing.severity.split("-")[0]] ?? 99;
      const newRank = SEVERITY_RANK[f.severity.split("-")[0]] ?? 99;
      if (newRank < existingRank) {
        seen.set(key, f);
      }
    }
  }

  return Array.from(seen.values());
}

main();
