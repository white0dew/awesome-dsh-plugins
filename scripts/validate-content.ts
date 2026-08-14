import {
  categories,
  plugins,
  verificationStates,
  type Plugin,
} from "../content/plugins.ts";

const errors: string[] = [];
const githubUrl = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/;
const repositoryName = /^[^/\s]+\/[^/\s]+$/;
const categoryIds = new Set(categories.map((category) => category.id));
const allowedVerificationStates = new Set(verificationStates);
const seenIds = new Set<string>();

for (const plugin of plugins as readonly Plugin[]) {
  if (seenIds.has(plugin.id)) {
    errors.push(`${plugin.id}: duplicate id`);
  }
  seenIds.add(plugin.id);

  if (!githubUrl.test(plugin.repoUrl)) {
    errors.push(`${plugin.id}: repoUrl must be an HTTPS github.com owner/repo URL`);
  }

  if (!repositoryName.test(plugin.repository)) {
    errors.push(`${plugin.id}: repository must use owner/repo form`);
  }

  const expectedUrl = `https://github.com/${plugin.repository}`;
  if (plugin.repoUrl !== expectedUrl) {
    errors.push(`${plugin.id}: repoUrl must exactly match repository`);
  }

  if (!categoryIds.has(plugin.category)) {
    errors.push(`${plugin.id}: category is not in the category collection`);
  }

  if (!allowedVerificationStates.has(plugin.verification.state)) {
    errors.push(`${plugin.id}: verification state is not allowed`);
  }

  const expectedInstall = `dsh plugin --profile web add github:${plugin.repository}`;
  if (plugin.installCommand !== expectedInstall) {
    errors.push(`${plugin.id}: install command must match the expected GitHub form`);
  }
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Content validation passed for ${plugins.length} plugins.`);
