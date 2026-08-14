# Contributing

Thanks for helping make Awesome DSH Plugins useful and accurate.

## Before opening a pull request

1. Search the existing entries in `content/plugins.ts` to avoid duplicates.
2. Add a single typed entry with an accurate repository URL, `owner/repo`, category, and install command.
3. Keep descriptions factual and concise. Do not add performance claims, user counts, compatibility promises, security claims, or official-affiliation language without clear evidence.
4. Use `community-discovered` unless you personally checked both `dsh.bundle.patch` and the patch file it references. Structural verification only checks that expected files are present; it is not a security audit or endorsement.
5. Run `npm run validate-content`, `npm run lint`, and `npm run build`.

## Listing policy

- Link directly to the public GitHub repository.
- Use the exact repository casing in `repository` and `repoUrl`.
- Use the expected command: `dsh plugin --profile web add github:owner/repo`.
- Use `latest: true` only for a new entry being added to the directory. It labels the listing as new to this index, not as a statement about repository freshness.
- Use `featured: true` sparingly. Featured status is an editorial display choice, not an endorsement.

## Verification process

The repository is intentionally static and has no server-side trust system. A structural-verification review should record that the repository contains `dsh.bundle.patch` and that the file named by that bundle exists. Do not describe this as code review, security validation, or guaranteed compatibility.

Maintainers may adjust a submitted category, description, verification label, or launch flags to keep the collection consistent.
