#!/usr/bin/env node

/**
 * audit-imports.js — Layer violation detection
 *
 * Parses import/require statements, assigns each file to a layer
 * based on its folder, and flags any import that flows upward.
 *
 * Usage: node audit-imports.js <target_dir>
 * Output: JSON findings array
 */

const fs = require("fs");
const path = require("path");

// Layer hierarchy (lower number = lower layer, cannot import from higher)
const LAYER_RANK = {
  constants: 0,
  tokens: 0,
  styles: 0,
  types: 0,
  utils: 1,
  lib: 1,
  shared: 1,
  services: 2,
  store: 2,
  components: 3,
  layouts: 3,
  pages: 4,
  routes: 4,
};

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "coverage", "__tests__", "__mocks__", ".cache",
]);

const CODE_EXTENSIONS = new Set([".js", ".mjs", ".jsx", ".ts", ".tsx"]);

function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node audit-imports.js <target_dir>");
    process.exit(1);
  }

  const files = collectFiles(targetDir);
  const findings = [];

  for (const filePath of files) {
    const content = readFileSafe(filePath);
    if (!content) continue;

    const imports = extractImports(content);
    const sourceLayer = getLayer(filePath, targetDir);

    for (const imp of imports) {
      // Skip external packages
      if (isExternalImport(imp.path)) continue;

      // Resolve the import to an absolute-ish path
      const resolvedImport = resolveImportPath(filePath, imp.path, targetDir);
      if (!resolvedImport) continue;

      const targetLayer = getLayer(resolvedImport, targetDir);

      // Check upward import
      if (sourceLayer !== null && targetLayer !== null) {
        if (LAYER_RANK[sourceLayer] < LAYER_RANK[targetLayer]) {
          findings.push({
            id: "",
            phase: "auto",
            severity: "S1-BLOCKING",
            category: "layer-violation",
            file: path.relative(targetDir, filePath),
            evidence: `Line ${imp.line}: ${imp.raw.trim()}`,
            explanation: `${sourceLayer}/ file imports from ${targetLayer}/ — lower layer reaching up`,
            fix: `Move the shared logic to ${sourceLayer}/ or a lower layer that both files can import from`,
            confidence: "confirmed",
            effort: estimateEffort(filePath, targetDir),
          });
        }
      }

      // Check sibling component imports
      if (sourceLayer === "components" && targetLayer === "components") {
        const sourceComponent = getComponentFolder(filePath, targetDir);
        const targetComponent = getComponentFolder(resolvedImport, targetDir);

        if (
          sourceComponent &&
          targetComponent &&
          sourceComponent !== targetComponent
        ) {
          findings.push({
            id: "",
            phase: "auto",
            severity: "S1-BLOCKING",
            category: "coupling",
            file: path.relative(targetDir, filePath),
            evidence: `Line ${imp.line}: ${imp.raw.trim()}`,
            explanation: `Component ${sourceComponent} imports from sibling component ${targetComponent} — coupling violation`,
            fix: `Extract the shared dependency to utils/ or a shared component that both can import`,
            confidence: "confirmed",
            effort: "medium",
          });
        }
      }
    }
  }

  // Check for circular imports
  const importGraph = buildImportGraph(files, targetDir);
  const cycles = findCycles(importGraph);
  for (const cycle of cycles) {
    findings.push({
      id: "",
      phase: "auto",
      severity: "S1-BLOCKING",
      category: "layer-violation",
      file: cycle[0],
      evidence: `Circular chain: ${cycle.join(" → ")}`,
      explanation: "Circular import dependency — these files cannot be loaded in a valid order",
      fix: "Break the cycle by extracting shared logic to a lower-layer file that both can import",
      confidence: "confirmed",
      effort: "medium",
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
      } else if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
        results.push(fullPath);
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

function extractImports(content) {
  const imports = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ES module imports: import X from '...' or import '...'
    const esMatch = line.match(
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/
    );
    if (esMatch) {
      imports.push({ path: esMatch[1], line: i + 1, raw: line });
      continue;
    }

    // Dynamic imports: import('...')
    const dynamicMatch = line.match(/import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/);
    if (dynamicMatch) {
      imports.push({ path: dynamicMatch[1], line: i + 1, raw: line });
      continue;
    }

    // CommonJS: require('...')
    const cjsMatch = line.match(/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/);
    if (cjsMatch) {
      imports.push({ path: cjsMatch[1], line: i + 1, raw: line });
    }
  }

  return imports;
}

function isExternalImport(importPath) {
  return !importPath.startsWith("./") && !importPath.startsWith("../");
}

function resolveImportPath(sourceFile, importPath, targetDir) {
  const sourceDir = path.dirname(sourceFile);
  let resolved = path.resolve(sourceDir, importPath);

  // Try with extensions
  for (const ext of CODE_EXTENSIONS) {
    if (fs.existsSync(resolved + ext)) return resolved + ext;
  }
  // Try as directory with index
  for (const ext of CODE_EXTENSIONS) {
    const indexPath = path.join(resolved, "index" + ext);
    if (fs.existsSync(indexPath)) return indexPath;
  }
  // Already has extension
  if (fs.existsSync(resolved)) return resolved;

  return null;
}

function getLayer(filePath, targetDir) {
  const rel = path.relative(targetDir, filePath);
  const parts = rel.split(path.sep);

  // Check if any part of the path matches a known layer
  // Start from the deepest src-adjacent folder
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (LAYER_RANK[lower] !== undefined) return lower;
  }
  return null;
}

function getComponentFolder(filePath, targetDir) {
  const rel = path.relative(targetDir, filePath);
  const parts = rel.split(path.sep);
  const compIdx = parts.findIndex((p) => p.toLowerCase() === "components");
  if (compIdx >= 0 && compIdx + 1 < parts.length) {
    return parts[compIdx + 1];
  }
  return null;
}

function estimateEffort(filePath, targetDir) {
  // Check how many files import from this file
  const files = collectFiles(targetDir);
  let importers = 0;
  const rel = path.relative(targetDir, filePath);

  for (const f of files) {
    if (f === filePath) continue;
    const content = readFileSafe(f);
    if (!content) continue;
    // Rough check: does the file reference this path?
    const basename = path.basename(filePath, path.extname(filePath));
    if (content.includes(basename)) importers++;
  }

  if (importers <= 1) return "small";
  if (importers <= 4) return "medium";
  return "large";
}

function buildImportGraph(files, targetDir) {
  const graph = new Map();

  for (const filePath of files) {
    const rel = path.relative(targetDir, filePath);
    const content = readFileSafe(filePath);
    if (!content) continue;

    const imports = extractImports(content);
    const targets = [];

    for (const imp of imports) {
      if (isExternalImport(imp.path)) continue;
      const resolved = resolveImportPath(filePath, imp.path, targetDir);
      if (resolved) targets.push(path.relative(targetDir, resolved));
    }

    graph.set(rel, targets);
  }

  return graph;
}

function findCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const inStack = new Set();

  function dfs(node, pathSoFar) {
    if (inStack.has(node)) {
      // Found a cycle — extract it
      const cycleStart = pathSoFar.indexOf(node);
      if (cycleStart >= 0) {
        const cycle = pathSoFar.slice(cycleStart);
        cycle.push(node);
        // Only report if not already found (check by sorted members)
        const key = [...cycle].sort().join("|");
        if (!visited.has(key)) {
          visited.add(key);
          cycles.push(cycle);
        }
      }
      return;
    }
    if (visited.has(node)) return;

    inStack.add(node);
    pathSoFar.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, [...pathSoFar]);
    }

    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node, []);
  }

  return cycles;
}

main();
