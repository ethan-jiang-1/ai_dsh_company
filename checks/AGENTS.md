# AGENTS.md — `checks/` 门禁、车道与审计开发规范

> 什么时候读：新增、修改或合并 `checks/gates/`、`checks/lanes/`、`checks/audit/` 下的脚本时。
> 上游入口：根 [AGENTS.md](../AGENTS.md) · 维护面契约 = [policy.md §P6](../docs/policy.md#p6-维护面契约两层--三面d63) · 公开脚本索引 = [checks/README.md](./README.md) · 完整完成定义 = [gate-change-definition](../.agents/skills/gate-change-definition/SKILL.md)。

## 1. 面归属与门禁封顶（`policy §P2` / `§P6`）

- **`checks/` 只放 judge（会拦人的裁决）**：
  - `checks/gates/`：结构门禁模块，一门一文件，全部由 `checks/run-gates.mjs` 装配（`gate-wiring` 门禁防静默哑弹）。
  - `checks/lanes/`：真入口与端到端车道（`*.entry.mjs` / `*.e2e.mjs`），由 `tools/lib/core/asset-lanes.mjs` 统一登记。
  - `checks/audit/`：盘面审计与棘轮脚本（`*-audit.mjs` / `*-check.mjs` / `*-ratchet.mjs`）。
  - `checks/lib/` 与 `checks/gates/lib/`：judge 支撑库；严禁反向 import `probes/` 或 `tests/`。
- **门禁总数封顶（硬棘轮）**：`tests/repo/budget/test-census.spec.ts` 强制 `MAX_GATES` 上限。新增结构规则**优先并入既有 owner 门禁**，不随意新建独立 `.mjs` 文件撞顶。
- **只看证据不阻塞变更的脚本去 `probes/`**；改世界/写盘工具去 `tools/<dev|repo|release>/`。

## 2. 写门禁与脚本的五条机械铁律

1. **禁止手搓裸 Markdown / YAML 正则**：解析 frontmatter、标题节、GFM 表格或 Cordis YAML 必须复用 `tools/lib/core/repo-markdown.mjs` 与 `tools/lib/core/markdown-links.mjs`（`company-root-carriers` 静态门强守）。
2. **必须自述头注**：所有脚本顶部须写 `// 状态：常驻`（或 `已耗`）与 `// 何时跑：...`（`script-status`、`script-triggers` 门禁强守）；默认端口一律 `--port 0`（`script-port` 门禁强守）。
3. **禁止空转假绿**：每个门禁必须对“扫描对象为 0”做 fail-closed 断言，防止路径改名后门禁 `×0` 静默通过。
4. **真树红 → 还原 → 绿反证**：任何新增或修改的门禁，必须通过破坏真实对象打红 `pnpm verify`、记录精确红输出、还原变绿后才算成立；同时在 `tests/checks/` 补独立负例（高风险门禁另补 `tests/checks/gate-mutation.test.mjs` 分支级变异断言）。
5. **公开入口同步生成索引**：新增/重命名 `checks/lanes/`、`checks/audit/` 或 `tools/<组>/` 脚本后，运行 `node tools/repo/checks-index.mjs --write` 同步 `checks/INDEX.generated.md`；新增 spec 或变动资产后运行 `node tools/repo/test-census.mjs --write` 同步 `tests/CENSUS.generated.md`。

## 3. 提交前验证与收尾

- 门禁与车道改动最低验证链：`pnpm verify && pnpm test:checks && pnpm test tests/repo/`。
- 涉及 `git mv` 或删除路径时，**提交后必须复跑 `pnpm verify`**，确保 `retired-path` 对近期 git 历史与脚本注释行的回溯零命中。
- 非平凡门禁变更须按 [policy.md §P5](../docs/policy.md#p5-自主优先协议d29) 拉起无历史上下文的只读独立子代理盲审，并落盘 `notes/implemented/` 决策 Note。
