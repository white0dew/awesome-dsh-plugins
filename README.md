# Awesome DSH Plugins

**Live site:** https://dsh.reshub.vip
**GitHub repository:** https://github.com/white0dew/awesome-dsh-plugins

**SEO title:** Awesome DSH Plugins | DeepSeek Harness plugins on GitHub

**SEO description:** A public GitHub directory for DeepSeek Harness plugins, DSH plugins, install commands, and ecosystem discovery.

Awesome DSH Plugins is an independent, public directory of **DeepSeek Harness plugins** and **DSH plugins**. It helps builders discover repositories on **GitHub**, inspect public source links, copy install commands, and browse a growing **DeepSeek Harness plugin directory** without waiting for a database-backed service.

This project is not affiliated with or endorsed by DeepSeek or DeepSeek Harness.

## What is in the catalog now

- **138** public plugin listings in the current launch snapshot
- normalized categories, repository URLs, and install commands
- source provenance on every card
- client-side search and filtering
- static export deployment for `https://dsh.reshub.vip`

## Run locally

```bash
npm install
npm run generate-content
npm run validate-content
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000` after starting the development server.

## Content pipeline

This repo now uses a generated catalog pipeline instead of a hand-maintained array.

### Source snapshot

Current source snapshot lives at:

- [`data/sources/awesome-dsh-plugin.json`](data/sources/awesome-dsh-plugin.json)

### Generated output

These files are produced or consumed by the site:

- [`scripts/generate-content.mjs`](scripts/generate-content.mjs)
- [`scripts/validate-content.mjs`](scripts/validate-content.mjs)
- [`content/plugins.generated.ts`](content/plugins.generated.ts)
- [`content/plugins.ts`](content/plugins.ts) as a compatibility re-export

Run `npm run generate-content` after updating a source snapshot.

## Verification model

`community-discovered` means the directory found and normalized a public repository. It does **not** mean a security review, compatibility guarantee, quality rating, or official endorsement.

`structurally-verified` is intentionally narrow. It should only be used when maintainers confirm that a repository exposes `dsh.bundle.patch` and the patch file it references.

## Source ecosystem

This repo is being expanded using public ecosystem sources such as:

- `awesome-dsh-plugin/awesome-dsh-plugin`
- `0xsline/awesome-deepseek-harness`
- `dongsheng123132/awesome-dsh-plugins`

The goal is to move quickly while keeping every listing factual, source-linked, and easy to verify on GitHub.

## Production URL

The production URL is centralized in [`lib/site.ts`](lib/site.ts). Change `siteUrl` there if the deployed domain changes.

## Chinese quick start

先运行 `npm install`，然后依次执行 `npm run generate-content`、`npm run validate-content`、`npm run lint` 和 `npm run build`。插件目录数据来自 `data/sources/awesome-dsh-plugin.json`，生成后的站点消费文件是 `content/plugins.generated.ts`。`community-discovered` 仅表示发现并整理了公开 GitHub 仓库，并不代表安全审计或官方背书。

## License

[MIT](LICENSE)
