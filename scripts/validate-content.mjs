import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  categories,
  categoryById,
  plugins,
  verificationStates,
} from "../content/plugins.generated.ts";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const firstInputPath = path.join(rootDirectory, "data", "sources", "awesome-dsh-plugin.json");
const secondInputPath = path.join(rootDirectory, "data", "sources", "github-plugin-catalog.json");
const reviewedAdditionsInputPath = path.join(rootDirectory, "data", "sources", "reviewed-catalog-additions.json");
const upstreamAwesomeDeepseekHarnessInputPath = path.join(rootDirectory, "data", "sources", "upstream-awesome-deepseek-harness.json");
const docsDirectory = path.join(rootDirectory, "docs", "plugins");

const [firstInput, secondInput, reviewedAdditionsInput, upstreamAwesomeDeepseekHarnessInput] = await Promise.all([
  readFile(firstInputPath, "utf8").then(JSON.parse),
  readFile(secondInputPath, "utf8").then(JSON.parse),
  readFile(reviewedAdditionsInputPath, "utf8").then(JSON.parse),
  readFile(upstreamAwesomeDeepseekHarnessInputPath, "utf8").then(JSON.parse),
]);

const errors = [];
const githubUrl = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)$/;
const repositoryName = /^[^/\s]+\/[^/\s]+$/;
const isValidInstallCommand = (command, repository) => {
  const escapedRepository = repository.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return typeof command === "string"
    && new RegExp(`^dsh plugin --profile web add github:${escapedRepository}(?:#[^\\s#]+)?$`).test(command);
};
const categoryIds = new Set(categories.map((category) => category.id));
const verificationStateIds = new Set(verificationStates);
const seenIds = new Set();
const seenRepositories = new Set();
const expectedVerificationDetail =
  "An original repository was indexed; this is not a security review, compatibility guarantee, or endorsement.";

if (!Array.isArray(firstInput.plugins) || firstInput.plugins.length !== 140) {
  errors.push("first catalog input must contain exactly 140 records");
}
if (!Array.isArray(secondInput.plugins) || secondInput.plugins.length !== 8522) {
  errors.push("second catalog input must contain exactly 8522 records");
}
if (!Array.isArray(reviewedAdditionsInput.records) || reviewedAdditionsInput.records.length !== 7) {
  errors.push("reviewed catalog additions input must contain exactly 7 records");
}
if (!Array.isArray(upstreamAwesomeDeepseekHarnessInput.records) || upstreamAwesomeDeepseekHarnessInput.records.length === 0) {
  errors.push("upstream awesome-deepseek-harness input must contain a non-empty records array");
}
const expectedPluginCount = 8557 + upstreamAwesomeDeepseekHarnessInput.records.length;
if (plugins.length !== expectedPluginCount) {
  errors.push(`expected exactly ${expectedPluginCount} normalized plugins, found ${plugins.length}`);
}
if (categories.length !== 10) {
  errors.push(`expected 10 categories, found ${categories.length}`);
}

const firstSourceRepositories = new Set();
const firstSourceStars = new Map();
const firstSourceInstallCommands = new Map();
if (Array.isArray(firstInput.plugins)) {
  for (let index = 0; index < firstInput.plugins.length; index += 1) {
    const record = firstInput.plugins[index];
    if (typeof record?.owner !== "string" || typeof record?.name !== "string") {
      errors.push(`first-source record ${index + 1} is missing owner or name`);
      continue;
    }
    const repository = `${record.owner}/${record.name}`.toLowerCase();
    firstSourceRepositories.add(repository);
    if (!isValidInstallCommand(record.install, `${record.owner}/${record.name}`)) {
      errors.push(`${record.owner}/${record.name}: install must use the standard command with an optional nonempty #version-or-ref suffix`);
    }
    firstSourceInstallCommands.set(repository, record.install);
    if (record.stars === undefined) continue;
    if (typeof record.stars !== "number" || !Number.isFinite(record.stars) || !Number.isInteger(record.stars) || record.stars < 0) {
      errors.push(`${record.owner}/${record.name}: stars must be a finite nonnegative integer`);
      continue;
    }
    firstSourceStars.set(repository, record.stars);
  }
}

const secondSourceStars = new Map();
if (Array.isArray(secondInput.plugins)) {
  for (let index = 0; index < secondInput.plugins.length; index += 1) {
    const record = secondInput.plugins[index];
    if (typeof record?.fullName !== "string") {
      errors.push(`second-source record ${index + 1} is missing fullName`);
      continue;
    }
    if (typeof record.stars !== "number" || !Number.isFinite(record.stars) || !Number.isInteger(record.stars) || record.stars < 0) {
      errors.push(`${record.fullName}: stars must be a finite nonnegative integer`);
      continue;
    }
    secondSourceStars.set(record.fullName.toLowerCase(), record.stars);
  }
}

const reviewedAdditionsByRepository = new Map();
if (Array.isArray(reviewedAdditionsInput.records)) {
  for (let index = 0; index < reviewedAdditionsInput.records.length; index += 1) {
    const record = reviewedAdditionsInput.records[index];
    if (typeof record?.name !== "string" || !record.name.trim()) {
      errors.push(`reviewed catalog addition ${index + 1} is missing a name`);
    }
    const github = record?.github;
    if (typeof github?.repository !== "string" || !repositoryName.test(github.repository)) {
      errors.push(`reviewed catalog addition ${index + 1} must have an owner/repo GitHub record`);
      continue;
    }
    if (github.url !== `https://github.com/${github.repository}`) {
      errors.push(`${github.repository}: GitHub URL must exactly match repository`);
    }
    if (github.license !== undefined && (typeof github.license !== "string" || !github.license.trim())) {
      errors.push(`${github.repository}: GitHub license must be a nonempty string when present`);
    }
    if (!categoryIds.has(record?.category)) {
      errors.push(`${github.repository}: unknown category`);
    }
    for (const locale of ["en", "zh"]) {
      if (typeof record?.description?.[locale] !== "string" || !record.description[locale].trim()) {
        errors.push(`${github.repository}: ${locale} description must not be empty`);
      }
    }
    if (typeof record?.stars !== "number" || !Number.isFinite(record.stars) || !Number.isInteger(record.stars) || record.stars < 0) {
      errors.push(`${github.repository}: stars must be a finite nonnegative integer`);
    }

    const action = record?.primaryAction;
    if (action?.type === "copy-install") {
      if (typeof action.command !== "string" || !action.command.trim()) {
        errors.push(`${github.repository}: copy-install action must have a command`);
      }
    } else if (action?.type === "external-download") {
      if (typeof action.url !== "string" || !/^https:\/\/\S+$/.test(action.url)) {
        errors.push(`${github.repository}: external-download action must have an HTTPS URL`);
      }
      for (const locale of ["en", "zh"]) {
        if (typeof action.label?.[locale] !== "string" || !action.label[locale].trim()) {
          errors.push(`${github.repository}: external-download action must have a ${locale} label`);
        }
      }
    } else {
      errors.push(`${github.repository}: primary action must be copy-install or external-download`);
    }

    const repositoryKey = github.repository.toLowerCase();
    if (reviewedAdditionsByRepository.has(repositoryKey)) {
      errors.push(`${github.repository}: duplicate reviewed catalog addition`);
    }
    reviewedAdditionsByRepository.set(repositoryKey, record);
  }
}

const upstreamAwesomeDeepseekHarnessByRepository = new Map();
if (typeof upstreamAwesomeDeepseekHarnessInput?.name !== "string" || !upstreamAwesomeDeepseekHarnessInput.name.trim()) {
  errors.push("upstream awesome-deepseek-harness input is missing a name");
}
if (typeof upstreamAwesomeDeepseekHarnessInput?.repository !== "string" || !repositoryName.test(upstreamAwesomeDeepseekHarnessInput.repository)) {
  errors.push("upstream awesome-deepseek-harness input has invalid repository metadata");
} else if (upstreamAwesomeDeepseekHarnessInput.url !== `https://github.com/${upstreamAwesomeDeepseekHarnessInput.repository}`) {
  errors.push("upstream awesome-deepseek-harness input has invalid URL metadata");
}
if (typeof upstreamAwesomeDeepseekHarnessInput?.snapshotGeneratedAt !== "string" || !upstreamAwesomeDeepseekHarnessInput.snapshotGeneratedAt.trim()) {
  errors.push("upstream awesome-deepseek-harness input is missing snapshotGeneratedAt");
}
if (Array.isArray(upstreamAwesomeDeepseekHarnessInput.records)) {
  for (let index = 0; index < upstreamAwesomeDeepseekHarnessInput.records.length; index += 1) {
    const record = upstreamAwesomeDeepseekHarnessInput.records[index];
    if (typeof record?.repository !== "string" || !repositoryName.test(record.repository)) {
      errors.push(`upstream record ${index + 1} must have an owner/repo GitHub record`);
      continue;
    }
    if (record.url !== `https://github.com/${record.repository}`) {
      errors.push(`${record.repository}: upstream URL must exactly match repository`);
    }
    if (typeof record.description !== "string" || !record.description.trim()) {
      errors.push(`${record.repository}: upstream description must not be empty`);
    }
    if (!categoryIds.has(record.category)) {
      errors.push(`${record.repository}: upstream category is unknown`);
    }
    if (record.stars !== undefined && (typeof record.stars !== "number" || !Number.isFinite(record.stars) || !Number.isInteger(record.stars) || record.stars < 0)) {
      errors.push(`${record.repository}: upstream stars must be a nonnegative integer when present`);
    }
    const repositoryKey = record.repository.toLowerCase();
    if (upstreamAwesomeDeepseekHarnessByRepository.has(repositoryKey)) {
      errors.push(`${record.repository}: duplicate upstream record`);
    }
    upstreamAwesomeDeepseekHarnessByRepository.set(repositoryKey, record);
  }
}

if (firstSourceRepositories.size !== 140) {
  errors.push(`expected 140 unique first-source repositories, found ${firstSourceRepositories.size}`);
}
if (secondSourceStars.size !== 8522) {
  errors.push(`expected 8522 second-source star records, found ${secondSourceStars.size}`);
}
if (reviewedAdditionsByRepository.size !== 7) {
  errors.push(`expected 7 unique reviewed catalog additions, found ${reviewedAdditionsByRepository.size}`);
}
for (const repository of upstreamAwesomeDeepseekHarnessByRepository.keys()) {
  if (firstSourceRepositories.has(repository) || secondSourceStars.has(repository) || reviewedAdditionsByRepository.has(repository)) {
    errors.push(`${repository}: upstream record duplicates an existing source record`);
  }
}
const firstSourceOnly = [...firstSourceRepositories].filter((repository) => !secondSourceStars.has(repository));
if (firstSourceOnly.length !== 28) {
  errors.push(`expected 28 first-source-only records, found ${firstSourceOnly.length}`);
}
if (firstSourceOnly.some((repository) => !firstSourceStars.has(repository))) {
  errors.push("every first-source-only record must have a star count");
}

for (const category of categories) {
  for (const locale of ["en", "zh"]) {
    if (!category.label[locale]?.trim() || !category.description[locale]?.trim()) {
      errors.push(`${category.id}: missing ${locale} category text`);
    }
  }
}

for (const plugin of plugins) {
  if (seenIds.has(plugin.id)) {
    errors.push(`${plugin.id}: duplicate id`);
  }
  seenIds.add(plugin.id);

  const repositoryKey = plugin.repository.toLowerCase();
  if (seenRepositories.has(repositoryKey)) {
    errors.push(`${plugin.id}: duplicate repository`);
  }
  seenRepositories.add(repositoryKey);

  if (!repositoryName.test(plugin.repository)) {
    errors.push(`${plugin.id}: repository must use owner/repo form`);
  }
  if (!githubUrl.test(plugin.repoUrl)) {
    errors.push(`${plugin.id}: repoUrl must be an exact HTTPS github.com owner/repo URL`);
  }
  if (plugin.repoUrl !== `https://github.com/${plugin.repository}`) {
    errors.push(`${plugin.id}: repoUrl must exactly match repository`);
  }
  const reviewedAddition = reviewedAdditionsByRepository.get(repositoryKey);
  const upstreamRecord = upstreamAwesomeDeepseekHarnessByRepository.get(repositoryKey);
  if (reviewedAddition) {
    if (plugin.primaryAction?.type !== reviewedAddition.primaryAction?.type) {
      errors.push(`${plugin.id}: primary action must match the reviewed addition`);
    } else if (
      plugin.primaryAction.type === "copy-install"
      && plugin.primaryAction.command !== reviewedAddition.primaryAction.command
    ) {
      errors.push(`${plugin.id}: copy-install command must match the reviewed addition`);
    } else if (
      plugin.primaryAction.type === "external-download"
      && (
        plugin.primaryAction.url !== reviewedAddition.primaryAction.url
        || plugin.primaryAction.label?.en !== reviewedAddition.primaryAction.label?.en
        || plugin.primaryAction.label?.zh !== reviewedAddition.primaryAction.label?.zh
      )
    ) {
      errors.push(`${plugin.id}: external-download action must match the reviewed addition`);
    }
  } else if (plugin.primaryAction?.type !== "copy-install") {
    errors.push(`${plugin.id}: primary action must be copy-install`);
  } else if (!isValidInstallCommand(plugin.primaryAction.command, plugin.repository)) {
    errors.push(`${plugin.id}: copy-install command must use the standard command with an optional nonempty #version-or-ref suffix`);
  } else if (
    firstSourceInstallCommands.has(repositoryKey)
    && plugin.primaryAction.command !== firstSourceInstallCommands.get(repositoryKey)
  ) {
    errors.push(`${plugin.id}: copy-install command must exactly match the first-source command`);
  }
  if (typeof plugin.stars !== "number" || !Number.isFinite(plugin.stars) || !Number.isInteger(plugin.stars) || plugin.stars < 0) {
    errors.push(`${plugin.id}: stars must be a finite nonnegative integer`);
  }
  const expectedStars = reviewedAddition
    ? reviewedAddition.stars
    : upstreamRecord
      ? upstreamRecord.stars
    : firstSourceRepositories.has(repositoryKey)
      ? secondSourceStars.get(repositoryKey) ?? firstSourceStars.get(repositoryKey)
      : secondSourceStars.get(repositoryKey);
  if (expectedStars === undefined) {
    errors.push(`${plugin.id}: stars must come from a source snapshot`);
  } else if (plugin.stars !== expectedStars) {
    errors.push(`${plugin.id}: stars must match the source snapshot`);
  }
  if (!categoryIds.has(plugin.category) || !categoryById[plugin.category]) {
    errors.push(`${plugin.id}: unknown category`);
  }
  for (const locale of ["en", "zh"]) {
    if (typeof plugin.description?.[locale] !== "string" || !plugin.description[locale].trim()) {
      errors.push(`${plugin.id}: ${locale} description must not be empty`);
    }
  }
  if (
    plugin.verification.state !== "community-discovered" ||
    !verificationStateIds.has(plugin.verification.state) ||
    plugin.verification.detail !== expectedVerificationDetail
  ) {
    errors.push(`${plugin.id}: verification must match the community-discovered policy`);
  }
  for (const forbiddenProperty of ["source", "provenance"]) {
    if (Object.hasOwn(plugin, forbiddenProperty)) {
      errors.push(`${plugin.id}: public plugin records must not expose ${forbiddenProperty}`);
    }
  }
}

for (const repository of upstreamAwesomeDeepseekHarnessByRepository.keys()) {
  if (!seenRepositories.has(repository)) {
    errors.push(`${repository}: upstream record is missing from generated plugins`);
  }
}

const chineseDocumentation = [
  path.join(docsDirectory, "zh", "index.md"),
  ...categories.map((category) => path.join(docsDirectory, "zh", category.file)),
];
for (const documentationPath of chineseDocumentation) {
  try {
    await access(documentationPath, constants.R_OK);
  } catch {
    errors.push(`missing generated Chinese documentation: ${path.relative(rootDirectory, documentationPath)}`);
  }
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Content validation passed for ${plugins.length} bilingual plugins.`);
console.log("Category summary:");
for (const category of categories) {
  const count = plugins.filter((plugin) => plugin.category === category.id).length;
  console.log(`- ${category.label.en}: ${count}`);
}
