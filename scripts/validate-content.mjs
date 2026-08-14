import { readFile } from "node:fs/promises";
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
const sourcePath = path.join(
  rootDirectory,
  "data/sources/awesome-dsh-plugin.json",
);
const sourceSnapshot = JSON.parse(await readFile(sourcePath, "utf8"));

const errors = [];
const githubUrl = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)$/;
const repositoryName = /^[^/\s]+\/[^/\s]+$/;
const installCommand = /^dsh plugin --profile web add github:([^/\s]+)\/([^/\s]+)$/;
const categoryIds = new Set(categories.map((category) => category.id));
const allowedVerificationStates = new Set(verificationStates);
const seenIds = new Set();
const seenRepositories = new Set();
const expectedVerificationDetail =
  "Community discovered. Structural bundle checks have not been done.";

if (!Array.isArray(sourceSnapshot.plugins) || sourceSnapshot.plugins.length !== 138) {
  errors.push("source snapshot must contain exactly 138 public plugin records");
}

if (plugins.length < 100) {
  errors.push(`expected at least 100 plugins, found ${plugins.length}`);
}

if (plugins.length !== sourceSnapshot.plugins?.length) {
  errors.push("generated plugin count must match the source snapshot");
}

for (const plugin of plugins) {
  if (seenIds.has(plugin.id)) {
    errors.push(`${plugin.id}: duplicate id`);
  }
  seenIds.add(plugin.id);

  if (seenRepositories.has(plugin.repository)) {
    errors.push(`${plugin.id}: duplicate repository`);
  }
  seenRepositories.add(plugin.repository);

  const urlMatch = githubUrl.exec(plugin.repoUrl);
  if (!urlMatch) {
    errors.push(`${plugin.id}: repoUrl must be an exact HTTPS github.com owner/repo URL`);
  }

  if (!repositoryName.test(plugin.repository)) {
    errors.push(`${plugin.id}: repository must use owner/repo form`);
  }

  if (plugin.repoUrl !== `https://github.com/${plugin.repository}`) {
    errors.push(`${plugin.id}: repoUrl must exactly match repository`);
  }

  if (!installCommand.test(plugin.installCommand)) {
    errors.push(`${plugin.id}: install command must use the expected GitHub form`);
  }

  if (
    plugin.installCommand !==
    `dsh plugin --profile web add github:${plugin.repository}`
  ) {
    errors.push(`${plugin.id}: install command must exactly match repository`);
  }

  if (!categoryIds.has(plugin.category) || !categoryById[plugin.category]) {
    errors.push(`${plugin.id}: category is not in the category collection`);
  }

  if (!allowedVerificationStates.has(plugin.verification.state)) {
    errors.push(`${plugin.id}: verification state is not allowed`);
  }

  if (
    plugin.verification.state !== "community-discovered" ||
    plugin.verification.detail !== expectedVerificationDetail
  ) {
    errors.push(`${plugin.id}: verification must state that structural bundle checks have not been done`);
  }

  if (!plugin.description.trim()) {
    errors.push(`${plugin.id}: description must not be empty`);
  }

  if (!plugin.source.name.trim() || !plugin.source.url.trim()) {
    errors.push(`${plugin.id}: source name and URL must not be empty`);
  }

  try {
    const sourceUrl = new URL(plugin.source.url);
    if (sourceUrl.protocol !== "https:") {
      errors.push(`${plugin.id}: source URL must use HTTPS`);
    }
  } catch {
    errors.push(`${plugin.id}: source URL must be valid`);
  }
}

const featuredCount = plugins.filter((plugin) => plugin.featured).length;
if (featuredCount !== 6) {
  errors.push(`expected exactly 6 featured plugins, found ${featuredCount}`);
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const categorySummary = categories.map((category) => ({
  label: category.label,
  count: plugins.filter((plugin) => plugin.category === category.id).length,
}));

console.log(`Content validation passed for ${plugins.length} plugins.`);
console.log("Category summary:");
for (const category of categorySummary) {
  console.log(`- ${category.label}: ${category.count}`);
}
