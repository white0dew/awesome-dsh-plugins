# 开发与运行时

开发工具、Shell、容器、测试与运行时支持。

**44 个目录条目** · [返回全部分类](index.md)

### [dsh-code-check](https://github.com/a179-sanae/dsh-code-check)

Repository: `a179-sanae/dsh-code-check`

Auto type-check and lint diagnostics for DeepSeek Harness: after the model edits code, tsc runs in the background and a codecheck tool reports what broke

Install: `dsh plugin --profile web add github:a179-sanae/dsh-code-check`

### [dsh-fail-logger](https://github.com/Areium/dsh-fail-logger)

Repository: `Areium/dsh-fail-logger`

全模式调用工具失败自动实录：把原生工具 / PTC runcode / 代码内嵌工具调用的失败错因去重计数后写入 skill，越用越少错。

Install: `dsh plugin --profile web add github:Areium/dsh-fail-logger`

### [dsh-eval-harness](https://github.com/BiBoyang/dsh-eval-harness)

Repository: `BiBoyang/dsh-eval-harness`

DSH 插件评测框架：YAML 用例驱动真实 headless agent，断言工具调用/参数/返回与 token 用量，baseline 门禁做 CI 回归。

Install: `dsh plugin --profile web add github:BiBoyang/dsh-eval-harness`

### [dsh-annotate](https://github.com/BrambleXu/dsh-annotate)

Repository: `BrambleXu/dsh-annotate`

面向 Vibe Coding 的浏览器元素标注插件：直接选取页面元素，并将结构化视觉反馈发送给 DeepSeek Harness Agent。

Install: `dsh plugin --profile web add github:BrambleXu/dsh-annotate`

### [dsh-prompt-profile](https://github.com/BrambleXu/dsh-prompt-profile)

Repository: `BrambleXu/dsh-prompt-profile`

DeepSeek Harness 可复用 Markdown Prompt Profile，支持单轮模型选择、参数替换和状态恢复。

Install: `dsh plugin --profile web add github:BrambleXu/dsh-prompt-profile`

### [dsh-revdiff](https://github.com/BrambleXu/dsh-revdiff)

Repository: `BrambleXu/dsh-revdiff`

DeepSeek Harness 原生交互式 Git diff 审查，支持结构化批注并回传当前 Agent 会话。

Install: `dsh plugin --profile web add github:BrambleXu/dsh-revdiff`

### [dsh-llm-fallbacks](https://github.com/btspoony/dsh-llm-fallbacks)

Repository: `btspoony/dsh-llm-fallbacks`

基于角色的模型重试与备用策略。

Install: `dsh plugin --profile web add github:btspoony/dsh-llm-fallbacks`

### [dsh-plugin-template](https://github.com/bugmaker2/dsh-plugin-template)

Repository: `bugmaker2/dsh-plugin-template`

Template for deepseek-harness plugin development.

Install: `dsh plugin --profile web add github:bugmaker2/dsh-plugin-template`

### [dsh-cc-tui](https://github.com/ccch1mneyyy/dsh-cc-tui)

Repository: `ccch1mneyyy/dsh-cc-tui`

DSH 官方尚无终端 TUI 的补位之作：Claude Code 风格全屏交互终端插件--像素鲸鱼顶栏、实时工作状态行、思考流式展开、双击 Esc 回滚、上下文进度条 + TPS 仪表。npm 一键安装。

Install: `dsh plugin --profile web add github:ccch1mneyyy/dsh-cc-tui`

### [dsh-multica-runtime](https://github.com/forrestchang/dsh-multica-runtime)

Repository: `forrestchang/dsh-multica-runtime`

Support dsh runtime on Multica.

Install: `dsh plugin --profile web add github:forrestchang/dsh-multica-runtime`

### [deepseek-harness-tui](https://github.com/gxinxing/deepseek-harness-tui)

Repository: `gxinxing/deepseek-harness-tui`

Terminal-native interactive TUI for DeepSeek Harness (dsh) - built with Ink, React for terminals

Install: `dsh plugin --profile web add github:gxinxing/deepseek-harness-tui`

### [dsh-plugin-interpreters](https://github.com/HuanLinOTO/dsh-plugin-interpreters)

Repository: `HuanLinOTO/dsh-plugin-interpreters`

Exposes runpython and runnode tools with configurable interpreter paths; settings card (via /interpreters/api HTTP route) lets users set the executable locations.

Install: `dsh plugin --profile web add github:HuanLinOTO/dsh-plugin-interpreters`

### [oh-dsh](https://github.com/hust-open-atom-club/oh-dsh)

Repository: `hust-open-atom-club/oh-dsh`

社区发行版：TUI、桌面端与 Web UI 统一体验，分层安装、一步到位。

Install: `dsh plugin --profile web add github:hust-open-atom-club/oh-dsh`

### [dsh-tool-approval](https://github.com/ilharp/dsh-tool-approval)

Repository: `ilharp/dsh-tool-approval`

手动审批模式（Manual/Ask Mode）。

Install: `dsh plugin --profile web add github:ilharp/dsh-tool-approval`

### [dsh-plugin-manager](https://github.com/Jesse-njx/dsh-plugin-manager)

Repository: `Jesse-njx/dsh-plugin-manager`

dsh pm 插件管理器：多源搜索（awesome 列表 + GitHub + npm）、按 profile 安装/移除/更新，以及 doctor 审计（清单、bundle patch、版本漂移）。

Install: `dsh plugin --profile web add github:Jesse-njx/dsh-plugin-manager`

### [dsh-polyglot](https://github.com/Jesse-njx/dsh-polyglot)

Repository: `Jesse-njx/dsh-polyglot`

DSH 的模型切换器：指向任意 OpenAI 兼容端点，内置精选免费/低价 DeepSeek 服务商预设，免费额度限流时自动回退。

Install: `dsh plugin --profile web add github:Jesse-njx/dsh-polyglot`

### [dsh-tmuxctl](https://github.com/Jesse-njx/dsh-tmuxctl)

Repository: `Jesse-njx/dsh-tmuxctl`

掌控你的 tmux 面板：list/send-keys/capture、在面板中运行长任务并 watch，破坏性命令需审批。

Install: `dsh plugin --profile web add github:Jesse-njx/dsh-tmuxctl`

### [dsh-meta-orchestrator](https://github.com/jiruidai/dsh-meta-orchestrator)

Repository: `jiruidai/dsh-meta-orchestrator`

A model-native meta-agent plugin for DeepSeek Harness that uses the underlying model’s reasoning and planning capabilities to synthesize task-specific workflows at runtime and coordinate tools and subagents.

Install: `dsh plugin --profile web add github:jiruidai/dsh-meta-orchestrator`

### [dsh-gitflow](https://github.com/lonelymoon87/dsh-gitflow)

Repository: `lonelymoon87/dsh-gitflow`

增加需要审批的 Git 状态、diff、日志、提交、分支和可选检查点工具。

Install: `dsh plugin --profile web add github:lonelymoon87/dsh-gitflow`

### [dsh-guardian](https://github.com/lonelymoon87/dsh-guardian)

Repository: `lonelymoon87/dsh-guardian`

增加危险操作策略检查、输出脱敏和安全审查工作流。

Install: `dsh plugin --profile web add github:lonelymoon87/dsh-guardian`

### [dsh-git-identity](https://github.com/LoserFox/dsh-git-identity)

Repository: `LoserFox/dsh-git-identity`

git 提交固定使用环境自身作者身份，环境变量注入压过一切 git config 设置。

Install: `dsh plugin --profile web add github:LoserFox/dsh-git-identity`

### [dsh-tool-git](https://github.com/lxj808624/dsh-tool-git)

Repository: `lxj808624/dsh-tool-git`

Structured safe Git tools for DeepSeek Harness (dsh): gitstatus/diff/log/branch/stage/commit/stash/show + destructive-command guard

Install: `dsh plugin --profile web add github:lxj808624/dsh-tool-git`

### [dsh-plugin-check](https://github.com/omdsh-dev/dsh-plugin-check)

Repository: `omdsh-dev/dsh-plugin-check`

插件健康检查：扫描清单协议/patch 格式/构建陷阱，零依赖只读。

Install: `dsh plugin --profile web add github:omdsh-dev/dsh-plugin-check`

### [dsh-security-audit](https://github.com/omdsh-dev/dsh-security-audit)

Repository: `omdsh-dev/dsh-security-audit`

本机安全审计：配置/插件来源/会话/网络暴露面，只读脱敏风险报告。

Install: `dsh plugin --profile web add github:omdsh-dev/dsh-security-audit`

### [dsh-session-health](https://github.com/omdsh-dev/dsh-session-health)

Repository: `omdsh-dev/dsh-session-health`

会话文件帧级扫描诊断（torn/损坏/空会话检测）。

Install: `dsh plugin --profile web add github:omdsh-dev/dsh-session-health`

### [fabric](https://github.com/omdsh-dev/fabric)

Repository: `omdsh-dev/fabric`

类似 MC Fabric 的 hook 处理器。

Install: `dsh plugin --profile web add github:omdsh-dev/fabric`

### [plugin-template](https://github.com/omdsh-dev/plugin-template)

Repository: `omdsh-dev/plugin-template`

插件模板仓库（基于 turtle-ui 官方仓库）。

Install: `dsh plugin --profile web add github:omdsh-dev/plugin-template`

### [Qwen-MM-Plugins](https://github.com/omdsh-dev/Qwen-MM-Plugins)

Repository: `omdsh-dev/Qwen-MM-Plugins`

Qwen 多模态插件支持。

Install: `dsh plugin --profile web add github:omdsh-dev/Qwen-MM-Plugins`

### [sandbox-micro](https://github.com/omdsh-dev/sandbox-micro)

Repository: `omdsh-dev/sandbox-micro`

microsandbox 沙箱支持。

Install: `dsh plugin --profile web add github:omdsh-dev/sandbox-micro`

### [sandbox-mxc](https://github.com/omdsh-dev/sandbox-mxc)

Repository: `omdsh-dev/sandbox-mxc`

微软跨平台沙盒支持。

Install: `dsh plugin --profile web add github:omdsh-dev/sandbox-mxc`

### [sandbox-nono](https://github.com/omdsh-dev/sandbox-nono)

Repository: `omdsh-dev/sandbox-nono`

nono 沙盒支持。

Install: `dsh plugin --profile web add github:omdsh-dev/sandbox-nono`

### [dsh-tui](https://github.com/openguardrails/dsh-tui)

Repository: `openguardrails/dsh-tui`

Claude Code-style terminal UI for DeepSeek Harness agents, as an out-of-tree dsh plugin bundle

Install: `dsh plugin --profile web add github:openguardrails/dsh-tui`

### [dsh-bisect-debug](https://github.com/PangYiMing/dsh-bisect-debug)

Repository: `PangYiMing/dsh-bisect-debug`

DSH plugin: bisect bugs (code / boundary / commit) - 二分法定位 bug 根因

Install: `dsh plugin --profile web add github:PangYiMing/dsh-bisect-debug`

### [dsh-atuin](https://github.com/RealAlexandreAI/dsh-atuin)

Repository: `RealAlexandreAI/dsh-atuin`

dsh atuin-history: record dsh user prompts into atuin shell history

Install: `dsh plugin --profile web add github:RealAlexandreAI/dsh-atuin`

### [dsh-co-authored-by](https://github.com/shelken/dsh-co-authored-by)

Repository: `shelken/dsh-co-authored-by`

dsh plugin: auto-inject Co-Authored-By and Generated-By trailers on git commit

Install: `dsh plugin --profile web add github:shelken/dsh-co-authored-by`

### [dsh-dev-actions](https://github.com/skitse/dsh-dev-actions)

Repository: `skitse/dsh-dev-actions`

Agent-proposed reusable development commands as user-approved DeepSeek Harness sidebar actions.

Install: `dsh plugin --profile web add github:skitse/dsh-dev-actions`

### [dsh-tps](https://github.com/Small-tailqwq/dsh-tps)

Repository: `Small-tailqwq/dsh-tps`

TPS 指标插件。

Install: `dsh plugin --profile web add github:Small-tailqwq/dsh-tps`

### [dsh-test-runner](https://github.com/suimi8/dsh-test-runner)

Repository: `suimi8/dsh-test-runner`

DSH plugin: structured test runner tool (testrun) - auto-detect vitest/jest/pytest/node:test, run tests, parse failure summaries for the model.

Install: `dsh plugin --profile web add github:suimi8/dsh-test-runner`

### [dsh-agent-budget](https://github.com/vibeinging/dsh-agent-budget)

Repository: `vibeinging/dsh-agent-budget`

agent 树 token 预算管理。

Install: `dsh plugin --profile web add github:vibeinging/dsh-agent-budget`

### [dsh-trace](https://github.com/vibeinging/dsh-trace)

Repository: `vibeinging/dsh-trace`

遥测后端：把 turns、model steps、tool calls 导出到 yiTrace。

Install: `dsh plugin --profile web add github:vibeinging/dsh-trace`

### [dsh-git](https://github.com/walavave/dsh-git)

Repository: `walavave/dsh-git`

Git capability bundle for DeepSeek Harness: structured git tools, approval-gated mutations, and auto-checkpoints.

Install: `dsh plugin --profile web add github:walavave/dsh-git`

### [dsh-evolve](https://github.com/william-jin-cmu/dsh-evolve)

Repository: `william-jin-cmu/dsh-evolve`

自进化：agent 在会话内给自己热挂载/卸载持久化插件。

Install: `dsh plugin --profile web add github:william-jin-cmu/dsh-evolve`

### [dsh-updater-ui](https://github.com/xingyingyuzhui/dsh-updater-ui)

Repository: `xingyingyuzhui/dsh-updater-ui`

设置页中的 DSH 自助更新器：一键检查/拉取（git pull --ff-only）、自动后台检查、版本对比与更新说明预览，带红点提醒。

Install: `dsh plugin --profile web add github:xingyingyuzhui/dsh-updater-ui`

### [dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor)

Repository: `Zhenyu98/dsh-context-doctor`

上下文注入审计：统计指令链/技能目录/工具 schema 的 token 成本，检测重复与冲突。

Install: `dsh plugin --profile web add github:Zhenyu98/dsh-context-doctor`
