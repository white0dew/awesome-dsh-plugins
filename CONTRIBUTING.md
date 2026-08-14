# Contributing

Thanks for helping make Awesome DSH Plugins useful, fast-moving, and accurate.

## Before opening a pull request

1. Search the generated catalog in `content/plugins.generated.ts` to avoid duplicates.
2. Update or replace a source snapshot in `data/sources/` instead of hand-editing the generated file.
3. Run `npm run generate-content` after changing source data.
4. Keep descriptions factual and concise. Do not add performance claims, user counts, compatibility promises, security claims, or official-affiliation language without clear evidence.
5. Use `community-discovered` unless you personally checked both `dsh.bundle.patch` and the patch file it references. Structural verification only checks that expected files are present. It is not a security audit or endorsement.
6. Run `npm run validate-content`, `npm run lint`, and `npm run build`.

## Listing policy

- Link directly to the public GitHub repository.
- Use the exact repository casing in `repository` and `repoUrl`.
- Use the expected command: `dsh plugin --profile web add github:owner/repo`.
- Use `latest: true` only for repositories newly added to the current source batch.
- Use `featured: true` sparingly. Featured status is an editorial display choice, not an endorsement.

## Verification process

The repository is intentionally static and has no server-side trust system. A structural-verification review should record that the repository contains `dsh.bundle.patch` and that the file named by that bundle exists. Do not describe this as code review, security validation, or guaranteed compatibility.

Maintainers may adjust a submitted category, description, verification label, or launch flags to keep the collection consistent.
