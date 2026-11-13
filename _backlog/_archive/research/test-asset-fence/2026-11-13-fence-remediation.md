---
topic: 测试资产围栏复核
intent: 把环外资产腐烂、驱动里的逻辑泄漏、门禁反证不常驻三类问题，转成更新/补充/淘汰清单与可执行的围栏规则；第二遍复核记录修正与反证条件
---

# 围栏修复：更新 / 补充 / 淘汰

> 事实底稿 = [材料一](2026-11-13-asset-inventory-and-health.md)；本文只做判断与排序。结论先行：**不要把慢资产拉回 `pnpm test`**——围栏本身是对的；要补的是「环外新鲜度回路」。第二遍复核后：一处建议降级（A2）、一处改首选路径（U2 用 `--refresh`）、一处候选收窄（A4）、一处第一版收窄（A1 只收 6 条）。

## 1. 诊断：围栏对了，但环外没有回路

`tests/repo/layering.spec.ts` 的出生注释写着用户的原始反馈：「这种测试如果是 regression 的话，跑得这样慢是完全受不了的。」围栏因此把子进程/浏览器/网络赶出 `tests/`，让 1997 个测试在 26s 内跑完。这一步是对的，不应该反向。

但「赶出去」只解决了**成本**，没解决**归属**。当前环外有 32 个 smoke、69 个 probe；它们的触发条件是头注里的一句话，没有任何东西定期问「它还活着吗」。实测 8 个便宜 keyless 资产：2 红 1 惰性（材料一 §4）。两条红都不是产品回归，是**资产腐烂**：

1. **负例空转**：`two-axis-gates-smoke` 的 mutation 停在旧语言，替换不命中，gate 没被改坏，smoke 的「必须红」自然失败。
2. **注入面漂移**：`replay-smoke` 的 headless 场景把技能目录录进了 fixture；技能一改，期望就过期，而静态新鲜度门禁按设计跳过 headless。

第二遍复核要修正一个说法：`replay-scene-liveness` 的头注**已经写明**它不跑 replay、不证明 `runnable` 真的绿（还记录了 2026-10-09 的同类事故）。所以第 2 条不是「新洞」，是**已知边界这次真的咬到了**；问题在于场景仍声明 `runnable`，而唯一会验绿的手动 smoke 没人跑。

第三条：**纯逻辑住在驱动里**。第二遍复核后，这条只剩一个明确案例：`tools/export-dist.mjs` 的 staging 编排。它的核心 `swapDirWithBackup` 已有快 spec；驱动本身是线性 `try/catch`，抽 plan 的收益低于成本（见 A2 降级）。`tools/release.mjs` 的 artifact 检查主要在 `release --check` 发布门里，也属发布工具，不急着下沉。

第四条：**门禁的反证不常驻**。71 个 gate 里，常驻负例 smoke 覆盖 7 个（`gates-negative` 5 + `two-axis` 2）；其余靠建门时的「负例留证」注释。注释证明「当时红过」，不证明「现在还能红」。但要说清楚：不是 64 个 gate 都没测试——`backlog-liveness` 等逻辑有 `tests/tools` 的快 spec；缺的是**可重跑的负例 smoke**，高风险面才值得补。

第五条（第二遍新增）：**预算叙事也漂了**。`.githooks/pre-push` 和 `.github/workflows/ci.yml` 的头注仍写 test ~1.3s / verify ~2s；实测 test 26.0s、verify 8.3s、typecheck 5.4s、lint 0.96s、dup 0.41s；分项冷测和 ~41s，热缓存 hook 29–35s（两次实测）。这不是要改 hook 的边界，是预算数字需要一次实测更新。

## 2. 围栏规则（建议写进 testing/README，不在本轮改）

1. **快层优先**：每个不变量先找 `pnpm test` 的 home；smoke 只证明快层证不了的接缝——真安装（tarball/profile）、真进程（多进程/lease/崩溃）、真浏览器（挂载/渲染）、真模型（行为/认证）。如果一条 smoke 是某个纯逻辑的唯一守卫，先补快层，再缩 smoke。
2. **唯一证明**：每条慢资产必须能一句话说出「快层为什么证不了它」。写不出 = 淘汰候选，不是「留着安心」。
3. **资格日期（只给没被 lane 覆盖的资产）**：快档 lane 每次跑 = 自动新鲜度，不用手写日期；手动/发布/认证档才记「最后实跑 YYYY-MM-DD + 结果」，过期就更新或归档。`snapshot.yml` 的「资格理由（日期）」是范式。
4. **预算是实测的**：快环 = `pnpm test` + `pnpm verify` + `pnpm typecheck` + `lint` + `dup` ≈ 41s（分项冷测；热缓存 hook 29–35s（两次实测））；`pnpm test` 单项 ≤ 30s（当前 26s，已接近；超了先抓 outlier，当前是 `company-client-composition` 8.4s）；便宜 smoke lane ≤ 10s；重资产只在发布/触发时跑；认证档只在验收要求时跑。**没有唯一证明的新 E2E 不立项；预算数字写进文档前先跑一次。**

## 3. 更新（修现有资产）

| # | 资产 | 动作 | 验收 |
|---|---|---|---|
| U1 | `tests/checks/two-axis-gates.test.mjs` | 两处 mutation 改成现行 canonical 文本（`Hardware-software product` 行 / `deliveryMode:` 字段），同步把 case 4 的期望文案改成 `缺「deliveryMode:」字段`；加**变异断言**：`changed !== original`，否则直接报「mutation 没命中」；共享助手放 `checks/lanes/lib/`，`gates-negative` 同用 | 真副本两绿；三个负例全红；还原全绿 |
| U2 | `snapshots/replay/foundation-workspace` | **先 `node checks/lanes/replay.e2e.mjs --refresh`**（headless authored 的内置无 key 刷新；workspace oracle 失败会拒绝），复跑确认绿，更新资格日期。若同一处再漂，再选冻结技能目录 / 归一化；若冻结在场景组合里不可行（不碰 vendor 的前提下），退路 = 把 `--refresh` 写进技能改动 checklist，接受「技能改 → replay 需刷新」为已知成本。**不要保持 `runnable` 的红**：刷不了就临时 `archived`（带日期理由），三态语义里 `archived` 就是「有输入但判据红」 | `replay-smoke` ALL PASS；`snapshot.yml` 声明与实测一致 |
| U3 | `checks/audit/candidate-scan-eval.mjs` | 标 `已耗（2026-11-13 语料移出本仓）`，或退役；若保留，写清重新启用条件 | `script-status` 绿；不再以 exit 2 冒充「常驻」 |
| U4 | `tests/client/company-client-composition.spec.ts` | 观察项，不现在动；若 test 阶段 > 30s，再拆 roster 或迁 `client-load-smoke` | 记录阈值，不设新门 |

## 4. 补充（补快层/补回路）

| # | 缺口 | 建议 | 为什么是快层 |
|---|---|---|---|
| A1 | 便宜 smoke 没有回路 | 新增 `smoke:fast`：**第一版 6 条稳定 keyless（~2.4s）**——workflow-contract / present-catalog / company-root-process / gates-negative / snapshot-motion / two-axis；`replay` 先留在自己的触发线上（3.9s，且 U2 未稳定前易因技能漂移红），稳定后再决定是否并入。**首选 pre-push**——`ci.yml` 不构建 vendor/test，cheap smokes 在干净环境跑不动；`fresh-clone` 每周档可作第二通道。先修 U1/U2 再加 | 2.4s 不是 E2E 成本；它补的是「环外没人看」 |
| A2 | `export-dist` staging 逻辑只在慢层 | **降级为可选**：核心 `swapDirWithBackup` 已有快 spec；驱动是线性 `try/catch`，抽 plan 的收益低于成本。只有同类失败复发（例如再次出现「旧 `_dist` 被删」）才做 `新建:tools/lib/export-dist-plan.mjs` + spec | 纯文件系统编排可注入 fake pack；但发布工具低频，先不动 |
| A3 | headless replay 无静态新鲜度 | 若 U2 的 `--refresh` 之后同一处再次漂移，扩 `replay-fixture-freshness`：对 headless 场景比对 session fixture 里的技能目录注入（或对 `.agents/skills` 做哈希） | 静态比对，秒级，不跑 replay |
| A4 | 门禁反证不常驻 | 只收「失败静默、逻辑未被 `tests/tools` 或现有 spec 盖住」的高风险 gate。当前确认候选 = `company-root-carriers`（安全面，只有一次性 `zz-probe-writer` 红证）；`notes-liveness`/`proposal-scheduled` 属流程形状，价值较低、按需。**`write-gate` 已有 `write-gate.spec`，移出候选** | 0.2s 级；比再写一套 gate 单测便宜 |
| A5 | 69 个 probe 无消费者图 | 做一次只读审计：每个 probe 被哪些 Note/卡/README 引用、最后实跑日期；无引用且无触发 = 淘汰候选 | 研究/维护动作，不是测试层 |

## 5. 淘汰（候选）

| # | 资产 | 判定 | 条件 |
|---|---|---|---|
| R1 | `candidate-scan-eval` | 淘汰/已耗 | 语料不在本仓；恢复语料时再启用 |
| R2 | `replay` headless 场景 | 若 U2 的 `--refresh` 仍不能稳定复绿，则转 `archived`（保留证据，不进回归） | 丧失唯一 runnable replay 是代价；先试 `--refresh` |
| R3 | 无消费者的 probe | 逐项审计后淘汰 | 需 A5 的消费者图；本轮不点名 |

**不建议淘汰**：`release-smoke`、`company-entry-smoke`、`multi-install`、`channel-matrix`、`upgrade-while-running`、`client-load`、`preset`、`ui-scene`、`client-error-chain`——它们各自有快层无法替代的接缝（真安装/真进程/真浏览器/真通道）。要削的是它们内部的**重复断言**，不是整条资产。

## 6. 优先级与验证

| 档 | 内容 | 成本 | 验证 |
|---|---|---|---|
| P0 | U1 + U2 + U3；A1 runner 落地并跑绿 | 2–4h | `node tests/checks/two-axis-gates.test.mjs` ALL PASS；`node checks/lanes/replay.e2e.mjs` PASS；`smoke:fast` ALL PASS；`pnpm verify` ALL PASS |
| P1 | A3（若 `--refresh` 后仍漂）；A4 的 `company-root-carriers` 负例；更新 pre-push/CI/tests-README 的预算数字 | 半天 | 新负例真红→还原绿；`pnpm test` 仍 ≤ 30s；预算文字 = 实跑数字 |
| P2 | A2（仅复发时）；A5 probe 审计 | 按需 | 不新增慢门；probe 表进研究材料/卡 |
| P3 | 把 §2 四条围栏规则写进 [testing.md](../../../../docs/testing.md) / [tests/README](../../../../tests/README.md) | 按行预算 | `pnpm verify` 绿；不新增索引 |

**本轮不改任何资产**；上表是待用户裁的落卡候选。

## 7. 开放问题

1. **A1 放哪**：第一版 6 条 ~2.4s 放 pre-push（现实的家：CI 不构建 vendor/test）；`replay` 仍手动/每周，稳定后再议。pre-push 已 ~41s（冷分项；热缓存 29.3s），+2.4s 可接受吗？`fresh-clone` 的 setup-macos 每周档是否更适合当第二通道？
2. **replay 的易变面**：`--refresh` 能接受当前漂移，但技能再改还会复发。冻结技能目录会掩盖「技能真的变了」；归一化会掩盖「prompt 真的变了」；重录最诚实但会复发。需要用户选「这条资产证明什么」。
3. **「最后实跑」字段**：只给非 lane 资产（手动/发布/认证）加；快档 6 条由 lane 自动覆盖，不手写日期。这个边界够清楚吗？
4. **门禁负例的边界**：71 个 gate 不可能都配常驻负例；按「失败静默 + 逻辑未被单测覆盖」排序，谁拥有这个排序？
5. **probe 淘汰**：探针是调试面，不是回归面；「没有消费者」是否等于「可以删」需要 owner 判断，不能只看引用数。

## 8. 第二遍复核（2026-11-13）

**确认的**

- 两条红资产在当前 HEAD 可复现：`two-axis-gates-smoke` 2/5 失败；`replay-smoke` 1 项失败（`source run/env.sh` 后同样失败，3.85s）。
- U1 的修法可行：我在临时副本里把 mutation 改成 `zz-no-such-type` 行 / 删 `deliveryMode:`，两个 gate 分别报「宣告了不可执行的类型」和「缺「deliveryMode:」字段」。这不是纸面推演。
- 快层仍健康：`pnpm test` 242 files / 1997 tests / 26.0s；`pnpm verify` 8.3s；分项冷测和 ~41s，热缓存 hook 29–35s（两次实测）。

**修正的**

- **U2 首选 `--refresh`**，不是「重录」：脚本头注写明 headless authored 场景支持无 key 刷新，且 workspace oracle 失败会拒绝；「重录」是 `--record`（真模型），成本高得多。
- **A2 从 P1 降到可选**：`export-dist` 是线性发布工具，核心 swap 已有快 spec；抽 plan 的收益低于成本。
- **A4 收窄**：`write-gate` 已有 `write-gate.spec`，移出候选；只留 `company-root-carriers` 这类「安全面 + 只有一次性红证」的 gate。
- **A1 的首选家改成 pre-push，且第一版只收 6 条**：CI 的 `ci.yml` 不跑 test、也不构建 vendor；cheap smokes 在干净环境跑不动。`replay` 3.9s 且易漂，先不放进每 push 的 lane；否则一次技能改动就会让 lane 红在与本次 push 无关的面上。
- **补一条 suite 预算**：`pnpm test` ≤ 30s；当前 26s 已接近，`company-client-composition` 8.4s 是首要 outlier。没有预算，1.3s→26s 这种漂移就没人发现。
- **预算叙事要实测**：`.githooks/pre-push` / `ci.yml` 的 1.3s 旧读数与当前 26s 差约 20 倍；这不是测试资产本身，但会让「hook 只装便宜检查」的边界失真。

**未变的**

- 不把慢资产拉回 `pnpm test`；不新增 E2E；`release-smoke`/`company-entry`/`client-load` 等接缝资产保留。
- 两条红不是产品回归；先修资产，不动产品代码。

**反证条件（什么情况下这个推荐要改）**

- `--refresh` 后 `replay-smoke` 仍红，或同一处一周内再漂 → 不再维护该场景为 `runnable`，转 `archived` 或冻结注入面。
- `smoke:fast` 的 6 条里出现与本次改动无关的 flake（例如 `company-root-process` 偶发超时）→ 先把该条移出 lane，只留稳定集；lane 只证明「资产还活着」，不证明行为。
- `company-root-carriers` 负例与现有 `tests/host/contract` 重复 → 取消 A4，不为了「有负例」而复制。
- `export-dist` 的 staging 失败再次伤到旧 `_dist` → 再启动 A2，届时先写红 spec 再抽 plan。
