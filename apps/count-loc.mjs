#!/usr/bin/env node
/**
 * Count lines of code per project (.NET / Next.js)
 * Usage: node count-loc.mjs [project_path ...]
 * If no arguments, scans all subdirectories.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname, relative, basename } from "path";

// ── Config ─────────────────────────────────────────────
const NEXTJS_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const NEXTJS_SKIP = new Set(["node_modules", ".next", "dist", "build", ".git"]);

const DOTNET_EXTS = new Set([".cs", ".csproj", ".sln"]);
const DOTNET_SKIP = new Set(["bin", "obj", "Migrations", ".git", ".vs", ".idea"]);

const TREE_DEPTH = 3;

// ── Helpers ────────────────────────────────────────────
function detectType(dir) {
  try {
    const pkg = join(dir, "package.json");
    const stat = statSync(pkg, { throwIfNoEntry: false });
    if (stat?.isFile()) {
      const content = readFileSync(pkg, "utf-8");
      if (content.includes("next")) return "nextjs";
    }
  } catch {}
  try {
    if (findFileRecursive(dir, (f) => f.endsWith(".csproj") || f.endsWith(".sln"), 2)) {
      return "dotnet";
    }
  } catch {}
  return null;
}

function findFileRecursive(dir, predicate, maxDepth, depth = 0) {
  if (depth > maxDepth) return false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && predicate(entry.name)) return true;
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      if (findFileRecursive(join(dir, entry.name), predicate, maxDepth, depth + 1)) return true;
    }
  }
  return false;
}

function countLines(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    if (content.length === 0) return 0;
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

function walkProject(projectDir, type) {
  const exts = type === "nextjs" ? NEXTJS_EXTS : DOTNET_EXTS;
  const skip = type === "nextjs" ? NEXTJS_SKIP : DOTNET_SKIP;

  /** @type {Map<string, number>} relative dir -> total lines */
  const dirLines = new Map();
  /** @type {Map<string, {files: number, lines: number}>} */
  const extStats = new Map();

  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) walk(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (!exts.has(ext)) continue;
        const lines = countLines(fullPath);
        const rel = relative(projectDir, dir);

        // Attribute to every ancestor level
        const parts = rel ? rel.replace(/\\/g, "/").split("/") : [];
        // Root-level files
        dirLines.set("", (dirLines.get("") || 0) + lines);
        // Each ancestor prefix
        for (let i = 1; i <= parts.length; i++) {
          const key = parts.slice(0, i).join("/");
          dirLines.set(key, (dirLines.get(key) || 0) + lines);
        }

        const st = extStats.get(ext) || { files: 0, lines: 0 };
        st.files++;
        st.lines += lines;
        extStats.set(ext, st);
      }
    }
  }

  walk(projectDir);
  return { dirLines, extStats };
}

function bar(val, max, width = 30) {
  if (max === 0) return "";
  const filled = Math.max(val > 0 ? 1 : 0, Math.round((val / max) * width));
  return "█".repeat(filled);
}

function printTree(dirLines, maxDepth = TREE_DEPTH) {
  // Build tree nodes grouped by depth
  /** @type {Map<string, {name: string, path: string, count: number, parentKey: string}[]>} */
  const byParent = new Map();

  for (const [key, count] of dirLines) {
    if (!key) continue; // skip root
    const parts = key.split("/");
    if (parts.length > maxDepth) continue;
    const parentKey = parts.slice(0, -1).join("/");
    const group = byParent.get(parentKey) || [];
    group.push({ name: parts[parts.length - 1], path: key, count });
    byParent.set(parentKey, group);
  }

  function printLevel(parentKey, depth) {
    const children = byParent.get(parentKey);
    if (!children) return;
    children.sort((a, b) => b.count - a.count);
    const maxCount = children[0].count;

    for (const child of children) {
      const indent = "  ".repeat(depth);
      const visual = bar(child.count, maxCount);
      const display = `${child.path}/`;
      console.log(`    ${indent}${display.padEnd(35)} ${String(child.count).padStart(6)}  ${visual}`);
      printLevel(child.path, depth + 1);
    }
  }

  printLevel("", 0);
}

function printProject(projectDir, type) {
  const label = type === "nextjs" ? "Next.js" : ".NET";
  const name = basename(projectDir);
  const { dirLines, extStats } = walkProject(projectDir, type);
  const total = dirLines.get("") || 0;

  console.log("──────────────────────────────────────────────────────────────────");
  console.log(`  ${name.padEnd(20)} (${label})    ${total} lines`);
  console.log("──────────────────────────────────────────────────────────────────");

  const sortedExts = [...extStats.entries()].sort((a, b) => b[1].files - a[1].files);
  for (const [ext, st] of sortedExts) {
    console.log(`    ${ext.padEnd(10)} ${String(st.files).padStart(5)} files   ${String(st.lines).padStart(6)} lines`);
  }
  console.log();
  console.log("    Directory breakdown:");
  printTree(dirLines, TREE_DEPTH);
  console.log();
}

// ── Main ───────────────────────────────────────────────
const cwd = process.cwd();
let targets;

if (process.argv.length > 2) {
  targets = process.argv.slice(2).map((p) => (p.startsWith("/") || p.includes(":") ? p : join(cwd, p)));
} else {
  targets = readdirSync(cwd, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(cwd, d.name))
    .sort();
}

console.log();
console.log("  ╔══════════════════════════════════════╗");
console.log("  ║       Lines of Code Report           ║");
console.log("  ╚══════════════════════════════════════╝");
console.log();

for (const target of targets) {
  try { if (!statSync(target).isDirectory()) continue; } catch { continue; }

  const type = detectType(target);
  if (type) {
    printProject(target, type);
  }

  // Check subdirectories (e.g. funnel/mes-funnel)
  try {
    for (const sub of readdirSync(target, { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      const subPath = join(target, sub.name);
      const subType = detectType(subPath);
      if (subType) printProject(subPath, subType);
    }
  } catch {}
}
