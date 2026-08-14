# Awesome DSH Plugins

**SEO title:** Awesome DSH Plugins | DeepSeek Harness Plugin Directory

**SEO description:** A community-maintained DeepSeek Harness plugin directory for discovering DSH plugins and their install commands.

Awesome DSH Plugins is an independent, public directory of community-built DeepSeek Harness plugins. It helps people discover awesome DSH plugins, inspect their source repositories, and copy a consistent install command.

This project is not affiliated with or endorsed by DeepSeek or DeepSeek Harness.

## Run locally

```bash
npm install
npm run validate-content
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000` after starting the development server.

## Edit the collection

All listings live in [`content/plugins.ts`](content/plugins.ts). Add or update a typed entry there, then run `npm run validate-content` before opening a pull request.

Every listing has a repository URL, `owner/repo` identifier, category, install command, discovery or structural-verification state, and launch-display flags. The validator checks unique IDs, exact GitHub URLs, known categories, known verification states, and the expected `dsh plugin --profile web add github:owner/repo` command form.

`community-discovered` means the directory found a public repository. `structurally-verified` is deliberately narrow: maintainers must confirm the repository contains `dsh.bundle.patch` and the patch file it references. It is not a security review, compatibility guarantee, quality rating, or official endorsement.

The production URL is centralized in [`lib/site.ts`](lib/site.ts). Change the `siteUrl` value when a custom domain is ready.

## Chinese quick-start

安装依赖后依次运行 `npm run validate-content`、`npm run lint` 和 `npm run build`。插件数据只需要编辑 `content/plugins.ts`；提交前请确保安装命令、GitHub 地址和验证状态准确。`community-discovered` 仅表示发现了社区仓库，并不代表安全审计或官方背书。

## License

[MIT](LICENSE)
