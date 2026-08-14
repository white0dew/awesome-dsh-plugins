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
const firstInputPath = path.join(
  rootDirectory,
  "data/sources/awesome-dsh-plugin.json",
);
const secondInputPath = path.join(
  rootDirectory,
  "data/sources/github-plugin-catalog.json",
);

const [firstInput, secondInput] = await Promise.all([
  readFile(firstInputPath, "utf8").then(JSON.parse),
  readFile(secondInputPath, "utf8").then(JSON.parse),
]);

const errors = [];
const githubUrl = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)$/;
const repositoryName = /^[^/\s]+\/[^/\s]+$/;
const categoryIds = new Set(categories.map((category) => category.id));
const verificationStateIds = new Set(verificationStates);
const seenIds = new Set();
const seenRepositories = new Set();
const expectedVerificationDetail =
  "An original repository was indexed; this is not a security review, compatibility guarantee, or endorsement.";

if (!Array.isArray(firstInput.plugins) || firstInput.plugins.length !== 138) {
  errors.push("first catalog input must contain exactly 138 records");
}
if (!Array.isArray(secondInput.plugins) || secondInput.plugins.length !== 334) {
  errors.push("second catalog input must contain exactly 334 records");
}
if (plugins.length !== 360) {
  errors.push(`expected exactly 360 normalized plugins, found ${plugins.length}`);
}
if (categories.length !== 10) {
  errors.push(`expected 10 categories, found ${categories.length}`);
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
  if (
    plugin.installCommand !==
    `dsh plugin --profile web add github:${plugin.repository}`
  ) {
    errors.push(`${plugin.id}: install command must exactly match repository`);
  }
  if (!categoryIds.has(plugin.category) || !categoryById[plugin.category]) {
    errors.push(`${plugin.id}: unknown category`);
  }
  if (plugin.verification.state !== "community-discovered") {
    errors.push(`${plugin.id}: verification state must be community-discovered`);
  }
  if (!verificationStateIds.has(plugin.verification.state)) {
    errors.push(`${plugin.id}: verification state is not allowed`);
  }
  if (plugin.verification.detail !== expectedVerificationDetail) {
    errors.push(`${plugin.id}: verification detail does not match the catalog policy`);
  }
  if (typeof plugin.description !== "string" || !plugin.description.trim()) {
    errors.push(`${plugin.id}: description must not be empty`);
  }
  if (Object.hasOwn(plugin, "source")) {
    errors.push(`${plugin.id}: public plugin records must not expose catalog provenance`);
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

console.log(`Content validation passed for ${plugins.length} plugins.`);
console.log("Category summary:");
for (const category of categories) {
  const count = plugins.filter((plugin) => plugin.category === category.id).length;
  console.log(`- ${category.label}: ${count}`);
}
