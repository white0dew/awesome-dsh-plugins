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

const VALID_CATEGORY_IDS = new Set([
  ...SECTION_TO_CATEGORY.values(),
  ...EMOJI_HEADING_TO_CATEGORY.values(),
]);
const REPOSITORY_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
const GENERIC_DESCRIPTION_PATTERNS = [
  /^(?:a )?(?:deepseek harness|dsh) (?:plugin|extension)[.!。]?$/i,
  /^(?:dsh[- ]?plugin|plugin)[.!。]?$/i,
  /^(?:no description(?: available)?|暂无描述)[.!。]?$/i,
];

function fail(message) {
  throw new Error(`sync-upstreams: ${message}`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRepository(value) {
  return typeof value === "string" && REPOSITORY_PATTERN.test(value);
}

function fallbackDescription(repository) {
  return `A DSH plugin from ${repository}`;
}

function descriptionStrength(description, repository) {
  const normalized = cleanDescription(description);
  if (!normalized || normalized === fallbackDescription(repository)) {
    return 0;
  }
  if (GENERIC_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 0;
  }

  const contentLength = normalized.replace(/[^\p{L}\p{N}]/gu, "").length;
  return contentLength >= 16 ? contentLength : 0;
}

function isStrongerDescription(existingDescription, incomingDescription, repository) {
  return descriptionStrength(incomingDescription, repository) > descriptionStrength(existingDescription, repository);
}

function isStrongerCategory(existingCategory, incomingCategory, incomingCategoryIsExplicit) {
  return incomingCategoryIsExplicit
    && VALID_CATEGORY_IDS.has(incomingCategory)
    && existingCategory === "tools-capabilities"
    && incomingCategory !== "tools-capabilities";
}

function updateExistingRecord(existing, incoming) {
  const description = isStrongerDescription(existing.description, incoming.description, existing.repository)
    ? cleanDescription(incoming.description)
    : existing.description;
  const category = isStrongerCategory(existing.category, incoming.category, incoming.categoryIsExplicit)
    ? incoming.category
    : existing.category;

  return {
    record: {
      ...existing,
      description,
      category,
    },
    updated: description !== existing.description || category !== existing.category,
  };
}

function validateExistingSnapshot(snapshot) {
  if (!isRecord(snapshot)) {
    fail("upstream snapshot must be a JSON object");
  }
  if (typeof snapshot.name !== "string" || !snapshot.name.trim()) {
    fail("upstream snapshot is missing a name");
  }
  if (snapshot.repository !== UPSTREAM_REPOSITORY || snapshot.url !== UPSTREAM_URL_META) {
    fail("upstream snapshot has unexpected repository metadata");
  }
  if (typeof snapshot.snapshotGeneratedAt !== "string" || !snapshot.snapshotGeneratedAt.trim()) {
    fail("upstream snapshot is missing snapshotGeneratedAt");
  }
  if (!Array.isArray(snapshot.records)) {
    fail("upstream snapshot must contain a records array");
  }

  const seenRepositories = new Set();
  snapshot.records.forEach((record, index) => {
    if (!isRecord(record)) {
      fail(`upstream snapshot record ${index + 1} must be an object`);
    }
    if (!isRepository(record.repository) || record.url !== `https://github.com/${record.repository}`) {
      fail(`upstream snapshot record ${index + 1} has invalid repository metadata`);
    }
    if (typeof record.description !== "string" || !record.description.trim()) {
      fail(`upstream snapshot record ${index + 1} is missing a description`);
    }
    if (typeof record.category !== "string" || !VALID_CATEGORY_IDS.has(record.category)) {
      fail(`upstream snapshot record ${index + 1} has an invalid category`);
    }
    if (!Number.isInteger(record.stars) || record.stars < 0) {
      fail(`upstream snapshot record ${index + 1} has an invalid star count`);
    }

    const key = record.repository.toLowerCase();
    if (seenRepositories.has(key)) {
      fail(`upstream snapshot contains duplicate repository ${record.repository}`);
    }
    seenRepositories.add(key);
  });
}

async function readJson(filePath, label) {
  let source;
  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    fail(`could not read ${label}: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  try {
    return { source, value: JSON.parse(source) };
  } catch (error) {
    fail(`could not parse ${label}: ${error instanceof Error ? error.message : "invalid JSON"}`);
  }
}

async function readExistingSnapshot() {
  let source;
  try {
    source = await readFile(UPSTREAM_SNAPSHOT_PATH, "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") {
      return { source: null, snapshot: null };
    }
    fail(`could not read upstream snapshot: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  let snapshot;
  try {
    snapshot = JSON.parse(source);
  } catch (error) {
    fail(`could not parse upstream snapshot: ${error instanceof Error ? error.message : "invalid JSON"}`);
  }
  validateExistingSnapshot(snapshot);
  return { source, snapshot };
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
  if (typeof markdown !== "string") {
    fail("upstream CATALOG.md must be text");
  }

  const lines = markdown.split(/\r?\n/);
  const entries = [];
  let currentCategory = "tools-capabilities";
  let currentCategoryIsExplicit = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^#{1,6}\s/.test(line)) {
      inTable = false;
      let matched = false;
      for (const [prefix, category] of EMOJI_HEADING_TO_CATEGORY) {
        if (line.includes(prefix)) {
          currentCategory = category;
          currentCategoryIsExplicit = true;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const normalized = normalizeHeading(line);
        if (SECTION_TO_CATEGORY.has(normalized)) {
          currentCategory = SECTION_TO_CATEGORY.get(normalized);
          currentCategoryIsExplicit = true;
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
            description,
            category: currentCategory,
            categoryIsExplicit: currentCategoryIsExplicit,
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

  const { value: firstSource } = await readJson(FIRST_SOURCE_PATH, "awesome-dsh-plugin.json");
  if (Array.isArray(firstSource.plugins)) {
    for (const record of firstSource.plugins) {
      if (record.owner && record.name) {
        excluded.add(`${record.owner}/${record.name}`.toLowerCase());
      }
    }
  }

  const { value: secondSource } = await readJson(SECOND_SOURCE_PATH, "github-plugin-catalog.json");
  if (Array.isArray(secondSource.plugins)) {
    for (const record of secondSource.plugins) {
      if (record.fullName) {
        excluded.add(record.fullName.toLowerCase());
      }
    }
  }

  const { value: reviewedSource } = await readJson(REVIEWED_PATH, "reviewed-catalog-additions.json");
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

  // Read and validate all source JSON before the only source-file write below.
  const { snapshot: existingSnapshot, source: existingSource } = await readExistingSnapshot();

  // Start from the existing snapshot so upstream removal never removes a record.
  const existingByKey = new Map();
  if (existingSnapshot) {
    for (const record of existingSnapshot.records) {
      existingByKey.set(record.repository.toLowerCase(), record);
    }
  }
  const mergedByKey = new Map(existingByKey);

  let newCount = 0;
  let updatedCount = 0;
  let retainedCount = 0;
  let unchangedCount = 0;
  let excludedCount = 0;

  // Merge valid, non-manual upstream entries into the retained snapshot.
  const seenKeys = new Set();
  const matchedExistingKeys = new Set();

  for (const entry of parsedEntries) {
    const key = entry.repository.toLowerCase();

    // Skip duplicates within the parsed entries.
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    // Skip excluded repos from manually curated sources
    if (excludedRepos.has(key)) {
      excludedCount++;
      continue;
    }

    const existing = existingByKey.get(key);
    if (existing) {
      const { record, updated } = updateExistingRecord(existing, entry);
      mergedByKey.set(key, record);
      matchedExistingKeys.add(key);
      if (updated) {
        updatedCount++;
      } else {
        unchangedCount++;
      }
    } else {
      mergedByKey.set(key, {
        repository: entry.repository,
        url: entry.url,
        description: entry.description || fallbackDescription(entry.repository),
        category: entry.category,
        stars: 0,
      });
      newCount++;
    }
  }

  retainedCount = existingByKey.size - matchedExistingKeys.size;
  const mergedRecords = [...mergedByKey.values()];

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
  console.log(`  updated:    ${updatedCount} existing records with stronger upstream metadata`);
  console.log(`  retained:   ${retainedCount} existing records kept without an eligible upstream update`);
  console.log("  removed:    0 records (merge-only policy)");
  console.log(`  unchanged:  ${unchangedCount} matching existing records`);
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
