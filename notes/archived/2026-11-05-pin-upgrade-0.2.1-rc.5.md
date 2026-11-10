# 2026-11-05 · 升 pin：`dsh-v0.2.1-rc.2` → `dsh-v0.2.1-rc.5`

状态：已交付（基座钉 `dsh-v0.2.1-rc.5` = `b830ec950faba0a46dda564be3e2d854afed94f1`；包版本 0.8.8）

## 问题

用户 2026-11-05 指示升 rc.5（全局已是 rc.5），验收线 = 升级后无副作用才 commit & push。
先纠正前提：**升 pin 不解决启动速度**——启动 8s 里 4.7s 是本包 tsc/tsdown/npm pack，3.3s 是服务启动；
rc.2..rc.5 的 19 个提交没有启动性能项。升级价值 = 追平上游，不是加速。

上游 delta：19 commits / 667 files / +6097 −1091（client 194、snapshots/web 71、experimental 49、
llm 42、apps/web 27、session 21）。本包 import 的 subagent 与 experimental agent-team 包 `src/index.ts`
未变；client/session/api 包内部有改动，靠 typecheck + test 重校。

## 方案（单合并事务）

1. **先修基线红**（与升级无关的既有缺陷）：`replay-smoke` 从 host bundle 取 `presenceFromEvents`（bundle
   不含该纯函数）→ 改从 tsc 纯模块 `lib/types/lib/presence.js` 导入；fixture 的 skill catalog 漂移
   （`notes-consistency-audit` 加入后未刷新）→ `--refresh` 接受会话/sidecar 漂移。commit `ccd2b7f`。
2. **先按 `release.md` 跑 sync-dsh 事务**：install 2m05s、vendor build 39s、test、release-smoke（rc.5）
   全过；但在 ⑤ verify 被 4 个"现在时文档 + 安装手册"的 pin 漂移拦下（pin-currency ×3 / dist-manual ×1），
   事务按设计回滚原 HEAD 与簿记。
3. **改走 rc.2 先例的手动单合并事务**：checkout → `pnpm install` → vendor build → 文档/簿记/模板/手册
   同 diff → `release --prepare` → `verify` → `release --verify`。

## 决定

- 基座升 rc.5；兼容矩阵加列（5 列）；包版本 **0.8.8**——README 随包，pin 基线声明变了，属内容变更，
  按"改内容必 bump"升 patch。
- **安装手册模板改为从 `pin.mjs` 注入基线**（`expectedTag` 此前传入却硬编码，导致 dist-manual 必红）。
- `market-index.staged.json` 同步 0.8.8（requiresPublish 保持 true）。

## 输掉的方案

- **同版本 0.8.7 + `--force` 重导**：README 随包内容已变，违反"改内容必 bump"；0.8.8 尚未发布，
  重导一次可以，但不能把同一个版本号重打成不同字节。
- **保留 README 旧 pin 字面量、等下一轮**：`pin-currency` 就是为这种漂移设的门；留着就是把已知红推给别人。
- **删 `_dist/release-manifest.json` 让 dist-freshness SKIP**：拿掉记录换绿，不是修。
- **把 replay 基线红当升级副作用**：它是升级前就红的既有缺陷；先修它，升级的"无副作用"才有归因基线。

## 验收（全部实跑，2026-11-05）

- **sync-dsh 事务红证**：`pin-currency` README/external-research/旧 Note 三处 + `dist-manual` 一处；
  回滚成功（vendor 回 `687f282e`，簿记一致）。这正是手动路径要处理的四项。
- **手动事务后**：`pnpm verify` ALL PASS（`pin-currency ×7` / `dist-manual` / `vendor-pin rc.5` /
  `pack-compat ×5` / `pin-bookkeeping`）。
- `pnpm test`：**142 files / 1122 tests** 全过（基线红时是 4 failed，且伴随 vitest worker 超时——
  那次跑跨了机器休眠，属假红；重跑 4 个 spec 5.57s 全过）。
- `pnpm typecheck`：通过（pack 两面 + tests 三面）。
- `pnpm release --verify`：verify / test / release-smoke（0.8.8 tarball）/ company-entry-smoke /
  client-load-smoke / preset-smoke / present-catalog-smoke **全绿**。
- 手册：版本 0.8.8、基线 `dsh-v0.2.1-rc.5`、与模板同源。
- 浏览器面：dev 观察窗 boot（含 0.8.8 tarball 安装）**9.85s**；`cdp-probe` **9 页签**全开、零
  `tabFailures`、console/exceptions 零。browser-use 插件已随 rc.5 兼容启用，本场 boot 未见报错。

## 实施实况

- vendor 面：`git checkout b830ec95` → `pnpm install`（2m05s）→ vendor `pnpm run build`
  （9/9，39s，333 client artifacts）→ vendor 工作树零改动。
- 消费面：`pin.mjs` / `AGENTS.md` / `compat-tags.json` / site README 兼容段 / `docs/reference/external-research.md` /
  旧 Note 的 pin 字面量（标历史）；`tools/lib/install-manual.mjs`（基线注入）；`market-index.staged.json`。
- 回滚边界（sync-dsh 实测）：只恢复 HEAD/簿记/lockfile，**不恢复依赖与构建产物**；手动路径随后按
  rc.5 重装重建，未留下 rc.2/rc.5 混装。

## 风险 / 遗留

- **browser-use 两插件**（此前因 rc.5 要求被 DSH 自动禁用）升级后会启用；启动耗时与 boot 行为需观察。
- **货架过账阻断**：外部研究树未见当轮 `_dist/plugin-inventory` 快照；按 vendor `packages/experimental`
  清单核对，本包消费面（agent-team 三行）无新增/退役。
- `_dist` 0.8.8 **未发布**（staged 标记 `requiresPublish: true`）；发布按 `publish-handoff` 另行处理。
