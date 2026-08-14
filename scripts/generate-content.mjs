import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(rootDirectory, "data", "sources");
const contentDirectory = path.join(rootDirectory, "content");
const docsDirectory = path.join(rootDirectory, "docs", "plugins");

const firstSourcePath = path.join(sourceDirectory, "awesome-dsh-plugin.json");
const secondSourcePath = path.join(sourceDirectory, "github-plugin-catalog.json");
const generatedContentPath = path.join(contentDirectory, "plugins.generated.ts");
const generatedReadmePath = path.join(rootDirectory, "README.md");

const categories = [
  {
    id: "ui-themes",
    name: "UI & Themes",
    description: "Interfaces, terminal clients, themes, and presentation improvements.",
    file: "ui-themes.md",
  },
  {
    id: "sessions-memory",
    name: "Sessions & Memory",
    description: "Conversation history, context, persistence, and memory helpers.",
    file: "sessions-memory.md",
  },
  {
    id: "tools-capabilities",
    name: "Tools & Capabilities",
    description: "Focused utilities and capability extensions for everyday work.",
    file: "tools-capabilities.md",
  },
  {
    id: "workflow-agents",
    name: "Workflow & Agents",
    description: "Automation, orchestration, prompts, and agent workflows.",
    file: "workflow-agents.md",
  },
  {
    id: "notifications-integrations",
    name: "Notifications & Integrations",
    description: "Messaging, notifications, and connections to external services.",
    file: "notifications-integrations.md",
  },
  {
    id: "development-runtime",
    name: "Development & Runtime",
    description: "Developer tooling, shells, containers, testing, and runtime support.",
    file: "development-runtime.md",
  },
  {
    id: "browser-search",
    name: "Browser & Search",
    description: "Browser control, web research, crawling, and search helpers.",
    file: "browser-search.md",
  },
  {
    id: "mcp-skills",
    name: "MCP & Skills",
    description: "Model Context Protocol servers, skills, and extensibility packages.",
    file: "mcp-skills.md",
  },
  {
    id: "multimodal-vision",
    name: "Multimodal & Vision",
    description: "Image, audio, video, OCR, and other multimodal capabilities.",
    file: "multimodal-vision.md",
  },
  {
    id: "fun-experiments",
    name: "Fun & Experiments",
    description: "Playful, unusual, and exploratory community projects.",
    file: "fun-experiments.md",
  },
];

const categoryById = new Map(categories.map((category) => [category.id, category]));
const firstCategoryMap = new Map([
  ["ui", "ui-themes"],
  ["session", "sessions-memory"],
  ["tools", "tools-capabilities"],
  ["workflow", "workflow-agents"],
  ["notify", "notifications-integrations"],
  ["dev", "development-runtime"],
  ["fun", "fun-experiments"],
]);

const featuredRepositories = new Set([
  "nagi-ovo/dsh-visualize",
  "omdsh-dev/dsh-mnemon",
  "anionex/dsh-vision-toolkit",
  "jesse-njx/dsh-chatnode-wechat",
  "omdsh-dev/dsh-at-file",
  "huiliyi37/dsh-tianshu-tui",
]);

const communityDiscoveredDetail =
  "An original repository was indexed; this is not a security review, compatibility guarantee, or endorsement.";

function fail(message) {
  throw new Error(`Cannot generate plugin content: ${message}`);
}

function asObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function cleanDescription(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} is missing a description`);
  }

  const cleaned = value
    .replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    fail(`${label} has an empty description`);
  }

  return cleaned.length <= 220
    ? cleaned
    : `${cleaned.slice(0, 217).replace(/\s+\S*$/, "").trimEnd()}...`;
}

function validateRepositoryName(repository, label) {
  if (typeof repository !== "string" || !/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    fail(`${label} must be a direct owner/repository GitHub record`);
  }
}

function validateDirectGithubRecord({ repository, url, label }) {
  validateRepositoryName(repository, label);
  const expectedUrl = `https://github.com/${repository}`;
  if (url !== expectedUrl) {
    fail(`${label} does not use the exact direct GitHub URL ${expectedUrl}`);
  }
}

function installCommand(repository) {
  return `dsh plugin --profile web add github:${repository}`;
}

function pluginIdFor(repository, usedIds) {
  const baseId = repository
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!baseId) {
    fail(`could not create an id for ${repository}`);
  }

  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function compareRepositories(left, right) {
  const leftKey = left.repository.toLowerCase();
  const rightKey = right.repository.toLowerCase();
  if (leftKey < rightKey) return -1;
  if (leftKey > rightKey) return 1;
  if (left.repository < right.repository) return -1;
  if (left.repository > right.repository) return 1;
  return 0;
}

function classifySecondSourceRecord(record) {
  const repository = record.fullName;
  const text = `${repository} ${repository.split("/")[1]} ${record.description}`.toLowerCase();
  const tests = [
    ["mcp-skills", /\bmcp\b|model context protocol|\bskills?\b|skill marketplace|skill pack/],
    ["multimodal-vision", /vision|image|photo|screenshot|ocr|optical character|audio|video|multimodal|\b3d\b|pixel|speech|voice|camera/],
    ["browser-search", /browser|chrome|firefox|playwright|puppeteer|web search|web-search|search engine|crawler|scrap|fetch web|http client|url reader/],
    ["notifications-integrations", /wechat|telegram|discord|slack|email|mail|notification|webhook|integration|calendar|notion|feishu|lark|dingtalk|sms|rss/],
    ["sessions-memory", /memory|memories|mnemonic|mnemon|session|conversation|chat history|context window|recall|knowledge graph|long[- ]term/],
    ["development-runtime", /runtime|developer|development|debug|testing|test runner|docker|container|terminal|shell|\bgit\b|code review|lint|compiler|sdk|api server|database|sql|package manager|npm|rust|python/],
    ["workflow-agents", /workflow|automation|orchestrat|agent|multi-agent|prompt|planning|pipeline|task queue|cron|routine|batch|subagent/],
    ["ui-themes", /\btui\b|terminal ui|theme|interface|frontend|dashboard|visual|layout|styling|color scheme|editor|display/],
    ["fun-experiments", /game|fun|experiment|toy|joke|meme|music|creative|playground|novelty|simulation/],
  ];

  for (const [categoryId, pattern] of tests) {
    if (pattern.test(text)) {
      return categoryId;
    }
  }
  return "tools-capabilities";
}

function normalizeFirstSource(snapshot, seenRepositories) {
  const plugins = snapshot.plugins;
  if (!Array.isArray(plugins)) {
    fail("awesome-dsh-plugin.json does not have a plugins array");
  }
  if (plugins.length !== 138) {
    fail(`expected 138 first-source entries, found ${plugins.length}`);
  }

  return plugins.map((record, index) => {
    asObject(record, `first-source record ${index + 1}`);
    for (const field of ["name", "owner", "url", "install", "category"]) {
      if (typeof record[field] !== "string" || !record[field].trim()) {
        fail(`first-source record ${index + 1} is missing ${field}`);
      }
    }
    const repository = `${record.owner}/${record.name}`;
    validateDirectGithubRecord({ repository, url: record.url, label: repository });
    const expectedInstall = installCommand(repository);
    if (record.install !== expectedInstall) {
      fail(`${repository} does not use the exact install command ${expectedInstall}`);
    }
    const categoryId = firstCategoryMap.get(record.category);
    if (!categoryId) {
      fail(`${repository} has unknown first-source category ${record.category}`);
    }
    const repositoryKey = repository.toLowerCase();
    if (seenRepositories.has(repositoryKey)) {
      return null;
    }
    seenRepositories.add(repositoryKey);

    return {
      name: record.name,
      repository,
      repoUrl: record.url,
      description: cleanDescription(record.description?.en, repository),
      category: categoryId,
      installCommand: record.install,
      featured: featuredRepositories.has(repositoryKey),
      latest: record.added === snapshot.updated,
    };
  }).filter(Boolean);
}

function normalizeSecondSource(snapshot, seenRepositories) {
  const plugins = snapshot.plugins;
  if (!Array.isArray(plugins)) {
    fail("github-plugin-catalog.json does not have a plugins array");
  }
  if (plugins.length !== 334) {
    fail(`expected 334 second-source entries, found ${plugins.length}`);
  }

  const updatedDate = typeof snapshot.updatedAt === "string" ? snapshot.updatedAt.slice(0, 10) : "";
  const normalized = [];
  for (let index = 0; index < plugins.length; index += 1) {
    const record = asObject(plugins[index], `second-source record ${index + 1}`);
    if (typeof record.fullName !== "string" || typeof record.url !== "string") {
      fail(`second-source record ${index + 1} is missing fullName or url`);
    }
    if (record.isPlugin !== true) {
      fail(`${record.fullName} is not marked as a plugin`);
    }
    const repository = record.fullName;
    validateDirectGithubRecord({ repository, url: record.url, label: repository });
    const repositoryKey = repository.toLowerCase();
    if (seenRepositories.has(repositoryKey)) {
      continue;
    }
    seenRepositories.add(repositoryKey);
    normalized.push({
      name: repository.slice(repository.indexOf("/") + 1),
      repository,
      repoUrl: record.url,
      description: cleanDescription(record.description, repository),
      category: classifySecondSourceRecord(record),
      installCommand: installCommand(repository),
      featured: featuredRepositories.has(repositoryKey),
      latest: Boolean(updatedDate && typeof record.pushedAt === "string" && record.pushedAt.slice(0, 10) === updatedDate),
    });
  }
  return normalized;
}

function quote(value) {
  return JSON.stringify(value);
}

function renderPlugin(plugin) {
  return [
    "  {",
    `    id: ${quote(plugin.id)},`,
    `    name: ${quote(plugin.name)},`,
    `    repoUrl: ${quote(plugin.repoUrl)},`,
    `    repository: ${quote(plugin.repository)},`,
    `    description: ${quote(plugin.description)},`,
    `    category: ${quote(plugin.category)},`,
    `    installCommand: ${quote(plugin.installCommand)},`,
    "    verification: {",
    '      state: "community-discovered",',
    "      detail: communityDiscoveredDetail,",
    "    },",
    `    featured: ${plugin.featured},`,
    `    latest: ${plugin.latest},`,
    "  },",
  ].join("\n");
}

function renderContentModule(plugins) {
  const renderedCategories = categories
    .map((category) => [
      "  {",
      `    id: ${quote(category.id)},`,
      `    label: ${quote(category.name)},`,
      `    description: ${quote(category.description)},`,
      "  },",
    ].join("\n"))
    .join("\n");

  return `// This file is generated by scripts/generate-content.mjs. Do not edit manually.\n\nexport const categories = [\n${renderedCategories}\n] as const;\n\nexport type PluginCategory = (typeof categories)[number]["id"];\nexport type PluginCategoryDefinition = (typeof categories)[number];\n\nexport const categoryById = Object.fromEntries(\n  categories.map((category) => [category.id, category]),\n) as Record<PluginCategory, PluginCategoryDefinition>;\n\nexport const verificationStates = ["community-discovered"] as const;\n\nexport type VerificationState = (typeof verificationStates)[number];\n\nexport type PluginVerification = {\n  state: VerificationState;\n  detail: string;\n};\n\nexport type Plugin = {\n  id: string;\n  name: string;\n  repoUrl: string;\n  repository: string;\n  description: string;\n  category: PluginCategory;\n  installCommand: string;\n  verification: PluginVerification;\n  featured: boolean;\n  latest: boolean;\n};\n\nconst communityDiscoveredDetail = ${quote(communityDiscoveredDetail)};\n\nexport const plugins = [\n${plugins.map(renderPlugin).join("\n")}\n] as const satisfies readonly Plugin[];\n`;
}

function markdownText(value) {
  return value.replace(/[|<>]/g, (character) => ({ "|": "\\|", "<": "&lt;", ">": "&gt;" }[character]));
}

function renderRecord(record) {
  return [
    `### [${markdownText(record.name)}](${record.repoUrl})`,
    "",
    `Repository: \`${record.repository}\``,
    "",
    record.description,
    "",
    `Install: \`${record.installCommand}\``,
    "",
  ].join("\n");
}

function renderCategoryPage(category, records) {
  return [
    `# ${category.name}`,
    "",
    category.description,
    "",
    `**${records.length} plugins** · [Back to all categories](index.md)`,
    "",
    records.map(renderRecord).join("\n"),
  ].join("\n");
}

function renderIndexPage(groupedRecords) {
  const rows = categories.map((category) => {
    const count = groupedRecords.get(category.id)?.length ?? 0;
    return `| [${category.name}](${category.file}) | ${count} | ${category.description} |`;
  });

  return [
    "# DSH plugin directory",
    "",
    "Browse the catalog by capability. Each category page lists every indexed plugin with its original GitHub repository and install command.",
    "",
    "| Category | Plugins | What you will find |",
    "| --- | ---: | --- |",
    ...rows,
    "",
    "[Back to Awesome DSH Plugins](../../README.md)",
    "",
  ].join("\n");
}

function renderReadme(plugins, groupedRecords) {
  const rows = categories.map((category) => {
    const count = groupedRecords.get(category.id)?.length ?? 0;
    return `| [${category.name}](docs/plugins/${category.file}) | ${count} |`;
  });
  return [
    "# Awesome DSH Plugins",
    "",
    "A community-maintained directory of DeepSeek Harness (DSH) plugins, with direct links to each plugin's original GitHub repository and copy-ready install commands.",
    "",
    "- **Live site:** https://dsh.reshub.vip",
    "- **Repository:** https://github.com/white0dew/awesome-dsh-plugins",
    "",
    "## Browse and install",
    "",
    "Browse the [full plugin directory](docs/plugins/index.md), choose a category, then review a plugin's repository before installing it.",
    "",
    "```bash",
    "dsh plugin --profile web add github:OWNER/REPOSITORY",
    "```",
    "",
    "## Categories",
    "",
    "| Category | Plugins |",
    "| --- | ---: |",
    ...rows,
    "",
    "## Community note",
    "",
    `All ${plugins.length} entries are **community-discovered**. ${communityDiscoveredDetail}`,
    "",
    "## Contribute",
    "",
    "Have a plugin to add or a correction to suggest? See [CONTRIBUTING.md](CONTRIBUTING.md) or [open an issue](https://github.com/white0dew/awesome-dsh-plugins/issues/new).",
    "",
    "## License",
    "",
    "[MIT](LICENSE)",
    "",
  ].join("\n");
}

const firstSnapshot = JSON.parse(await readFile(firstSourcePath, "utf8"));
const secondSnapshot = JSON.parse(await readFile(secondSourcePath, "utf8"));
const seenRepositories = new Set();
const normalizedPlugins = [
  ...normalizeFirstSource(firstSnapshot, seenRepositories),
  ...normalizeSecondSource(secondSnapshot, seenRepositories),
].sort(compareRepositories);

if (normalizedPlugins.length !== 360) {
  fail(`expected exactly 360 unique repositories after deduplication, found ${normalizedPlugins.length}`);
}

for (const repository of featuredRepositories) {
  if (!seenRepositories.has(repository)) {
    fail(`featured repository is not present: ${repository}`);
  }
}

if (normalizedPlugins.filter((plugin) => plugin.featured).length !== 6) {
  fail("exactly six repositories must be featured");
}

const usedIds = new Set();
for (const plugin of normalizedPlugins) {
  plugin.id = pluginIdFor(plugin.repository, usedIds);
  if (!categoryById.has(plugin.category)) {
    fail(`${plugin.repository} has an unknown normalized category`);
  }
}

const groupedRecords = new Map(categories.map((category) => [category.id, []]));
for (const plugin of normalizedPlugins) {
  groupedRecords.get(plugin.category).push(plugin);
}

await mkdir(contentDirectory, { recursive: true });
await mkdir(docsDirectory, { recursive: true });
await writeFile(generatedContentPath, renderContentModule(normalizedPlugins), "utf8");
await writeFile(path.join(docsDirectory, "index.md"), renderIndexPage(groupedRecords), "utf8");
for (const category of categories) {
  await writeFile(
    path.join(docsDirectory, category.file),
    renderCategoryPage(category, groupedRecords.get(category.id)),
    "utf8",
  );
}
await writeFile(generatedReadmePath, renderReadme(normalizedPlugins, groupedRecords), "utf8");

console.log(`Generated ${normalizedPlugins.length} plugins, ${categories.length} categories, docs/plugins pages, and README.md.`);
