import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(rootDirectory, "data", "sources");

const UPSTREAM_URL = "https://raw.githubusercontent.com/0xsline/awesome-deepseek-harness/main/CATALOG.md";
const UPSTREAM_SOURCE_NAME = "awesome-deepseek-harness upstream snapshot";
const UPSTREAM_REPOSITORY = "0xsline/awesome-deepseek-harness";
const UPSTREAM_URL_META = "https://github.com/0xsline/awesome-deepseek-harness";

const UPSTREAM_SNAPSHOT_PATH = path.join(sourceDirectory, "upstream-awesome-deepseek-harness.json");
const FIRST_SOURCE_PATH = path.join(sourceDirectory, "awesome-dsh-plugin.json");
const SECOND_SOURCE_PATH = path.join(sourceDirectory, "github-plugin-catalog.json");
const REVIEWED_PATH = path.join(sourceDirectory, "reviewed-catalog-additions.json");

// Map upstream section heading text (after emoji removal) to our category IDs.
const SECTION_TO_CATEGORY = new Map([
  // Emoji-prefixed sections from the curated hub part
  ["社区", "tools-capabilities"],
  ["技能", "mcp-skills"],
  ["单插件", "tools-capabilities"],
  ["插件集", "development-runtime"],
  ["远程渠道", "notifications-integrations"],
  ["基础设施", "development-runtime"],
  ["研究", "development-runtime"],
  ["未分类", "tools-capabilities"],

  // 公开插件 Topic subsections
  ["界面与体验", "ui-themes"],
  ["桌面客户端", "ui-themes"],
  ["终端与 TUI", "ui-themes"],
  ["输入与提示词", "tools-capabilities"],
  ["浏览器与远程", "browser-search"],
  ["记忆与上下文", "sessions-memory"],
  ["消息与通知", "notifications-integrations"],
  ["视觉与图像", "multimodal-vision"],
  ["模型与推理", "development-runtime"],
  ["成本与用量", "tools-capabilities"],
  ["数据与可视化", "tools-capabilities"],
  ["测试与诊断", "development-runtime"],
  ["安全与隐私", "development-runtime"],
  ["Agent 与自动化", "workflow-agents"],
  ["开发与工程", "development-runtime"],
  ["研究与知识", "development-runtime"],
  ["趣味与娱乐", "fun-experiments"],
  ["其他", "tools-capabilities"],

  // Sub-entries under 插件集
  ["toybox", "development-runtime"],
  ["dsh-github-integration", "development-runtime"],
  ["official-plugins-port", "development-runtime"],
  ["dsh-toolkit", "development-runtime"],
  ["dsh-harness-ops", "development-runtime"],
  ["dsh-edu", "development-runtime"],
]);

// Also match based on the raw heading text (including emoji) for the curated section headings
const EMOJI_HEADING_TO_CATEGORY = new Map([
  ["💬 社区", "tools-capabilities"],
  ["🎓 技能", "mcp-skills"],
  ["🔌 单插件", "tools-capabilities"],
  ["🧰 插件集", "development-runtime"],
  ["📡 远程渠道", "notifications-integrations"],
  ["🛠 基础设施", "development-runtime"],
  ["🔬 研究", "development-runtime"],
]);

function fail(message) {
  throw new Error(`sync-upstreams: ${message}`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalize a heading line by removing leading #, emoji, and whitespace.
 */
function normalizeHeading(text) {
  return text
    .replace(/^#+\s*/, "")
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/[（）()]\d*\)?\s*$/, "")
    .trim();
}

/**
 * Extract all GitHub owner/repo references from a markdown link.
 */
function extractGitHubRepos(text) {
  const repos = [];
  const linkPattern = /\[([^\]]*)\]\(https:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+)\)/g;
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    const owner = match[2];
    const name = match[3].replace(/[?#].*$/, "");
    if (owner && name && /^[a-zA-Z0-9._-]+$/.test(owner) && /^[a-zA-Z0-9._-]+$/.test(name)) {
      repos.push(`${owner}/${name}`);
    }
  }
  const barePattern = /https:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+)/g;
  while ((match = barePattern.exec(text)) !== null) {
    const owner = match[1];
    const name = match[2].replace(/[?#].*$/, "");
    if (owner && name && /^[a-zA-Z0-9._-]+$/.test(owner) && /^[a-zA-Z0-9._-]+$/.test(name)) {
      const repo = `${owner}/${name}`;
      if (!repos.includes(repo)) {
        repos.push(repo);
      }
    }
  }
  return repos;
}

/**
 * Clean a description from a table cell.
 */
function cleanDescription(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse the upstream CATALOG.md table format.
 */
function parseCatalog(markdown) {
  const lines = markdown.split(/\r?\n/);
  const entries = [];
  let currentCategory = "tools-capabilities";
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^#{1,6}\s/.test(line)) {
      inTable = false;
      let matched = false;
      for (const [prefix, category] of EMOJI_HEADING_TO_CATEGORY) {
        if (line.includes(prefix)) {
          currentCategory = category;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const normalized = normalizeHeading(line);
        if (SECTION_TO_CATEGORY.has(normalized)) {
          currentCategory = SECTION_TO_CATEGORY.get(normalized);
        }
      }
      continue;
    }

    if (/^[\s|]*[-]+[\s|]*[-]+[\s|]*$/.test(line) && line.includes("|") && line.includes("-")) {
      inTable = true;
      continue;
    }

    if (inTable && line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);

      if (cells.length >= 2) {
        const repoCell = cells[0];
        const descCell = cells.slice(1).join(" ");

        const repos = extractGitHubRepos(repoCell);
        const description = cleanDescription(descCell);

        for (const repository of repos) {
          entries.push({
            repository,
            url: `https://github.com/${repository}`,
            description: description || `A DSH plugin from ${repository}`,
            category: currentCategory,
          });
        }
      }
    }
  }

  return entries;
}

/**
 * Build a set of lowercase repository keys from the manually sourced/reviewed
 * source files so the sync-upstreams script never duplicates them.
 */
async function buildExclusionSet() {
  const excluded = new Set();

  const firstSource = JSON.parse(await readFile(FIRST_SOURCE_PATH, "utf8"));
  if (Array.isArray(firstSource.plugins)) {
    for (const record of firstSource.plugins) {
      if (record.owner && record.name) {
        excluded.add(`${record.owner}/${record.name}`.toLowerCase());
      }
    }
  }

  const secondSource = JSON.parse(await readFile(SECOND_SOURCE_PATH, "utf8"));
  if (Array.isArray(secondSource.plugins)) {
    for (const record of secondSource.plugins) {
      if (record.fullName) {
        excluded.add(record.fullName.toLowerCase());
      }
    }
  }

  const reviewedSource = JSON.parse(await readFile(REVIEWED_PATH, "utf8"));
  if (Array.isArray(reviewedSource.records)) {
    for (const record of reviewedSource.records) {
      if (record.github?.repository) {
        excluded.add(record.github.repository.toLowerCase());
      }
    }
  }

  return excluded;
}

async function main() {
  // Fetch the upstream CATALOG.md
  const response = await fetch(UPSTREAM_URL);
  if (!response.ok) {
    fail(`upstream CATALOG.md fetch failed with HTTP ${response.status} ${response.statusText}`);
  }
  const markdown = await response.text();
  if (!markdown || markdown.length < 100) {
    fail("upstream CATALOG.md returned empty or unreasonably short content");
  }

  // Parse the catalog
  const parsedEntries = parseCatalog(markdown);
  if (parsedEntries.length === 0) {
    fail("no valid GitHub repository entries found in upstream CATALOG.md");
  }

  // Build exclusion set from manually curated sources
  const excludedRepos = await buildExclusionSet();

  // Read existing snapshot
  let existingSnapshot;
  let existingSource;
  try {
    existingSource = await readFile(UPSTREAM_SNAPSHOT_PATH, "utf8");
    existingSnapshot = JSON.parse(existingSource);
  } catch {
    existingSnapshot = null;
    existingSource = null;
  }

  // Build lookup maps from existing snapshot
  const existingByKey = new Map();
  if (isRecord(existingSnapshot) && Array.isArray(existingSnapshot.records)) {
    for (const record of existingSnapshot.records) {
      if (record.repository) {
        existingByKey.set(record.repository.toLowerCase(), record);
      }
    }
  }

  // Record counts
  let newCount = 0;
  let unchangedCount = 0;
  let excludedCount = 0;

  // Merge: preserve existing records, add new ones
  const seenKeys = new Set();
  const mergedRecords = [];

  for (const entry of parsedEntries) {
    const key = entry.repository.toLowerCase();

    // Skip excluded repos from manually curated sources
    if (excludedRepos.has(key)) {
      excludedCount++;
      continue;
    }

    // Skip duplicates within the parsed entries
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    const existing = existingByKey.get(key);
    if (existing) {
      // Preserve existing record data entirely
      mergedRecords.push({
        repository: existing.repository,
        url: existing.url,
        description: existing.description,
        category: existing.category,
        stars: existing.stars,
      });
      existingByKey.delete(key);
      unchangedCount++;
    } else {
      // New record from upstream
      mergedRecords.push({
        repository: entry.repository,
        url: entry.url,
        description: entry.description,
        category: entry.category,
        stars: 0,
      });
      newCount++;
    }
  }

  // Records that were in the existing snapshot but not in the upstream catalog
  const removedCount = existingByKey.size;

  // Sort records deterministically by repository (lowercase)
  mergedRecords.sort((a, b) => {
    const aKey = a.repository.toLowerCase();
    const bKey = b.repository.toLowerCase();
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });

  // Build the new snapshot
  const newSnapshot = {
    name: UPSTREAM_SOURCE_NAME,
    repository: UPSTREAM_REPOSITORY,
    url: UPSTREAM_URL_META,
    snapshotGeneratedAt: existingSnapshot?.snapshotGeneratedAt || new Date().toISOString(),
    records: mergedRecords,
  };

  // Serialize with same style as existing
  const serialized = JSON.stringify(newSnapshot, null, 2) + "\n";

  // Compare with existing serialized content (ignoring snapshotGeneratedAt)
  const contentChanged = (() => {
    if (!existingSource) return true;
    const oldWithoutTimestamp = existingSource.replace(/"snapshotGeneratedAt"\s*:\s*"[^"]*"/, "");
    const newWithoutTimestamp = serialized.replace(/"snapshotGeneratedAt"\s*:\s*"[^"]*"/, "");
    return oldWithoutTimestamp !== newWithoutTimestamp;
  })();

  if (contentChanged) {
    newSnapshot.snapshotGeneratedAt = new Date().toISOString();
    const updatedSerialized = JSON.stringify(newSnapshot, null, 2) + "\n";
    await writeFile(UPSTREAM_SNAPSHOT_PATH, updatedSerialized, "utf8");
  }

  // Build discovered count (unique repos from upstream, before exclusion)
  const discoveredUnique = new Set();
  for (const entry of parsedEntries) {
    discoveredUnique.add(entry.repository.toLowerCase());
  }

  // Print summary
  console.log("sync-upstreams: summary");
  console.log(`  discovered: ${discoveredUnique.size} unique repos from upstream CATALOG.md`);
  console.log(`  new:        ${newCount} records added from upstream`);
  console.log(`  removed:    ${removedCount} records no longer in upstream catalog`);
  console.log(`  preserved:  ${unchangedCount} existing records preserved`);
  console.log(`  excluded:   ${excludedCount} repos filtered (already in manually curated sources)`);
  console.log(`  total:      ${mergedRecords.length} records in snapshot`);
  if (contentChanged) {
    console.log("  status:     snapshot updated on disk");
  } else {
    console.log("  status:     snapshot unchanged (no diff)");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "sync-upstreams: unexpected error");
  process.exit(1);
});