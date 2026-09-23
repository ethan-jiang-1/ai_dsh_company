# 2026-09-23 · R5a P1.1 窄研究：无 key replay harness 机制三问（已答，含跑通证据）

> 性质：R5a 门禁与发布的先行研究（roadmap R5a 行"先窄研究再落"；readiness §9 P1.1）。
> 判据：给出"一条最小场景的可执行命令，今天就跑得动"——**已达成，见 §4**。
> 机制出处全部钉到 vendor 树（钉住 tag dsh-v0.1.5-rc.2）的具体文件。

## 0. 一页结论

| 问题 | 答案 | 出处 |
|---|---|---|
| ① 外部 pack 的 bundle 行怎么进场景组合 | shipped profile + `--patch` 叠层链；场景自己的 `cordis.yml` 是 patch 数组，**裸包名由 `materializeProfilePatch` 从 patch 文件位置解析并符号链接进临时 cwd 的 `.dsh/profiles/node_modules/`**（"mirrors dsh plugin"） | `session-snapshot/src/launcher.ts:416-441`、`snapshots/session/headless.snapshot.ts`（patchSources 链） |
| ② 最小归一化字段集 | 会话侧 token：`{{cwd}}`（含多种路径拼写）/ `{{system}}` / `{{tools}}`（后两者进 sidecar）；身份侧：`redactSessionSnapshotIds` + `stabilizeFixtureMessageIds`；信封字段（seq/time）由 `omitFixtureEnvelope` 剔除。`{{clock}}`/`{{date}}` **只在 web lane**（scaffold 的日期正则） | `normalize.ts:109-298`、`identity.ts`、`apps/web/tests/scaffold.ts:1422-1425` |
| ③ web lane 的 `ui.expected.md` 谁采集 | `apps/web/tests/*.snapshot.ts` + 共享 `scaffold.ts`：playwright 打真页面 → `ariaSnapshot`（accessibility tree）→ 日期/时钟正则归一 → 提交为 `ui.expected.md`；web lane 在 **lib 模式**（`DSH_EXAMPLE_MODE=lib`）才进 snapshot 配置（要已构建的 client bundles） | `vitest.snapshot.config.ts`（include 条件）、`apps/web/tests/scaffold.ts` |

## 1. 机制 ①：组合怎么拼（对我们最重要）

被测进程**永远**经 `dsh` CLI 起：`bin.ts --profile <shipped> --patch <materialized-1> --patch <materialized-2> … <task>`。

- **patch 链**（headless 驱动实测）：base 组合的 `cordis.yml` → 场景组合的 `cordis.yml`（replay 时换成 `cordis.snapshot.yml`）→ base 的 `model.cordis.yml`。patch 语法 = 我们熟悉的 `- id:` 替换 / `- insert:` 新增数组（`@deepseek-ai/cordis-plugin-include` 的 `entryListSchema`）。
- **`materializeProfilePatch(source, cwd, targetDir, index)`**（launcher.ts:416）：解析 patch → 对每个条目 `name`：
  - **裸包名**（如 `dsh-company-pack`、`@deepseek-ai/dsh-persona`）：`createRequire(patch文件路径).resolve.paths()` 找到真实目录（从 **patch 所在位置**解析——在我们 repo 里就是根 node_modules 的 workspace 链接）→ **符号链接进 `<临时cwd>/.dsh/profiles/node_modules/<包名>`**（win32 用 junction）。这正是"dsh plugin add 的镜像"，但保留裸名与包来源。
  - `./`/`../` 相对名 → 绝对 file URL。
  - 物化后的 patch 写进 `<cwd>/.snapshot-patches/<i>-<name>` 再传给 `--patch`。
- **`cordis.yml` vs `cordis.snapshot.yml` 的分工**（agent-instructions 场景实例）：
  - live（录制）：设真模型（deepseek-official / v4-pro）、persistence `zstd`；
  - snapshot（重放）：**`dsh-llm-deepseek` 置 `disabled: true`** + **insert `@deepseek-ai/dsh-llm-replay`**（把录的 provider/model id 映射成重放服务）+ persistence `compression: none`（明文 JSONL 好比对）。
- **replay 环境变量**（headless 驱动传给子进程）：`DSH_SNAPSHOT=replay`、`DSH_SNAPSHOT_PROVIDER/MODEL`（录的模型 id）、`DSH_SNAPSHOT_FILE`（重放输入 fixture 路径）、`DSH_SNAPSHOT_CHILD_FILES`（子会话 fixture，**多会话/teammate 场景有现成机制**）、可选 `DSH_SNAPSHOT_OVERRIDE`（replay.override.json）。
- **家与 cwd**：launcher 设 `DSH_HOME=<临时cwd>/.dsh`、`DSH_AGENTS_HOME=<临时cwd>/.agents`——会话落 `<cwd>/.dsh/sessions`，驱动从那里收数（headless 驱动 `persistedSessions()`）。

⇒ **我们的 pack 进组合零发明**：场景目录放一个 `cordis.yml`，内容就是把 `dev/company.overlay.yml` 的 insert 行（agent-presets roots、team 两包、persona 等）场景化，裸包名交给 materializeProfilePatch 链接——前提是**从我们 repo 的根 node_modules 能解析到这些包**（workspace 链接在，R1 实证过这条解析路）。

## 2. 机制 ②：归一化（会话侧 + UI 侧分离）

- **会话 fixture 是归一化不动点**（snapshots/AGENTS.md：typed relationship-preserving tokens；不许因"像标识符"乱涂用户/工具文本）。
- 生产线（headless 驱动 `writeSessionFixtures`）：`tokenizeSessionFixtureCwd` → `prepareSessionSnapshotFixtureForComparison`（来自 llm-replay 包）→ `scrubSessionSnapshot` → `redactSessionSnapshotIds` → `stabilizeFixtureMessageIds`。
- 比对线：`normalizeSessionSnapshots(logs, ctx)`，`ctx = { sessionIds, cwd }`（从各日志 header 提取）。
- token 清单（normalize.ts 实测只有三个）：`{{cwd}}`（`cwdSpellings` 处理绝对/相对多种拼写）、`{{system}}`、`{{tools}}`——system prompt 与 tool schemas **离开 fixture 进 sidecar**（`system-prompt.expected.md` / `tool-schemas.expected.json`，按 header class 唯一 owner）。
- `{{clock}}`/`{{date}}`：**web lane 的 scaffold 专属**（scaffold.ts:1422-1425 的四条日期/时钟正则），会话侧无此 token——readiness §2.3 的两问（绝对路径 cwd、ui 占位符）都有着落。
- **我们 r3 归档的兼容性**：`snapshots/r3-delegation/sessions/lead.jsonl` 已是明文 v3 JSONL（vendor 重放同格式）；`agentPreset: ceo` 在 header——P1.2 用上面生产线跑一遍即可得到归一化副本。

## 3. 机制 ③：web lane 与 `ui.expected.md`

- 驱动文件：`apps/web/tests/*.snapshot.ts`（lib 模式 include）+ `apps/web/tests/scaffold.ts` 共享脚手架（含 playwright 起 browser、`ariaSnapshot` 采集、`{{clock}}` 归一、fixture inventory 断言）。
- ⚠ **对 P1.3（委派卡端到端）**：ariaSnapshot = accessibility tree（role/name/text，无 `data-*`）——判据口径必须落在可访问名/文本（readiness §9 P1.3 已预警，本研究证实：采集入口就是 scaffold 的 ariaSnapshot 管线）。
- web lane 起进程同样经 CLI（OS 分配端口——headless 驱动有 `listen(0)` 的机械检查），观察窗/观察方式与我们的 smoke 脚本同构。

## 4. 可执行命令（判据：今天就跑得动 ✅ 已实测）

```sh
cd vendor/dsh && ./node_modules/.bin/vitest run --config vitest.snapshot.config.ts -t "agent-instructions"
```

实测（2026-09-23 09:08，本机、无 key、无浏览器）：

```
✓ replays agent-instructions through dsh --profile headless  1846ms
 Test Files  1 passed | 3 skipped (4)
```

⚠ 操作细节：**别用 `pnpm run test:snapshot`**——pnpm 的 run 包装器会先做 deps-status 检查并触发 `pnpm install`（在 vendor 树里失败）；直接调 `./node_modules/.bin/vitest` 绕开。跑 vendor 的测试脚本属只读允许面（AGENTS §vendor 铁律 1）。

## 5. P1.2 落地路径（下一步，不新增机制）

1. 场景目录 `snapshots/r3-delegation/` 加：`snapshot.yml`（`profile` 必须选 shipped 名——**见 §6 遗留**；`composition: wochen-ceo`；`header.class`；`workspace.final: true` 若动盘）+ 场景 `cordis.yml`（live）与 `cordis.snapshot.yml`（replay：disable 真 LLM + insert llm-replay + compression none）——insert 行从 `dev/company.overlay.yml` 场景化。
2. 归一化副本：用一方库生产线（import `@deepseek-ai/dsh-session-snapshot`，workspace 依赖可用）把 r3 的 lead + vp-eng child 处理成 fixture（`session.v3.jsonl` + `session.1.v3.jsonl` + sidecars）；原始录制保留。
3. 入口 `scripts/replay-smoke.mjs`：spawn `vendor/dsh/apps/cli/src/bin.ts` + patch 链 + `DSH_SNAPSHOT_*` env，比对归一化产物（**不进 `pnpm test`**，第三档——readiness P1.4 已有分层守卫计划）。
4. 判据（绿/红）：零 diff 通过 + 无 key；临时删 `presets/ceo/agent.cordis.yml` 的 `vp_eng` 行 → 重放红且点名 `vp_eng`（readiness P1.2 原文）。

## 6. 遗留与风险（P1.2 开工先答）

- **profile 选择**：r3-delegation 是 **web 会话**（preset 只在 web-app 组合挂载，guides/60 §2 第 3.6 层）。两条路：(a) `profile: web` + 我们的 patch（web lane 形状，要构建 client bundles——R0 引导已建）；(b) `profile: headless` + patch insert `session-controller`/web-app 行（组合可行性未证）。**倾向 (a)**：与录制时形状一致，且 P1.3 的 UI 断言本来就要 web lane。P1.2 第一件事就是拿最小 patch 验证 (a) 挂上 ceo preset + team。
- pnpm run 包装器的 deps-status 陷阱同样适用于我们未来的 `replay-smoke`（若用 pnpm script 包装）——直接调 vitest/node 二进制。
- r3 fixture 的 `request/header` 里 team 版控制名与 `{{tools}}` sidecar 的关系：team shadow 的工具目录会整体进 tool-schemas sidecar，比对按 class 归口——P1.2 实测确认无假阳性。
