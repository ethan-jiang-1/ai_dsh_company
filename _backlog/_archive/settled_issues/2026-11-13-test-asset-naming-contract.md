---
status: 已结
opened: 2026-11-13
---

# 推敲：测试资产命名契约与目标树（文件名即类型声明）

> 立卡：2026-11-13 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> 审查：agent — 两阶段各自实跑（test/typecheck/lint/dup/ratchet/verify + 门禁三条负例）；语义审对授权原文（「命名长期受益」「做对最重要」）逐条核过
>
> **结论/去向**：note — [2026-11-13-test-asset-naming.md](../../../notes/implemented/2026-11-13-test-asset-naming.md)
>
> **授权边界**：用户 2026-11-13 点出原则「命名是长期受益的事：人和 agent 只看文件名就知道是什么测试资产、不费劲」，
> 并明确「策略调整期，把事情做对、长期做对比快更重要」。**卡上的方案不授予实施权限**：对 repo 的修改须用户在本卡点名开工。

## 问题与期望结果

**问题**：文件名是资产的**类型声明**，但本仓有两层命名债：

1. **文件名在撒谎**：名字说的类型/ lane 与它实际所在位置、跑法不一致（下表）。
2. **目录不是面**：`tests/harness/` 是一个 meta 桶——里面同时装仓库合同、tools 判据、会话日志、证据判据、UI 金样；
   名字还与 DSH 的共享夹具文件 DSH 的 tests/harness.ts 同名不同义。人/agent 无法"只看目录"知道这一层测什么。

**期望结果**：三个不变量各归一个家，且由机械门禁守：

> **文件名 = 资产类型**（spec / smoke / probe / audit / gate / tool / lane / fixture）；
> **目录 = 被测面或 lane**；**注册表 = 元数据**（kind / lane / ciSafe / 失败类 / 手动理由）。
> 一个事实只住一个轴：名字不编码失败类或 owner，目录不编码资产类型（类型只由后缀说）。

## 审计（2026-11-13 实测，只读）

| 现状 | 问题 | 证据 |
|---|---|---|
| snapshots/visual/company-shell/ui.golden.json（旧名）、checks/gates/ui-golden-freshness.mjs（旧名）、tools/lib/ui-golden.mjs（旧名）、tests/harness/ui/ui-golden.spec.ts（旧位置） + `--golden`/`--refresh-golden` | 「golden」与「expected」并存；DSH 明文禁文件名含 golden（`check-expected-filenames.sh`），且同仓 `workspace.expected/`、`system-prompt.expected.md` 已用 expected | 4 个活文件 + 2 个 flag + 文档引用 |
| checks/smoke/refactor-drift-oracle.mjs（旧名） | 住 smoke 目录却不是冒烟（需成对调用的重构工具） | kind = tool；无自动 lane |
| checks/smoke/fast.mjs（旧名）、checks/smoke/all-keyless.mjs（旧名） | 是 **runner**，名字却像资产 | 两者只调度，不证明行为 |
| probes/team/quality-loop-audit.mjs（旧名） | 是**只读审计**（keyless、出报告），住在 probes 调试面 | 头注：只读盘与会话日志，不调模型 |
| probes/browser-visual/cultivation-ux-walkthrough.mjs（旧名）、`cultivation-ux-scenarios.mjs`、`cultivation-main-e2e.mjs` | 后缀不在资产词表里——**逃过 `script-triggers` 门禁**（只认 `-(smoke\|probe\|audit\|check\|eval)`） | 三个都不是 `-probe` |
| `probes/team/read-barrier/index.mjs` | 不是探针：是 probe overlay 加载的实验监听器（fixture）；被 census 误算成 69 个探针之一 | 头注 "Experiment-only listener loaded by the concurrency probe overlay" |
| `tests/harness/{repo,tools,session,evidence,contract,ui}` | 6 个不同主题挤在一个 meta 桶里（35/16/11/7/5/3 个 spec）；目录名不说明测什么 | `find tests/harness/*/ -name '*.spec.ts'` |

## 目标树（先定后搬）

```
tests/
  host/ client/ lib/ content/ presets/   被测面（现有）
  repo/        ← tests/harness/repo     仓库结构/导航/发布/包形状等仓库合同
  contract/    ← tests/harness/contract 引擎合同与真值表
  tools/       ← tests/harness/tools    tools/lib 纯逻辑判据
  session/     ← tests/harness/session  会话日志/诊断/证据判据
  evidence/    ← tests/harness/evidence 协作与证据判据
  ui/          ← tests/harness/ui       金样/页签目录（Phase 2 后叫 expected）
  support/ fixtures/                    共享代码夹具 / 带 provenance 的数据夹具（现有）
```

**为什么先搬树、后改名**：同一个文件只搬一次（`ui-golden.spec.ts` 先到 tests/ui/（目标），再改名为 ui-expected.spec.ts）；
门禁在**最终树**上落地，避免为过渡态写例外。两阶段各自可停、可回滚。

- **Phase 1（先树）**：`git mv` 六个目录 → 新面；更新 `tests/README.md`「四区」表述与链接、`tsconfig` glob（应无需改）、
  文档里的路径引用；全链 verify/test。**停在这里也算交付**：目錄名不再撒谎。
- **Phase 2（后名）**：下节契约 + 改名清单 + `naming-contract` 门禁 + census/注册表更新。**停在这里也算交付**。

## 命名契约（Phase 2）

| 目录 | 文件名语法 | 含义 |
|---|---|---|
| `tests/<face>/` | `<subject>.spec.ts` | keyless 回归；目录 = 被测面 |
| `checks/smoke/` | `<subject>-smoke.mjs` | 真入口冒烟（真进程/真页面/真模型，按注册表 lane） |
| `checks/smoke/` | `<lane>-lane.mjs` | lane runner（只调度，不证明行为） |
| `probes/<domain>/` | `<subject>-probe.mjs` | 调试探针（手动、按域） |
| `checks/audit/` | `<subject>-(audit\|check\|eval\|ratchet).mjs` | 只读判据/报告 |
| `checks/gates/` | `<rule>.mjs` | 结构门禁（名字即规则） |
| `tools/` | `<verb>-<subject>.mjs` | 工具入口 |
| `tools/lib/` | `<subject>.mjs` | 纯逻辑（无副作用） |

**禁词**（文件名；归档历史与 vendor 除外）：`golden`、`util`、`misc`、`helper`、`common`、`tmp`/`temp`、`new`/`old`、`copy`/`backup`。
`index` 只允许作为模块/fixture 入口，**不得作为资产名**（资产必须有主语）。
**一致性规则**：目录决定 lane，后缀必须与目录一致；冲突 = 红（防"名字撒谎"）。

## 改名清单（Phase 2，纯改名/搬移，不改行为）

1. **golden → expected**：`ui.golden.json` → `ui.expected.json`；`ui-golden-freshness.mjs` → `ui-expected-freshness.mjs`；
   `ui-golden.mjs` → `ui-expected.mjs`；`ui-golden.spec.ts` → tests/ui/ui-expected.spec.ts（目标）；
   `--golden`/`--refresh-golden` → `--expected`/`--refresh-expected`。归档 BUG-048 / 2026-10-28 Note 不动。
2. **runner 正名**：`fast.mjs` → `fast-lane.mjs`；`all-keyless.mjs` → `keyless-lane.mjs`（package.json、CI、pre-push、文档同步）。
3. **工具出 smoke**：checks/smoke/refactor-drift-oracle.mjs（旧名） → tools/refactor-drift.mjs（目标）（保留头注；从 lane 注册表移除）。
4. **审计归位**：probes/team/quality-loop-audit.mjs（旧名） → checks/audit/quality-loop-audit.mjs（目标）。
5. **探针正名**：三个浏览器探针 → `cultivation-ux-walkthrough-probe.mjs`、`cultivation-ux-scenarios-probe.mjs`、
   `cultivation-main-e2e-probe.mjs`（改名后自动落入 `script-triggers` 覆盖）。
6. **fixture 摘出**：`probes/team/read-barrier/` 不进探针注册表与 census；`index.mjs` 保留为 fixture 入口
   （或改名 `read-barrier-fixture.mjs`），并在头注写明由谁加载。

## 门禁（Phase 2）：`naming-contract`

- 目录 × 后缀封闭集（上表）；违规点名「文件 → 期望后缀」。
- 禁词表（大小写不敏感，归档与 vendor 除外）。
- **资产名必须出现在注册表/census**（冒烟/探针），非资产不得混入（`index` 之类）。
- 与 `script-triggers` 联动：所有资产的后缀都落在 `-(smoke|probe|audit|check|eval|lane)` 覆盖内，不再有逃逸后缀。
- **负例三条**：① checks/smoke/foo-oracle.mjs（负例假路径） → 红；② probes/bar-e2e.mjs（负例假路径） → 红；③ 改名成 `golden-*.mjs` → 红。

## 落地进度

| 阶段 | 状态 | 证据 |
|---|---|---|
| Phase 1 目标树（harness 拆分） | **已交付 2026-11-13** | [Note 验证表](../../../notes/implemented/2026-11-13-test-asset-naming.md)：77 文件迁移、2017 tests、verify 全绿、nav 改名红→绿 |
| Phase 2 改名 + 门禁 | **已交付 2026-11-13** | [Note 验证表](../../../notes/implemented/2026-11-13-test-asset-naming.md)：9 组改名、naming-contract 三条负例红→绿、census 31/67、基线更新 |

## 验收标准

1. **Phase 1**：`tests/harness/` 不存在；六个面各就位；`pnpm verify` + `pnpm test` + `pnpm typecheck` 全绿；
   残留引用（`grep tests/harness`，归档除外）为 0。
2. **Phase 2**：`grep -ri golden`（非 vendor、非归档）为 0；`checks/smoke/` 只剩 `*-smoke.mjs` 与 `*-lane.mjs`；
   `probes/**` 只剩 `*-probe.mjs`（fixture 入口已登记为例外）；census 重生成且探针数修正（`index.mjs` 移出）。
3. `naming-contract` 三条负例各一条实跑原话；还原后 `pnpm verify` 全绿。
4. `pnpm test` / `typecheck` / `lint` / `dup` / `coverage-ratchet` 全绿；每个 Phase 同 diff 一篇 Note
   （含输掉的方案：为什么不随包就近、为什么不照抄 DSH 后缀分层）。

## 成本、风险与不做

- **成本**：Phase 1 约 0.5–1 天；Phase 2 约 1 天。两个 commit，各自可回滚。
- **风险**：路径引用漏改 → `verify`（md-links/bare-path/INDEX）+ `pnpm test` 抓；每阶段末全链实跑。
- **不做**：
  - 不把 `tests/` 改成随包就近（单包拓扑；类型面/覆盖/layering 都围绕 `tests/**`）。
  - 不照抄 DSH 的 `*.e2e.ts` 后缀分层（我们没有对应 vitest 车道；真入口在 `checks/smoke/`）。
  - **不新增 `harness` / `misc` / `common` 这类 meta 桶**：目录必须是被测面或明确的仓库面。
  - 不为过渡态给门禁写例外（门禁在最终树上落地）。

## 下一步（给人）

回一句 **「本卡开工」**，我按 Phase 1（先树）→ Phase 2（后名+门禁）交付，每阶段给红/绿原话、可单独停。
**在此之前不动 repo 实现面。**
