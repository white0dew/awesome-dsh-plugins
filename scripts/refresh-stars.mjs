import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(rootDirectory, "data", "sources");
const firstSourcePath = path.join(sourceDirectory, "awesome-dsh-plugin.json");
const secondSourcePath = path.join(sourceDirectory, "github-plugin-catalog.json");
const reviewedPath = path.join(sourceDirectory, "reviewed-catalog-additions.json");
const upstreamPath = path.join(sourceDirectory, "upstream-awesome-deepseek-harness.json");
const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
const batchSize = 100;
const maxFetchAttempts = 4;
const fetchRetryDelaysMs = [1000, 2000, 4000];
const unavailableRepositoryErrorPrefix = "Could not resolve to a Repository with the name";

if (!token) {
  throw new Error("refresh-stars requires GITHUB_TOKEN or GH_TOKEN with GitHub GraphQL access.");
}

function fail(message) {
  throw new Error(`refresh-stars: ${message}`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnavailableRepositoryError(error) {
  return isRecord(error)
    && typeof error.message === "string"
    && error.message.startsWith(unavailableRepositoryErrorPrefix);
}

function readSnapshot(value, label) {
  if (!isRecord(value) || !Array.isArray(value.plugins)) {
    fail(`${label} must contain a plugins array.`);
  }
  return value;
}

function repositoryFromFirstSource(record, index) {
  if (!isRecord(record) || typeof record.owner !== "string" || typeof record.name !== "string") {
    fail(`awesome-dsh-plugin.json entry ${index + 1} is missing owner or name.`);
  }
  return `${record.owner}/${record.name}`;
}

function repositoryFromSecondSource(record, index) {
  if (!isRecord(record) || typeof record.fullName !== "string") {
    fail(`github-plugin-catalog.json entry ${index + 1} is missing fullName.`);
  }
  return record.fullName;
}

function repositoryFromReviewedSource(record, index) {
  if (!isRecord(record) || !isRecord(record.github) || typeof record.github.repository !== "string") {
    fail(`reviewed-catalog-additions.json entry ${index + 1} is missing github.repository.`);
  }
  return record.github.repository;
}

function repositoryFromUpstreamSource(record, index) {
  if (!isRecord(record) || typeof record.repository !== "string") {
    fail(`upstream-awesome-deepseek-harness.json entry ${index + 1} is missing repository.`);
  }
  return record.repository;
}

function splitRepository(repository) {
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(repository);
  if (!match) fail(`invalid GitHub repository: ${repository}`);
  return { owner: match[1], name: match[2] };
}

function uniqueRepositories(firstSnapshot, secondSnapshot, reviewedSnapshot, upstreamSnapshot) {
  const repositories = new Map();
  const add = (repository) => {
    const key = repository.toLowerCase();
    if (!repositories.has(key)) repositories.set(key, repository);
  };

  firstSnapshot.plugins.forEach((record, index) => add(repositoryFromFirstSource(record, index)));
  secondSnapshot.plugins.forEach((record, index) => add(repositoryFromSecondSource(record, index)));
  if (isRecord(reviewedSnapshot) && Array.isArray(reviewedSnapshot.records)) {
    reviewedSnapshot.records.forEach((record, index) => add(repositoryFromReviewedSource(record, index)));
  }
  if (isRecord(upstreamSnapshot) && Array.isArray(upstreamSnapshot.records)) {
    upstreamSnapshot.records.forEach((record, index) => add(repositoryFromUpstreamSource(record, index)));
  }
  return [...repositories.values()];
}

function batches(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

function buildQuery(batch) {
  const variables = {};
  const definitions = [];
  const fields = batch.map((repository, index) => {
    const { owner, name } = splitRepository(repository);
    variables[`owner${index}`] = owner;
    variables[`name${index}`] = name;
    definitions.push(`$owner${index}: String!, $name${index}: String!`);
    return `repo${index}: repository(owner: $owner${index}, name: $name${index}) { nameWithOwner stargazerCount }`;
  });

  return {
    query: `query RepositoryStars(${definitions.join(", ")}) { ${fields.join(" ")} }`,
    variables,
  };
}

async function fetchBatch(batch) {
  let response;
  for (let attempt = 0; attempt < maxFetchAttempts; attempt += 1) {
    try {
      response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify(buildQuery(batch)),
      });
      break;
    } catch (error) {
      if (attempt === maxFetchAttempts - 1) throw error;
      const delayMs = fetchRetryDelaysMs[attempt];
      console.log(`refresh-stars: fetch attempt ${attempt + 1}/${maxFetchAttempts} failed; retrying in ${delayMs / 1000}s.`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.message === "string" ? `: ${payload.message}` : "";
    fail(`GitHub GraphQL request failed with HTTP ${response.status}${message}`);
  }
  if (!isRecord(payload) || !isRecord(payload.data)) {
    const messages = isRecord(payload) && Array.isArray(payload.errors)
      ? payload.errors.map((error) => (isRecord(error) && typeof error.message === "string" ? error.message : "unknown error")).join("; ")
      : "missing response data";
    fail(`GitHub GraphQL returned an invalid response: ${messages}`);
  }
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const fatalErrors = payload.errors.filter((error) => !isUnavailableRepositoryError(error));
    if (fatalErrors.length > 0) {
      const messages = fatalErrors
        .map((error) => (isRecord(error) && typeof error.message === "string" ? error.message : "unknown error"))
        .join("; ");
      fail(`GitHub GraphQL returned errors: ${messages}`);
    }
  }

  const stars = [];
  const unavailable = [];
  for (const [index, repository] of batch.entries()) {
    const value = payload.data[`repo${index}`];
    if (value === null) {
      unavailable.push(repository);
      continue;
    }
    if (!isRecord(value) || typeof value.nameWithOwner !== "string" || !Number.isInteger(value.stargazerCount) || value.stargazerCount < 0) {
      fail(`GitHub GraphQL returned no valid star count for ${repository}.`);
    }
    stars.push([repository.toLowerCase(), value.stargazerCount]);
  }

  return { stars, unavailable };
}

function updateFirstSnapshot(snapshot, starsByRepository, unavailableRepositories) {
  let changed = 0;
  for (const [index, record] of snapshot.plugins.entries()) {
    const repository = repositoryFromFirstSource(record, index);
    const stars = starsByRepository.get(repository.toLowerCase());
    if (stars === undefined) {
      if (unavailableRepositories.has(repository.toLowerCase())) continue;
      fail(`missing fetched stars for ${repository}.`);
    }
    if (record.stars !== stars) changed += 1;
    record.stars = stars;
  }
  return changed;
}

function updateSecondSnapshot(snapshot, starsByRepository, unavailableRepositories) {
  let changed = 0;
  for (const [index, record] of snapshot.plugins.entries()) {
    const repository = repositoryFromSecondSource(record, index);
    const stars = starsByRepository.get(repository.toLowerCase());
    if (stars === undefined) {
      if (unavailableRepositories.has(repository.toLowerCase())) continue;
      fail(`missing fetched stars for ${repository}.`);
    }
    if (record.stars !== stars) changed += 1;
    record.stars = stars;
  }
  return changed;
}

function updateReviewedSnapshot(snapshot, starsByRepository, unavailableRepositories) {
  let changed = 0;
  if (!isRecord(snapshot) || !Array.isArray(snapshot.records)) return changed;
  for (const [index, record] of snapshot.records.entries()) {
    const repository = repositoryFromReviewedSource(record, index);
    const stars = starsByRepository.get(repository.toLowerCase());
    if (stars === undefined) {
      if (unavailableRepositories.has(repository.toLowerCase())) continue;
      fail(`missing fetched stars for ${repository}.`);
    }
    if (record.stars !== stars) changed += 1;
    record.stars = stars;
  }
  return changed;
}

function updateUpstreamSnapshot(snapshot, starsByRepository, unavailableRepositories) {
  let changed = 0;
  if (!isRecord(snapshot) || !Array.isArray(snapshot.records)) return changed;
  for (const [index, record] of snapshot.records.entries()) {
    const repository = repositoryFromUpstreamSource(record, index);
    const stars = starsByRepository.get(repository.toLowerCase());
    if (stars === undefined) {
      if (unavailableRepositories.has(repository.toLowerCase())) continue;
      fail(`missing fetched stars for ${repository}.`);
    }
    if (record.stars !== stars) changed += 1;
    record.stars = stars;
  }
  return changed;
}

function indentationOf(source) {
  return source.match(/\n([ \t]+)"/)?.[1] ?? "  ";
}

function serialize(snapshot, source) {
  return `${JSON.stringify(snapshot, null, indentationOf(source))}${source.endsWith("\n") ? "\n" : ""}`;
}

const [firstSource, secondSource, reviewedSource, upstreamSource] = await Promise.all([
  readFile(firstSourcePath, "utf8"),
  readFile(secondSourcePath, "utf8"),
  readFile(reviewedPath, "utf8").catch(() => null),
  readFile(upstreamPath, "utf8").catch(() => null),
]);
const firstSnapshot = readSnapshot(JSON.parse(firstSource), "awesome-dsh-plugin.json");
const secondSnapshot = readSnapshot(JSON.parse(secondSource), "github-plugin-catalog.json");
const reviewedSnapshot = reviewedSource ? JSON.parse(reviewedSource) : null;
const upstreamSnapshot = upstreamSource ? JSON.parse(upstreamSource) : null;
const repositories = uniqueRepositories(firstSnapshot, secondSnapshot, reviewedSnapshot, upstreamSnapshot);
const repositoryBatches = batches(repositories, batchSize);
const starsByRepository = new Map();
const unavailableRepositories = new Map();

console.log(`refresh-stars: fetching ${repositories.length} unique repositories in ${repositoryBatches.length} GraphQL batches.`);
for (const [index, batch] of repositoryBatches.entries()) {
  try {
    const result = await fetchBatch(batch);
    for (const [repository, stars] of result.stars) {
      starsByRepository.set(repository, stars);
    }
    for (const repository of result.unavailable) {
      unavailableRepositories.set(repository.toLowerCase(), repository);
    }
    console.log(`refresh-stars: completed batch ${index + 1}/${repositoryBatches.length} (${batch.length} repositories).`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    fail(`stopped after ${index}/${repositoryBatches.length} completed batches; snapshots were not written. ${detail}`);
  }
}

if (unavailableRepositories.size > 0) {
  console.log(`refresh-stars: ${unavailableRepositories.size} unavailable repositories: ${[...unavailableRepositories.values()].join(", ")}.`);
}

const unavailableKeys = new Set(unavailableRepositories.keys());
const firstChanged = updateFirstSnapshot(firstSnapshot, starsByRepository, unavailableKeys);
const secondChanged = updateSecondSnapshot(secondSnapshot, starsByRepository, unavailableKeys);
let reviewedChanged = 0;
let upstreamChanged = 0;
if (reviewedSource && reviewedSnapshot) {
  reviewedChanged = updateReviewedSnapshot(reviewedSnapshot, starsByRepository, unavailableKeys);
}
if (upstreamSource && upstreamSnapshot) {
  upstreamChanged = updateUpstreamSnapshot(upstreamSnapshot, starsByRepository, unavailableKeys);
}

await Promise.all([
  writeFile(firstSourcePath, serialize(firstSnapshot, firstSource), "utf8"),
  writeFile(secondSourcePath, serialize(secondSnapshot, secondSource), "utf8"),
  reviewedSource && reviewedSnapshot
    ? writeFile(reviewedPath, serialize(reviewedSnapshot, reviewedSource), "utf8")
    : Promise.resolve(),
  upstreamSource && upstreamSnapshot
    ? writeFile(upstreamPath, serialize(upstreamSnapshot, upstreamSource), "utf8")
    : Promise.resolve(),
]);

console.log(
  `refresh-stars: updated ${firstChanged}/${firstSnapshot.plugins.length} in awesome-dsh-plugin.json, ` +
  `${secondChanged}/${secondSnapshot.plugins.length} in github-plugin-catalog.json, ` +
  `${reviewedChanged}/${reviewedSnapshot?.records?.length ?? 0} in reviewed-catalog-additions.json, ` +
  `${upstreamChanged}/${upstreamSnapshot?.records?.length ?? 0} in upstream-awesome-deepseek-harness.json.`,
);
