---
status: 已结
opened: 2026-11-13
---

# 推敲：测试资产从「堆」变成「自校正系统」（B → C → A 落地）

> 立卡：2026-11-13 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> 审查：agent — 三件各自按卡上负例验收并实跑；语义审对授权原文（「按卡落地、静默自主、长期正确」）逐条核过；未做用户验收（用户已在 2026-11-13 定性时接受方向）
>
> **结论/去向**：note — [2026-11-13-test-asset-loop.md](../../../notes/implemented/2026-11-13-test-asset-loop.md)（B/C/A 三件已交付）
>
> **授权边界**：本卡由用户 2026-11-13「做正确的事情，只要是长期正确的、不短视」转化而来。
> **卡上的方案不授予实施权限**：对 repo 的修改是下一阶段，须用户在本卡点名开工或另有已批 RFC。
> 范围外不改：产品行为、`docs/` 合同语义、preset/content 内容、`vendor/`。

## 问题与期望结果

**问题**：我们的测试资产不是"太少"，是**没有任何东西保证它们被运行、被选中、被兜底**。
2026-10-04 已经吸收过一轮 DSH 测试策略（`docs/testing.md §1.1`「后缀即层」、九层边界、九条纪律都是那轮产物），
但只落在**散文层**——DSH 真正管用的四类机器（选中 / 下限 / 必跑 / 账本）一件没建。
结果是每次出事都在补产品侧的测试资产，而不是修那条产出资产的传送带。

**期望结果**：把四类机制落成三个可单独回滚的交付（B → C → A）：

1. **B 环外必跑回路**：资产有 lane；按改动面自动跑对应真入口检查；每周全量 keyless 扫一遍。
2. **C 执行下限与决策账本**：覆盖率变成每次 push 的门（只升不降）；失败类有映射表；"没验的部分"必须写出来。
3. **A 资产盘子与出生登记**：盘子由生成物提供；新资产出生必须声明 lane 与失败类。

完成后，"绿"才重新等于"跑过 + 验过"，而不是"结构一致"。

## 为什么现在做（证据，2026-11-13 实测）

- **资产存在但不跑**：33 个冒烟里只有 **6** 个在 push 时自动跑；69 个探针 **0** 个自动跑；其余只靠头注「何时跑」的散文契约。
- **没有执行下限**：188 个被插桩文件里，只有 **10** 个有覆盖率阈值，且 `test:coverage` 不在 pre-push/CI——低于阈值不挡任何提交；**3** 个文件 0%（其中 `carrier-registry` 是写入口登记表）。
- **真入口证据不在 required lane**：CI 只跑 `pnpm verify`（结构门）。发布验收曾静默红（`9f74ce71`：`present-catalog-smoke` 因 plain-node TS 语法红，"从未被当成发布阻塞"）。
- **返工证据**：近 200 个 commit 里碰 `tests/` 的 **112** 个、碰 `packages/company-pack/src/` 的 **70** 个——测试面是比源码更高频的返工面。
- **按 DSH 插件五台阶自评**：导出守卫 / 行为 spec / 注册生命周期（client 面）/ REAL composition 都有，**台阶 5「组装转录」缺位、台阶 4 不在必需 lane**——这正是"文案改动只能靠真模型冒烟"和"每次收口临时决定跑哪几条"的根因。

研究依据（含一手源码核对与数字复跑命令）：
[题名页](../research/dsh-test-strategy/README.md) ·
[对账](../research/dsh-test-strategy/2026-11-13-gap-audit.md) ·
[落地方案](../research/dsh-test-strategy/2026-11-13-borrow-roadmap.md) ·
[一手核对](../research/dsh-test-strategy/2026-11-13-vendor-source-verification.md)

## 方案（三件，顺序 B → C → A，可单独停）

### B 环外必跑回路（约 2 天）

- **载体**：新增 lane 注册表（checks/lanes/lanes.mjs，计划）作为唯一家；checks/pre-push-surfaces.mjs（计划）读它做按面触发；
  每周 runner（all-keyless，计划）读同一份清单；tests/repo/asset-lanes.spec.ts（计划）机械校验「每个冒烟都已登记」。
- **形态**：
  - lane 注册表字段 = name / kind（classic｜browser｜model）/ lanes（fast｜surface｜weekly）/ ciSafe / 理由；
    **没有 lanes 的条目必须写清为什么是手动**（不允许"忘了登记"）。
  - pre-push 的变更范围用 hook 自带的 `<remote sha>..<local sha>`（不猜 base、不 fetch）；规则首版四条：
    `src/client/**` → client-load-smoke；`presets/**` → preset-smoke；`content/**` → replay-smoke；
    `src/host/run-bundle/**` → company-root-process-smoke。
  - 每周 job 在 `fresh-clone.yml` 的 macOS setup 之后跑全部 classic keyless；skip 数必须等于注册表里"应跑"的条数，
    **对不上即红**（防静默移除）。
- **验收（负例）**：① 改一个 client 文件、不跑 client-load-smoke 直接 push → 被拒绝且打印「因为改了 X，要求跑 Y」；
  ② 新增一个 smoke 不登记 → `pnpm verify` 红；③ 从注册表删一条但文件还在 → 红。
- **风险**：首周每周 job 可能因环境差异红——这是**诊断**不是失败，按实际结果要么修要么把 ciSafe 标 false 并写理由。
- **不借**：不做 `change-scope` 那样的完整 JSON 报告（本仓 hook 自带两枚 SHA，够用）；不把慢/带 key 的资产塞进 fast。

### C 执行下限与决策账本（约 1.5 天）

- **载体**：`pnpm test:coverage` 实测 **24s**（与 `pnpm test` 同量级），所以 **pre-push 把 `pnpm test` 换成 `pnpm test:coverage`**；
  新增覆盖率基线（tests/support/coverage-baseline.json，计划）+ 棘轮门（checks/audit/coverage-ratchet.mjs，计划）；
  失败类表进 [tests/README.md](../../../tests/README.md)；账本三列进 `close-out-definition` skill 与 Note 验证表。
- **形态**：① 任一文件不得低于基线；② 新出现的插桩文件 ≥80% statements / 70% branches，否则显式豁免（owner + 移除条件）；
  ③ 基线只升不降；④ 12 类失败类表每行点名本仓真实载体，写不出的标"本仓无载体"。
- **验收（负例）**：① 把某文件改到低于基线 → 红；恢复 → 绿；② 新加一个 0% 的 `src` 文件 → 红；③ 手改基线调低 → 红；
  ④ 拿最近 3 个真实 commit 回测失败类表，每个能落到 1–2 行。
- **风险**：基线把坏值冻结 → 只升不降 + 每季度用 A 的盘子复核 top-10 低覆盖文件；`docs/testing.md` 现 70/75 行，只够 5 行，超出先迁去 `tests/README.md`。
- **不做**：不设 per-file 100% 一步到位（借棘轮，不借数字）；不做"检查 Note 里有没有某节"的重门禁（已被
  [rfc-tdd-loop Note](../../../notes/archived/2026-10-05-rfc-tdd-loop.md) 证伪为仪式性合规）。

### A 资产盘子与出生登记（约 1.5 天）

- **载体**：census 生成器（tools/test-census.mjs，计划）→ 生成物 tests/CENSUS.generated.md（计划）；
  扩 `script-triggers` 门禁：新 `.mjs` 资产头注必须带「失败类」与「lane」两行，且 lane 必须能在真实 runner 清单里找到。
- **形态**：census 每行 = 路径 / kind / lane / 失败类 / 最后修改日；尾部汇总。生成物禁止手改，
  由门禁校验与盘上一致（同 `checks/INDEX.generated.md` 的形状）。
- **验收（负例）**：① 新资产不写 lane 或失败类 → 红；② 写 `lane: fast` 但不在 fast 清单 → 红；
  ③ 加一个 `.mjs` 不重生成 census → 红。
- **风险**：一次性回填 102 个资产（102 = 33 冒烟 + 69 探针）容易做成"填了就行"——只对**新生效**，存量按 census 报数逐轮收敛。

## 顺序、依赖与停止条件

| 序 | 交付 | 依赖 | 停在哪也算交付 |
|---|---|---|---|
| 1 | B | 无 | 注册表 + 按面 pre-push 上树、每周 job 一条；资产从"从不跑"变"最多旧 7 天" |
| 2 | C | B 的部分清单（可独立） | 覆盖率门进 pre-push + 基线门；失败类表 12 行 |
| 3 | A | B/C 的 lane 清单 | census 生成物 + 出生登记门（仅新生效） |

**停止条件**：① 预算 = 每件 ≤ 2 个工作日，超时先收口报告；② 某件验收无法变绿（机制证伪）→ 停并报阻塞与证据，不硬闯；
③ 用户中途改范围 → 回本卡重裁，不自行扩围。

## 验收标准

1. **B**：负例三条（改 client 不跑 smoke 被拒 / 未登记 smoke 红 / 删登记红）各一条实跑原话；每周 job 的 skip 数与注册表一致。
2. **C**：覆盖率负例三条 + 基线只升不降；失败类表 12 行每行有本仓载体或显式"无"；`test:coverage` 作为 pre-push 一步的实测墙钟。
3. **A**：出生登记负例三条；census 与盘上一致；存量未登记数（= 102）作为基线，只减不增。
4. **全链**：`pnpm verify` + `pnpm test` 绿；每件同 diff 一篇 Note（红/绿原话 + 输掉的方案）；
   每件可单独回滚（新增门/脚本/CI job，不改产品行为）。

## 度量（怎么知道在变好）

| 指标 | 今天 | 目标 | 来源 |
|---|---|---|---|
| 环外资产最长陈旧天数 | 未知（无记录） | ≤ 7 | 每周 runner |
| 有执行下限的插桩文件 | 10 / 188 | 100%（含显式豁免） | 覆盖率基线 |
| 被 required lane 覆盖的失败类 | 未按失败类记账 | 12 / 12（分批） | 失败类表 + 规则表 |
| 测试类 commit 里症状修复占比 | 最近 6 个：3 机制 / 3 症状 | 持续下降 | git log 季度分类 |

**判据不是"测试变多"**：如果一年后用例翻倍但这四项没动，说明又白忙一轮。

## 不借（范围排除）

- per-file 100% 一步到位、2.7 万条用例、9 个必需 CI job、自托管矩阵、with-key 不设限——规模绑定 DSH 的预算，不搬。
- 任何"检查散文有没有某节"的门禁（空节即过，见 rfc-tdd-loop Note 的输掉的方案）。
- 手抄一份 lane 清单（第二份必漂）：lane 必须从注册表/真实 runner 读。
- 把回放当角色质量证据：回放证明"组装没变"，不证明"模型照做了"。

## 风险与回滚

- **push 变慢**：只在改 client/presets/content 面时 +2~30s；`test:coverage` 与 `test` 同量级，不额外加。
- **每周 job 首跑可能红**：环境差异是诊断信号；修环境或标 `ciSafe:false` + 理由，不删资产。
- **回滚**：三件都是新增脚本/门/CI 步骤，逐件 revert 即恢复；不改产品代码与合同语义。
- **误报风险**：按面规则漏面 → 每季度用 census 复核"从未被任何 lane 触发"的资产，规则表与 tests/README 同一个家。

## 落地进度

| 件 | 状态 | 证据 |
|---|---|---|
| B 环外必跑回路 | **已交付 2026-11-13** | [Note 验证表](../../../notes/implemented/2026-11-13-test-asset-loop.md)：空间完备负例红→绿、按面选面 dry-run、fast 6 条、全量 18 条、244 files/2008 tests |
| C 执行下限与决策账本 | **已交付 2026-11-13** | 同 Note：覆盖率棘轮进 pre-push（24s）、5 条显式空洞、回归/新文件/过期豁免三组红证、失败类表、账本三列进 skill |
| A 资产盘子与出生登记 | **已交付 2026-11-13** | 同 Note：census 生成物（32 冒烟/69 探针/71 门禁/246 spec）、探针登记、失败类判定（冒烟 0 未分类）、census 漂移红→绿 |

## 研究依据与相关卡

- 研究题：[dsh-test-strategy](../research/dsh-test-strategy/README.md)（题名页）。
- 同族研究：[test-asset-fence](../research/test-asset-fence/README.md)（环外腐烂）、
  [adversarial-shape-matrix](../research/adversarial-shape-matrix/README.md)（失败类从哪来）。
- 本卡与它们的分工：围栏卡解决"慢资产出环后的新鲜度"，矩阵卡解决"补哪类资产"，
  **本卡解决"资产怎么被选中、被兜底、被记账"**——三者不重叠。

## 下一步（给人）

你只需要回一句：**"本卡开工"**（我按 B → C → A 逐件交付、每件带红绿证据与 Note），
或指出要调整的范围/优先级。**在此之前不动 repo 实现面。**
