# 第二轮打扫卫生：P0 反馈通路落实 + replay 注入面闭环 + notes 归档轮

状态：implemented（2026-10-21；用户授权「P0 反馈通路正确性」+「r3 重录」+「notes/implemented 需要归档的处理」；
审计证据 = [followup research note](../../_backlog/research/repo-hygiene/2026-10-20-followup-six-dimension-audit.md)；前轮 = [consistency sweep](./2026-10-20-fresh-agent-consistency-sweep.md)）

## 决定

1. **BUG-030/031 当场修**（卡与红绿详见 [BUG-030](../../_backlog/_archive/fixed_bugs/BUG-030-diagnose-approval-outcome.md)、
   [BUG-031](../../_backlog/_archive/fixed_bugs/BUG-031-orient-scenario-children-file-shape.md)）：diagnose 审批判读按真 v4
   形状（`{id,outcome}` + asked/decided 按 id 配对拿工具名 + 对象 error 序列化）；orient runBundleView 对 children
   文件形状 statSync 分流。**夹具全部改从真日志取样**（session-1d120f37 原行为样）——想象形状夹具是「套件全绿
   保释错实现」的通道。附带：diagnose `--session` 前缀两态统一（`session-<uuid>` 与裸 uuid 同义，与 orient 对齐）。
2. **replay 注入面闭环四件套**（对「replay 回归网实际 1/10」的结构性回答）：
   ① tests/README 改动面表新增「手册/CHARTER/制度件（`packages/company-pack/workspace/`——会话注入面）」行；
   ② 新门禁 [replay-fixture-freshness](../../checks/gates/replay-fixture-freshness.mjs)（keyless 静态比对
   runnable+full 场景录制注入手册 vs 现行手册；presence 档跳过——其判据本就豁免内容比对）；
   ③ r3 第五次真重录（15s，lead 55 行 + 1 child，随 589d785 后的现行手册刷新）；
   ④ replay-smoke full 档 session 行差异从「截断头预览」改为**字符级首差定位**（charDiff）+ 失败全文落
   `runtime/harness-home/diagnosis/replay-<场景>-<时间>/`；sidecar 失败转储同收（不再 /tmp 固定名）。
3. **notes 归档轮**：31 篇已落地决定迁 `implemented/ → archived/`（78→47）。判据 = notes/README §一生命周期
   （决定已落地 + 现行合同/代码/门禁是权威 + 否决仍能阻止重开）；分诊由独立子代理逐篇提案、主 agent 复核执行；
   删候选 0（78 篇全带实质否决）。同 diff 改链 51 处（md-links 门禁首跑枚举 44 断链 → 修复 → 全绿）。

## 输掉的方案

- **r3 presence 降档保 runnable**：重录路线未采的备选——降档会丢掉 r3 独有的全量形态保真（归一化零 diff +
  sidecar 双判据）；与 2026-10-10 第四次重录时的取舍一致。
- **freshness 门禁连 persona/工具表 sidecar 一起比**：先证伪过手册这一格才扩面——门禁最小化，sidecar 漂移由
  replay-smoke 运行时的 sidecar 判据负责（无复发证据不扩门禁）。
- **decisionOf 保留想象键兼容层**（同时读 decision/answer 与 outcome）：真日志从无第二种形状（v3 日志根本没有
  approval 事件），兼容层只会把「形状再变」静默吞掉——fail-loud 优于宽容。
- **归档时顺手删收据类 note**：分诊逐篇核过「输掉的方案」节，无一跨过删除线；按「拿不准就留」零删除提案
  （删除需单独授权，未获批不做）。
- **按行号手工改链**（不跑门禁兜底）：改用「先 git mv → md-links 门禁枚举全部断链 → 逐处修 → 复绿」——
  机械安全网比人眼誊抄 51 处可靠。

## 后果

- `pnpm verify` 37 门（新增 replay-fixture-freshness）：**改注入源（手册/CHARTER）而不重录/同步夹具，verify 直接红**
  ——「改手册没跑 lane」从三次人工欠账（2026-10-11、10-16、10-20）变成机器拦截。
- replay lane 真实回到 2/10 runnable（r2 presence + r3 full）；r3 的 snapshot.yml 记第五次重录史与带日期资格理由。
- diagnose/orient 反馈通路正确性恢复：审批失败行可读（工具名+结论）、对象错误可序列化、r3 场景视图可用。
- 记忆层活跃面缩小 40%（implemented 78→47 篇）；保留面四类理由（开放项欠账/机制演进中/现行合同委托/判定矩阵
  owner）登记在分诊报告（母卡 research 目录）。
- guard-red-record 门禁 ×24（新增 BUG-030/031 两条守卫声明）。

## 验证（全部实跑）

```text
# 红相（修前实跑）
npx vitest run tests/harness/session-diagnose.spec.ts tests/harness/orient.spec.ts
  # → session-diagnose 4 failed（配对/枚举/孤儿/序列化）；orient 2 failed（真实 r3 ENOTDIR + 夹具文件形状）
node checks/run-gates.mjs        # → FAIL replay-fixture-freshness：r3 注入手册第 153 行与现行不一致（出生事故即负例）
pnpm diagnose --session <公司盘slug>/session-1d120f37   # 修前：FAILURES「approval ? →」「turn 1 error：[object Object]」

# 绿相（修后实跑）
pnpm verify                      # ALL PASS 37 门（含 replay-fixture-freshness ×1 场景 2 处一致、guard-red-record ×24）
pnpm test                        # 77 spec / 721 tests 全绿（新增 replay-fixture-freshness.spec 5 用例 + 守卫扩 2）
node checks/smoke/replay-smoke.mjs --scenario r3-delegation            # ALL PASS（第五次重录后，归一化零 diff，11s）
node checks/smoke/replay-smoke.mjs --scenario r2-motion               # ALL PASS（presence 档，34s，未受本轮影响）
pnpm diagnose --session <公司盘slug>/session-1d120f37   # 修后：FAILURES「approval request_signoff → rejected」
  # （asked 侧 reason「毛利<30% 双签」可对勘）；turn error 渲染为可读 JSON
pnpm orient --scenario replay/r3-delegation             # 完整 run bundle 视图（children=1，不再 ENOTDIR）

# 归档迁移
git mv 31 篇 → md-links 门禁枚举 44 断链 → sed 修 51 处（外引/保留篇→迁移篇/迁移篇→保留篇/archived 互指）
  → pnpm verify ALL PASS；pnpm test 721 全绿
```

未验项：真模型认证档（preset-smoke 之外）本轮未跑（P0 切片不需要）；`--ui` 档未复跑（r3 重录后 ui 金样未刷新——
下一轮跑 replay --ui 时若红属金样陈旧，按头注 `--refresh-ui` 处理）。
