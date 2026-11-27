# AGENTS.md — `packages/company-pack/` 开发规范

> 什么时候读：修改 `packages/company-pack/` 下的 host、lib、client、presets 或只读 content 时。
> 上游入口：根 [AGENTS.md](../../AGENTS.md) · 模块源码地图 = [src/README.md](./src/README.md) · 包说明 = [README.md](./README.md)。

## 1. 架构分层与导入红线（`src-layering` 门禁强守）

| 目录 | 职责与边界 | 允许依赖 |
|---|---|---|
| `src/lib/` | host/client 共享纯逻辑（零 `node:*` 内建） | 仅 `src/lib/` 与纯类型 |
| `src/host/` | Node 宿主能力（公司盘、提示词、语言桥、委派、账本、培养、命令） | `src/lib/` 与 Node/DSH 宿主包 |
| `src/client/` | 浏览器端 DSH L0/L1 原生扩展（页签、HQ、签字拦截、双语 UI） | `src/lib/` 与 `dsh.client.inject` 声明包 |
| `src/index.ts` | 包主入口（host `apply`） | `src/host/` + `src/lib/` |
| `presets/` | 角色与 support preset（`agent.cordis.yml` 含内联 `@deepseek-ai/dsh-persona` + `skills/`） | 自包含声明工具行，无 patch 继承 |
| `content/` | 只读出厂手册、模板、默认章程与状态默认值（由 `manifest.json` 登记） | 零仓库路径、零部署历史 |

- **严禁反向导入**：`client ↛ host`、`lib ↛ {host, client}`；违反即触发 `src-layering` 门禁。
- **零 `vendor/dsh/` 改动**：所有能力收敛在 DSH 官方扩展契约与 `cordis.patch.yml`。
- **不随包分发本文件**：本文件仅供维护者阅读，严禁加入 `package.json` 的 `files` 白名单。

## 2. Client UI 与双语硬红线

- **无模块级可变单例**：`src/client/index.ts` 须在 `apply` 闭包内初始化 `attention`、`hubStore`、`startupStore`。
- **禁碰 L2/L3 独占槽位与脆弱 Hack**：禁止注册 `uiConversation.groups.register('chat', ...)`、`conversation.approval.detail`、`sidebar.toggle.badge` 或无路径守卫的 `.md` 预览；禁止裸十六进制色值（统一 `--dsw-alias-*` / `--dsw-static-*`）、`> 500` 字重与 `1px` 中性边框（改 `0.5px` hairline）；禁止重复 `$mount` 官方服务。详细契约见 [client-ui.md](../../docs/contracts/client-ui.md)。
- **用户可见文案双语强制**：任何界面文案必须从首个提交同时提供 `zh` 与 `en`（默认 `zh`），走类型化公司 locale 字典，严禁硬编码字面量（流程见 [company-ui-change-definition](../../.agents/skills/company-ui-change-definition/SKILL.md)）。

## 3. Preset 与内容归位红线

- **先答四问再落笔**：新增或搬移角色、能力、方法、模板或政策，必须先走 [content-charter.md](../../docs/contracts/content-charter.md) 四问与两测（流程 = [capability-addition-definition](../../.agents/skills/capability-addition-definition/SKILL.md)）。
- **角色模型与事实边界**：全员同模型（不写 `agentOptions`）；公司活数据只住 `<workspace>/.dsh-company/`；规则详情见 [presets.md](../../docs/contracts/presets.md) 与 [data-model.md](../../docs/contracts/data-model.md)。
- **组合变更同步目录**：改动 `package.json`、`cordis.patch.yml` 或 `presets/*/agent.cordis.yml` 后，执行 `pnpm gen:catalog -- --write` 刷新 [package-catalog.generated.md](../../docs/reference/package-catalog.generated.md)。

## 4. 按改动面选最窄验证

| 改动面 | 必跑命令 |
|---|---|
| `src/host/**` 或 `src/lib/**` | `pnpm typecheck && pnpm test`（对应 spec）+ `pnpm verify` |
| `src/client/**` 或 `locale/**` | `pnpm typecheck && pnpm test tests/client/` + `source run/env.sh && node checks/lanes/client-load.entry.mjs` |
| `presets/**` 或 `cordis.patch.yml` | `pnpm gen:catalog -- --write && pnpm verify && pnpm test tests/presets/` + `source run/env.sh && node checks/lanes/preset.entry.mjs`（见 [preset-change-definition](../../.agents/skills/preset-change-definition/SKILL.md)） |
| `content/**` | `pnpm verify && pnpm test tests/content/` |
| 构建与发布打包 | 先 `tsc -b packages/company-pack` 再 `tsdown`（见 [bootstrap.md](../../docs/guides/bootstrap.md)）；发布前跑 `pnpm release:check` |
