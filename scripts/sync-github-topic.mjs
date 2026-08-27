import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(rootDirectory, "data", "sources");

const TOPIC = "dsh-plugin";
const TOPIC_PAGE_URL = "https://github.com/topics/dsh-plugin";
// GitHub public Search API caps results per query at 1000. To cover the FULL
// topic (10k+ tags) we slice by `created:` date ranges and re-slice any
// oversized day by `stars:` buckets. Every slice must stay <= 1000 so a single
// search query (10 pages of 100) can enumerate it completely.
const PER_PAGE = 100;
const MAX_PAGES = 10;
const HARD_SLICE_CAP = 1000;

const TOPIC_SNAPSHOT_PATH = path.join(sourceDirectory, "github-topic-dsh-plugin.json");
const SECOND_SOURCE_PATH = path.join(sourceDirectory, "github-plugin-catalog.json");
const UPSTREAM_PATH = path.join(sourceDirectory, "upstream-awesome-deepseek-harness.json");
const FIRST_SOURCE_PATH = path.join(sourceDirectory, "awesome-dsh-plugin.json");
const REVIEWED_PATH = path.join(sourceDirectory, "reviewed-catalog-additions.json");

const GENERATE_PATH = path.join(rootDirectory, "scripts", "generate-content.mjs");
const VALIDATE_PATH = path.join(rootDirectory, "scripts", "validate-content.mjs");

// Repos that carry the topic but are NOT DSH plugins (agent meta-harness,
// general-purpose tools, etc.) — always recorded in `related`, never plugins.
const RELATED_ONLY = new Set([
  "ruvnet/ruflo",
  "molunerfinn/picgo",
  "nocobase/nocobase",
  "volcengine/ark-cli",
]);

function fail(message) {
  throw new Error(`sync-github-topic: ${message}`);
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(`could not read ${label} (${filePath}): ${error.message}`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Unauthenticated Search API is 10 req/min. Throttle every request so we never
// trip 403/429; if we still hit it, retry with backoff and ALWAYS throw on final
// failure — a fake zero here would silently drop repos from the snapshot.
async function throttledSearchJson(url, label, token) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "dsh-plugin-sync" };
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (!token) await sleep(6500);
    try {
      const response = await fetch(url, { headers });
      if (response.ok) return await response.json();
      if (response.status === 403 || response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after") || "0");
        await sleep(Math.max(retryAfter, 30) * 1000);
        continue;
      }
      throw new Error(`GitHub search ${label} failed: HTTP ${response.status}: ${await response.text().catch(() => "")}`);
    } catch (error) {
      if (attempt === 7) throw error;
      await sleep(1000 * attempt);
    }
  }
  throw new Error(`GitHub search ${label} exhausted retries`);
}

async function searchCount(query, token) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=1`;
  const body = await throttledSearchJson(url, "count", token);
  return body.total_count ?? 0;
}

async function searchPage(query, page, token) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${PER_PAGE}&page=${page}&sort=stars&order=desc`;
  const body = await throttledSearchJson(url, `page ${page}`, token);
  return body.items ?? [];
}

function addCalendarDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Split decision chain. Order tries to minimize query count while guaranteeing
// convergence for the pathological "single day, stars:0..0 > 1000" case:
//   1. multi-day created range  -> split by date midpoint
//   2. single day, no stars      -> bootstrap stars 0..99 / 100+
//   3. stars range              -> split by stars midpoint
//   4. stars pinned (0..0) still too big -> split pushed: date midpoint
//   5. pushed pinned            -> split by size: (KB) midpoint
//   6. size pinned              -> split by updated: date midpoint
// If every dimension is pinned at a single value and still > 1000, return null.
function splitDateRange(query, qualifier, start, end) {
  const spanDays = Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86400000);
  if (spanDays <= 0) return null;
  const mid = addCalendarDays(start, Math.floor(spanDays / 2));
  const pattern = new RegExp(`${qualifier}:\\d{4}-\\d{2}-\\d{2}\\.\\.\\d{4}-\\d{2}-\\d{2}`);
  const left = pattern.test(query) ? query.replace(pattern, `${qualifier}:${start}..${mid}`) : `${query} ${qualifier}:${start}..${mid}`;
  const right = pattern.test(query) ? query.replace(pattern, `${qualifier}:${addCalendarDays(mid, 1)}..${end}`) : `${query} ${qualifier}:${addCalendarDays(mid, 1)}..${end}`;
  return { left, right };
}

function splitNumericRange(query, qualifier, lo, hi) {
  const pattern = new RegExp(`${qualifier}:\\d+\\.\\.\\d+`);
  const mid = Math.floor((lo + hi) / 2);
  const left = pattern.test(query) ? query.replace(pattern, `${qualifier}:${lo}..${mid}`) : `${query} ${qualifier}:${lo}..${mid}`;
  const right = pattern.test(query) ? query.replace(pattern, `${qualifier}:${mid + 1}..${hi}`) : `${query} ${qualifier}:${mid + 1}..${hi}`;
  return { left, right };
}

function makeSplit(query) {
  const today = new Date().toISOString().slice(0, 10);
  const created = query.match(/created:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/);
  if (created) {
    const start = new Date(`${created[1]}T00:00:00Z`);
    const end = new Date(`${created[2]}T00:00:00Z`);
    const spanDays = Math.round((end - start) / 86400000);
    if (spanDays > 0) {
      return splitDateRange(query, "created", created[1], created[2]);
    }
  }
  const stars = query.match(/stars:(\d+)\.\.(\d+)/);
  if (created && !stars) {
    // Single day: bootstrap stars splitting.
    return splitNumericRange(query, "stars", 0, 99);
  }
  if (stars) {
    const lo = Number(stars[1]);
    const hi = Number(stars[2]);
    if (lo < hi) return splitNumericRange(query, "stars", lo, hi);
    if (!query.includes("pushed:")) {
      const day = created ? created[1] : today;
      return splitDateRange(query, "pushed", day, today);
    }
  }
  const pushed = query.match(/pushed:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/);
  if (pushed) {
    if (!query.includes("size:")) return splitNumericRange(query, "size", 0, 10000000);
    const size = query.match(/size:(\d+)\.\.(\d+)/);
    if (size && Number(size[1]) < Number(size[2])) return splitNumericRange(query, "size", Number(size[1]), Number(size[2]));
    if (!query.includes("forks:")) return splitNumericRange(query, "forks", 0, 100000);
    const forks = query.match(/forks:(\d+)\.\.(\d+)/);
    if (forks && Number(forks[1]) < Number(forks[2])) return splitNumericRange(query, "forks", Number(forks[1]), Number(forks[2]));
  }
  if (!query.includes("created:")) {
    const boundary = addCalendarDays(today, -90);
    return splitDateRange(query, "created", boundary, today);
  }
  return null; // pinned single values everywhere and still oversize — stop
}

async function collectSlice(query, collected, token, onProgress, depth) {
  if (depth > 16) throw new Error(`too deep slicing at query: ${query}`);
  const total = await searchCount(query, token);
  if (onProgress) onProgress({ query, total });
  if (total <= 0) return;

  if (total <= HARD_SLICE_CAP) {
    const pages = pageCountFor(total);
    for (let page = 1; page <= pages; page += 1) {
      const items = await searchPage(query, page, token);
      for (const repo of items) {
        if (!repo.full_name) continue;
        collected.set(repo.full_name.toLowerCase(), repo);
      }
      if (items.length < PER_PAGE) break;
    }
    return;
  }

  const split = makeSplit(query);
  if (!split) {
    throw new Error(`cannot split query further: ${query} (total=${total})`);
  }
  await collectSlice(split.left, collected, token, onProgress, depth + 1);
  await collectSlice(split.right, collected, token, onProgress, depth + 1);
}

const pageCountFor = (total) => Math.min(Math.max(1, Math.ceil(total / PER_PAGE)), MAX_PAGES);

async function collectFullTopic(token, onProgress) {
  const collected = new Map();
  await collectSlice(`topic:${TOPIC}`, collected, token, onProgress, 0);
  return [...collected.values()];
}

function looksLikeDshPlugin(record) {
  const text = `${record.description ?? ""} ${record.repository}`.toLowerCase();
  return ["dsh", "deepseek harness", "deepseek-harness", "dsh plugin", "dsh-", "for deepseek"].some(
    (keyword) => text.includes(keyword)
  );
}

function collectRepositories(snapshot, key) {
  const set = new Set();
  for (const record of snapshot.records ?? []) {
    let value = record[key];
    if (value && typeof value === "object") value = value.repository ?? value.repo;
    if (typeof value === "string" && value.includes("/")) set.add(value.toLowerCase());
  }
  return set;
}

function bumpHardcodedCounts(pluginCount) {
  const files = [GENERATE_PATH, VALIDATE_PATH];
  return Promise.all(
    files.map(async (filePath) => {
      const text = await readFile(filePath, "utf8");
      // `expected N second-source entries` is the second-source fail message in
      // generate-content.mjs — unique and stable, so prefer it when reading the CURRENT
      // hardcoded second-source count. Fall back to the LAST `plugins.length !== N`
      // occurrence (the second-source guard always appears after the first-source one),
      // then to pluginCount.
      const secondMatch = text.match(/expected (\d+) second-source entries/);
      const lastGuard = [...text.matchAll(/plugins\.length !== (\d+)/g)].pop();
      const current = secondMatch
        ? Number.parseInt(secondMatch[1], 10)
        : lastGuard
          ? Number.parseInt(lastGuard[1], 10)
          : pluginCount;
      const replacements = [
        [new RegExp(`\\bplugins\\.length !== ${current}\\b`), `plugins.length !== ${pluginCount}`],
        [new RegExp(`expected ${current} second-source entries`), `expected ${pluginCount} second-source entries`],
        [new RegExp(`secondInput\\.plugins\\.length !== ${current}`), `secondInput.plugins.length !== ${pluginCount}`],
        [new RegExp(`must contain exactly ${current} records`), `must contain exactly ${pluginCount} records`],
        [new RegExp(`secondSourceStars\\.size !== ${current}`), `secondSourceStars.size !== ${pluginCount}`],
        [new RegExp(`expected ${current} second-source star records`), `expected ${pluginCount} second-source star records`],
        [new RegExp(`(const expectedPluginCount = )\\d+( \\+ upstreamAwesomeDeepseekHarness(Snapshot|Input)\\.records\\.length)`), `$1${pluginCount + 32}$2`],
      ];
      let next = text;
      for (const [pattern, replacement] of replacements) {
        next = next.replace(pattern, replacement);
      }
      if (next !== text) {
        await writeFile(filePath, next, "utf8");
        return true;
      }
      return false;
    })
  );
}

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const catalog = await readJson(SECOND_SOURCE_PATH, "github-plugin-catalog.json");
  const upstream = await readJson(UPSTREAM_PATH, "upstream-awesome-deepseek-harness.json");
  const first = await readJson(FIRST_SOURCE_PATH, "awesome-dsh-plugin.json");
  const reviewed = await readJson(REVIEWED_PATH, "reviewed-catalog-additions.json");

  const known = new Set();
  for (const plugin of catalog.plugins ?? []) { if (plugin.fullName) known.add(plugin.fullName.toLowerCase()); }
  for (const related of catalog.related ?? []) { if (related.fullName) known.add(related.fullName.toLowerCase()); }
  for (const repo of collectRepositories(upstream, "repository")) known.add(repo);
  for (const plugin of first.plugins ?? []) { if (plugin.owner && plugin.name) known.add(`${plugin.owner}/${plugin.name}`.toLowerCase()); }
  for (const repo of collectRepositories(reviewed, "github")) known.add(repo);

  const started = Date.now();
  console.log(`collecting full topic:${TOPIC} (${token ? "with token" : "NO token — slow mode"})...`);
  const rawItems = await collectFullTopic(token, ({ query, total }) => {
    console.log(`  slice: ${query} -> ${total}`);
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`fetched ${rawItems.length} unique repos in ${elapsed}s`);

  const records = rawItems
    .map((repo) => ({
      repository: repo.full_name,
      url: repo.html_url,
      description: repo.description ?? "",
      stars: repo.stargazers_count ?? 0,
      pushedAt: repo.pushed_at ?? "",
      license: (repo.license && repo.license.spdx_id) ?? "",
      topics: repo.topics ?? [],
      archived: repo.archived ?? false,
    }))
    .filter((record) => record.repository && record.repository.includes("/"))
    .sort((left, right) => right.stars - left.stars || left.repository.localeCompare(right.repository));

  const snapshot = {
    name: "github-topic-dsh-plugin",
    description: `GitHub topic:${TOPIC} — full enumeration via created:/stars: slicing of the public Search API (${records.length} repos).`,
    url: TOPIC_PAGE_URL,
    snapshotGeneratedAt: new Date().toISOString(),
    records,
  };
  const snapshotJson = JSON.stringify(snapshot, null, 1);
  await writeFile(TOPIC_SNAPSHOT_PATH, snapshotJson, "utf8");
  console.log(`snapshot written: ${records.length} records (${(Buffer.byteLength(snapshotJson) / 1024 / 1024).toFixed(2)} MB)`);

  const existingPluginKeys = new Set((catalog.plugins ?? []).map((plugin) => plugin.fullName.toLowerCase()));
  const existingRelatedKeys = new Set((catalog.related ?? []).map((related) => related.fullName.toLowerCase()));
  const lowerRelatedOnly = new Set([...RELATED_ONLY].map((name) => name.toLowerCase()));

  let addedPlugins = 0;
  let addedRelated = 0;
  for (const record of records) {
    const key = record.repository.toLowerCase();
    if (known.has(key) || existingPluginKeys.has(key) || existingRelatedKeys.has(key)) continue;
    const entry = {
      fullName: record.repository,
      url: record.url,
      description: record.description,
      stars: record.stars,
      pushedAt: record.pushedAt,
      license: record.license,
    };
    if (lowerRelatedOnly.has(key) || !looksLikeDshPlugin(record)) {
      catalog.related.push({ ...entry, isPlugin: false, npmName: "", category: { id: "", title: "" } });
      addedRelated += 1;
    } else {
      catalog.plugins.push({ ...entry, isPlugin: true, npmName: "", category: { id: "", title: "" } });
      addedPlugins += 1;
    }
  }

  if (addedPlugins > 0 || addedRelated > 0) {
    catalog.updatedAt = new Date().toISOString();
    await writeFile(SECOND_SOURCE_PATH, JSON.stringify(catalog, null, 2), "utf8");
    if (addedPlugins > 0) {
      const [g, v] = await bumpHardcodedCounts(catalog.plugins.length);
      console.log(`hardcoded counts bumped to ${catalog.plugins.length} (generate=${g}, validate=${v})`);
    }
  }

  console.log(`catalog now: plugins=${catalog.plugins.length} related=${catalog.related.length} | added ${addedPlugins} plugins +${addedRelated} related`);
  if (addedPlugins === 0 && addedRelated === 0) console.log("no new topic repositories to merge");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
