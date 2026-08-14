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
const reviewedAdditionsSourcePath = path.join(sourceDirectory, "reviewed-catalog-additions.json");
const generatedContentPath = path.join(contentDirectory, "plugins.generated.ts");
const generatedReadmePath = path.join(rootDirectory, "README.md");
const generatedChineseReadmePath = path.join(rootDirectory, "README.zh-CN.md");

const categories = [
  {
    id: "ui-themes",
    label: { en: "UI & Themes", zh: "界面与主题" },
    description: {
      en: "Interfaces, terminal clients, themes, and presentation improvements.",
      zh: "界面、终端客户端、主题和展示体验增强。",
    },
    file: "ui-themes.md",
  },
  {
    id: "sessions-memory",
    label: { en: "Sessions & Memory", zh: "会话与记忆" },
    description: {
      en: "Conversation history, context, persistence, and memory helpers.",
      zh: "对话历史、上下文、持久化与记忆辅助工具。",
    },
    file: "sessions-memory.md",
  },
  {
    id: "tools-capabilities",
    label: { en: "Tools & Capabilities", zh: "工具与能力" },
    description: {
      en: "Focused utilities and capability extensions for everyday work.",
      zh: "面向日常工作的实用工具和能力扩展。",
    },
    file: "tools-capabilities.md",
  },
  {
    id: "workflow-agents",
    label: { en: "Workflow & Agents", zh: "工作流与智能体" },
    description: {
      en: "Automation, orchestration, prompts, and agent workflows.",
      zh: "自动化、编排、提示词与智能体工作流。",
    },
    file: "workflow-agents.md",
  },
  {
    id: "notifications-integrations",
    label: { en: "Notifications & Integrations", zh: "通知与集成" },
    description: {
      en: "Messaging, notifications, and connections to external services.",
      zh: "消息、通知以及外部服务连接。",
    },
    file: "notifications-integrations.md",
  },
  {
    id: "development-runtime",
    label: { en: "Development & Runtime", zh: "开发与运行时" },
    description: {
      en: "Developer tooling, shells, containers, testing, and runtime support.",
      zh: "开发工具、Shell、容器、测试与运行时支持。",
    },
    file: "development-runtime.md",
  },
  {
    id: "browser-search",
    label: { en: "Browser & Search", zh: "浏览器与搜索" },
    description: {
      en: "Browser control, web research, crawling, and search helpers.",
      zh: "浏览器控制、网页研究、抓取和搜索辅助工具。",
    },
    file: "browser-search.md",
  },
  {
    id: "mcp-skills",
    label: { en: "MCP & Skills", zh: "MCP 与技能" },
    description: {
      en: "Model Context Protocol servers, skills, and extensibility packages.",
      zh: "Model Context Protocol 服务、技能与扩展包。",
    },
    file: "mcp-skills.md",
  },
  {
    id: "multimodal-vision",
    label: { en: "Multimodal & Vision", zh: "多模态与视觉" },
    description: {
      en: "Image, audio, video, OCR, and other multimodal capabilities.",
      zh: "图像、音频、视频、OCR 与其他多模态能力。",
    },
    file: "multimodal-vision.md",
  },
  {
    id: "fun-experiments",
    label: { en: "Fun & Experiments", zh: "趣味与实验" },
    description: {
      en: "Playful, unusual, and exploratory community projects.",
      zh: "有趣、特别且具探索性的项目。",
    },
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
  // Future manual recommendations go here.
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
    .replace(/[—–]/g, "-")
    .replace(/\bsource\b/gi, "origin")
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

function sourceStarsByRepository(snapshot) {
  const plugins = snapshot.plugins;
  if (!Array.isArray(plugins)) {
    fail("github-plugin-catalog.json does not have a plugins array");
  }

  const starsByRepository = new Map();
  for (let index = 0; index < plugins.length; index += 1) {
    const record = asObject(plugins[index], `second-source record ${index + 1}`);
    if (typeof record.fullName !== "string") {
      fail(`second-source record ${index + 1} is missing fullName`);
    }
    if (typeof record.stars !== "number" || !Number.isFinite(record.stars) || !Number.isInteger(record.stars) || record.stars < 0) {
      fail(`${record.fullName} is missing a finite nonnegative integer star count`);
    }
    starsByRepository.set(record.fullName.toLowerCase(), record.stars);
  }

  return starsByRepository;
}

function normalizedPrimaryAction(value, label) {
  const action = asObject(value, `${label} primary action`);
  if (action.type === "copy-install") {
    if (typeof action.command !== "string" || !action.command.trim()) {
      fail(`${label} copy-install action is missing a command`);
    }
    return { type: "copy-install", command: action.command };
  }

  if (action.type === "external-download") {
    if (typeof action.url !== "string" || !action.url.trim()) {
      fail(`${label} external-download action is missing a URL`);
    }
    let url;
    try {
      url = new URL(action.url);
    } catch {
      fail(`${label} external-download action has an invalid URL`);
    }
    if (url.protocol !== "https:") {
      fail(`${label} external-download action must use an HTTPS URL`);
    }

    const localizedLabel = asObject(action.label, `${label} external-download label`);
    const labelByLocale = {};
    for (const locale of ["en", "zh"]) {
      if (typeof localizedLabel[locale] !== "string" || !localizedLabel[locale].trim()) {
        fail(`${label} external-download action is missing a ${locale} label`);
      }
      labelByLocale[locale] = localizedLabel[locale].trim();
    }
    return { type: "external-download", url: action.url, label: labelByLocale };
  }

  fail(`${label} has an unknown primary action type`);
}

function normalizeFirstSource(snapshot, seenRepositories, secondSourceStars) {
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

    const stars = secondSourceStars.get(repositoryKey) ?? record.stars;
    if (typeof stars !== "number" || !Number.isFinite(stars) || !Number.isInteger(stars) || stars < 0) {
      fail(`${repository} is missing a finite nonnegative integer star count`);
    }

    return {
      name: record.name,
      repository,
      repoUrl: record.url,
      description: {
        en: cleanDescription(record.description?.en, `${repository} English`),
        zh: cleanDescription(record.description?.zh, `${repository} Chinese`),
      },
      category: categoryId,
      primaryAction: { type: "copy-install", command: record.install },
      stars,
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
    if (typeof record.stars !== "number" || !Number.isFinite(record.stars) || !Number.isInteger(record.stars) || record.stars < 0) {
      fail(`${record.fullName} is missing a finite nonnegative integer star count`);
    }
    const repository = record.fullName;
    validateDirectGithubRecord({ repository, url: record.url, label: repository });
    const repositoryKey = repository.toLowerCase();
    if (seenRepositories.has(repositoryKey)) {
      continue;
    }
    seenRepositories.add(repositoryKey);

    // These records have one original-language description. Keeping it in both
    // locales is the factual fallback when a reviewed translation is unavailable.
    const originalDescription = cleanDescription(record.description, repository);
    normalized.push({
      name: repository.slice(repository.indexOf("/") + 1),
      repository,
      repoUrl: record.url,
      description: { en: originalDescription, zh: originalDescription },
      category: classifySecondSourceRecord(record),
      primaryAction: { type: "copy-install", command: installCommand(repository) },
      stars: record.stars,
      featured: featuredRepositories.has(repositoryKey),
      latest: Boolean(updatedDate && typeof record.pushedAt === "string" && record.pushedAt.slice(0, 10) === updatedDate),
    });
  }
  return normalized;
}

function normalizeReviewedAdditions(snapshot, seenRepositories) {
  const records = snapshot.records;
  if (!Array.isArray(records)) {
    fail("reviewed-catalog-additions.json does not have a records array");
  }
  if (records.length !== 2) {
    fail(`expected 2 reviewed catalog additions, found ${records.length}`);
  }

  return records.map((record, index) => {
    asObject(record, `reviewed catalog addition ${index + 1}`);
    if (typeof record.name !== "string" || !record.name.trim()) {
      fail(`reviewed catalog addition ${index + 1} is missing a name`);
    }
    const github = asObject(record.github, `${record.name} GitHub metadata`);
    if (typeof github.repository !== "string" || typeof github.url !== "string") {
      fail(`${record.name} GitHub metadata is missing repository or URL`);
    }
    if (github.license !== undefined && (typeof github.license !== "string" || !github.license.trim())) {
      fail(`${record.name} GitHub metadata has an invalid license`);
    }
    validateDirectGithubRecord({ repository: github.repository, url: github.url, label: record.name });
    if (typeof record.category !== "string" || !categoryById.has(record.category)) {
      fail(`${github.repository} has an unknown reviewed-addition category`);
    }
    if (typeof record.stars !== "number" || !Number.isFinite(record.stars) || !Number.isInteger(record.stars) || record.stars < 0) {
      fail(`${github.repository} is missing a finite nonnegative integer star count`);
    }
    const repositoryKey = github.repository.toLowerCase();
    if (seenRepositories.has(repositoryKey)) {
      fail(`${github.repository} duplicates an existing source record`);
    }
    seenRepositories.add(repositoryKey);

    return {
      name: record.name,
      repository: github.repository,
      repoUrl: github.url,
      description: {
        en: cleanDescription(record.description?.en, `${github.repository} English`),
        zh: cleanDescription(record.description?.zh, `${github.repository} Chinese`),
      },
      category: record.category,
      primaryAction: normalizedPrimaryAction(record.primaryAction, github.repository),
      stars: record.stars,
      featured: featuredRepositories.has(repositoryKey),
      latest: false,
    };
  });
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
    `    primaryAction: ${quote(plugin.primaryAction)},`,
    `    stars: ${plugin.stars},`,
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
      `    label: ${quote(category.label)},`,
      `    description: ${quote(category.description)},`,
      `    file: ${quote(category.file)},`,
      "  },",
    ].join("\n"))
    .join("\n");

  return `// This file is generated by scripts/generate-content.mjs. Do not edit manually.\n\nexport type LocalizedText = {\n  en: string;\n  zh: string;\n};\n\nexport const categories = [\n${renderedCategories}\n] as const satisfies readonly {\n  id: string;\n  label: LocalizedText;\n  description: LocalizedText;\n  file: string;\n}[];\n\nexport type PluginCategory = (typeof categories)[number]["id"];\nexport type PluginCategoryDefinition = (typeof categories)[number];\n\nexport const categoryById = Object.fromEntries(\n  categories.map((category) => [category.id, category]),\n) as Record<PluginCategory, PluginCategoryDefinition>;\n\nexport const verificationStates = ["community-discovered"] as const;\n\nexport type VerificationState = (typeof verificationStates)[number];\n\nexport type PluginVerification = {\n  state: VerificationState;\n  detail: string;\n};\n\nexport type PluginPrimaryAction =\n  | { type: "copy-install"; command: string }\n  | { type: "external-download"; url: string; label: LocalizedText };\n\nexport type Plugin = {\n  id: string;\n  name: string;\n  repoUrl: string;\n  repository: string;\n  description: LocalizedText;\n  category: PluginCategory;\n  primaryAction: PluginPrimaryAction;\n  stars: number;\n  verification: PluginVerification;\n  featured: boolean;\n  latest: boolean;\n};\n\nconst communityDiscoveredDetail = ${quote(communityDiscoveredDetail)};\n\nexport const plugins = [\n${plugins.map(renderPlugin).join("\n")}\n] as const satisfies readonly Plugin[];\n`;
}

function markdownText(value) {
  return value.replace(/[|<>]/g, (character) => ({ "|": "\\|", "<": "&lt;", ">": "&gt;" }[character]));
}

function renderRecord(record, locale) {
  const action = record.primaryAction.type === "copy-install"
    ? `Install: \`${record.primaryAction.command}\``
    : `${locale === "zh" ? "下载" : "Download"}: [${markdownText(record.primaryAction.label[locale])}](${record.primaryAction.url})`;

  return [
    `### [${markdownText(record.name)}](${record.repoUrl})`,
    "",
    `Repository: \`${record.repository}\``,
    "",
    record.description[locale],
    "",
    action,
    "",
  ].join("\n");
}

function renderCategoryPage(category, records, locale) {
  const isChinese = locale === "zh";
  return [
    `# ${category.label[locale]}`,
    "",
    category.description[locale],
    "",
    isChinese
      ? `**${records.length} 个目录条目** · [返回全部分类](index.md)`
      : `**${records.length} catalog entries** · [Back to all categories](index.md)`,
    "",
    records.map((record) => renderRecord(record, locale)).join("\n"),
  ].join("\n");
}

function renderIndexPage(groupedRecords, locale) {
  const isChinese = locale === "zh";
  const rows = categories.map((category) => {
    const count = groupedRecords.get(category.id)?.length ?? 0;
    return `| [${category.label[locale]}](${category.file}) | ${count} | ${category.description[locale]} |`;
  });

  return [
    isChinese ? "# DSH 插件目录" : "# DSH plugin directory",
    "",
    isChinese
      ? "按能力浏览目录。每个分类页面都列出条目的原始 GitHub 仓库和主要操作。"
      : "Browse the catalog by capability. Each category page lists every entry's original GitHub repository and primary action.",
    "",
    isChinese ? "| 分类 | 条目数 | 内容 |" : "| Category | Entries | What you will find |",
    "| --- | ---: | --- |",
    ...rows,
    "",
    isChinese ? "[返回 Awesome DSH Plugins](../../../README.zh-CN.md)" : "[Back to Awesome DSH Plugins](../../README.md)",
    "",
  ].join("\n");
}

function renderReadme(plugins, groupedRecords, locale) {
  const isChinese = locale === "zh";
  const rows = categories.map((category) => {
    const count = groupedRecords.get(category.id)?.length ?? 0;
    const href = isChinese ? `docs/plugins/zh/${category.file}` : `docs/plugins/${category.file}`;
    return `| [${category.label[locale]}](${href}) | ${count} |`;
  });

  return [
    "# Awesome DSH Plugins",
    "",
    isChinese ? "[English](README.md)" : "[简体中文](README.zh-CN.md)",
    "",
    isChinese
      ? "一个独立的 DeepSeek Harness (DSH) 目录，提供插件和相关工具的原始 GitHub 仓库直接链接，以及相应的主要操作。"
      : "An independent directory of DeepSeek Harness (DSH) plugins and related tools, with direct links to each original GitHub repository and its primary action.",
    "",
    "- **Live site:** https://dsh.reshub.vip",
    "- **Repository:** https://github.com/white0dew/awesome-dsh-plugins",
    "",
    isChinese ? "## 浏览与使用" : "## Browse and use",
    "",
    isChinese
      ? "浏览[完整目录](docs/plugins/zh/index.md)，选择分类，并在安装插件或下载相关工具前查看其仓库。"
      : "Browse the [full directory](docs/plugins/index.md), choose a category, then review a repository before installing a plugin or downloading a related tool.",
    "",
    "```bash",
    "dsh plugin --profile web add github:OWNER/REPOSITORY",
    "```",
    "",
    isChinese ? "## 分类" : "## Categories",
    "",
    isChinese ? "| 分类 | 条目数 |" : "| Category | Entries |",
    "| --- | ---: |",
    ...rows,
    "",
    isChinese ? "## 独立说明" : "## Independence",
    "",
    isChinese
      ? `本目录收录 ${plugins.length} 个条目，并非 DeepSeek 官方产品，也不代表安全审查、兼容性保证或认可。`
      : `This directory lists ${plugins.length} catalog entries. It is not an official DeepSeek property and does not represent a security review, compatibility guarantee, or endorsement.`,
    "",
    isChinese ? "## 参与贡献" : "## Contribute",
    "",
    isChinese
      ? "需要添加插件或修正信息？请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 或[提交 issue](https://github.com/white0dew/awesome-dsh-plugins/issues/new)。"
      : "Have a plugin to add or a correction to suggest? See [CONTRIBUTING.md](CONTRIBUTING.md) or [open an issue](https://github.com/white0dew/awesome-dsh-plugins/issues/new).",
    "",
    isChinese ? "## 致谢" : "## Thanks",
    "",
    isChinese
      ? "感谢 [LinuxDO 社区](https://linux.do/) 的支持与交流。"
      : "Thanks to the [Linux Do community](https://linux.do/) for the support and exchange.",
    "",
    "## License",
    "",
    "[MIT](LICENSE)",
    "",
  ].join("\n");
}

const firstSnapshot = JSON.parse(await readFile(firstSourcePath, "utf8"));
const secondSnapshot = JSON.parse(await readFile(secondSourcePath, "utf8"));
const reviewedAdditionsSnapshot = JSON.parse(await readFile(reviewedAdditionsSourcePath, "utf8"));
const secondSourceStars = sourceStarsByRepository(secondSnapshot);
const seenRepositories = new Set();
const normalizedPlugins = [
  ...normalizeFirstSource(firstSnapshot, seenRepositories, secondSourceStars),
  ...normalizeSecondSource(secondSnapshot, seenRepositories),
  ...normalizeReviewedAdditions(reviewedAdditionsSnapshot, seenRepositories),
].sort(compareRepositories);

if (normalizedPlugins.length !== 362) {
  fail(`expected exactly 362 unique repositories after deduplication, found ${normalizedPlugins.length}`);
}

for (const repository of featuredRepositories) {
  if (!seenRepositories.has(repository)) {
    fail(`featured repository is not present: ${repository}`);
  }
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

const chineseDocsDirectory = path.join(docsDirectory, "zh");
await mkdir(contentDirectory, { recursive: true });
await mkdir(docsDirectory, { recursive: true });
await mkdir(chineseDocsDirectory, { recursive: true });
await writeFile(generatedContentPath, renderContentModule(normalizedPlugins), "utf8");
await writeFile(path.join(docsDirectory, "index.md"), renderIndexPage(groupedRecords, "en"), "utf8");
await writeFile(path.join(chineseDocsDirectory, "index.md"), renderIndexPage(groupedRecords, "zh"), "utf8");
for (const category of categories) {
  await writeFile(
    path.join(docsDirectory, category.file),
    renderCategoryPage(category, groupedRecords.get(category.id), "en"),
    "utf8",
  );
  await writeFile(
    path.join(chineseDocsDirectory, category.file),
    renderCategoryPage(category, groupedRecords.get(category.id), "zh"),
    "utf8",
  );
}
await writeFile(generatedReadmePath, renderReadme(normalizedPlugins, groupedRecords, "en"), "utf8");
await writeFile(generatedChineseReadmePath, renderReadme(normalizedPlugins, groupedRecords, "zh"), "utf8");

console.log(`Generated ${normalizedPlugins.length} plugins, ${categories.length} categories, bilingual docs, and bilingual READMEs.`);
