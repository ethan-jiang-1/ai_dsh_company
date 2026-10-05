# 2026-10-05 · RFC：会话日志世代选择修复（毕业拆分 5/6）

> 状态：RFC（已批准待实施；实施次序由用户逐条点名，D32）｜批准：2026-10-05 用户对话拍板（来源 = 推敲卡
> [repository-steerability](../../_backlog/_done/_closed_plans/2026-10-05-repository-steerability.md)
> 毕业；卡立卡时点名三处读取点，毕业核验补第四处——authorship-audit 同病）

## 问题

同一会话目录可能并存 `session.v3.jsonl.zstd` 与 `session.v4.jsonl.zstd`（世代升级期常态）；读取点选择
逻辑各异，读旧世代 = 静默遗漏新事件 = 导出/审计错事实。五处现状（2026-10-05 核验）：

| 读取点 | 现状 | 风险 |
|---|---|---|
| [scripts/tools/snapshot-motion.mjs](../../scripts/tools/snapshot-motion.mjs) L52 | 取第一个 `.jsonl.zstd` 匹配 | readdir 序 ≠ 世代序 |
| [scripts/tools/session-log-export.mjs](../../scripts/tools/session-log-export.mjs) L36 | 优先 `.zstd` 的第一个匹配 | 同上 |
| [scripts/audit/deliverables-check.mjs](../../scripts/audit/deliverables-check.mjs) L109 | 第一个 `.jsonl.zstd` 或 `.jsonl` | 同上 |
| [scripts/audit/authorship-audit.mjs](../../scripts/audit/authorship-audit.mjs) L91 | readdirSync 迭代序最后一个 | 文件系统序，非世代序（毕业核验新增，卡未点名） |
| [scripts/audit/journal-audit.mjs](../../scripts/audit/journal-audit.mjs) L70 | 过滤后字典序取末位 | 单位数世代正确；v10 会排到 v2 前 |

## 方案

1. **统一 helper**（落 [scripts/lib/](../../scripts/lib/)，与既有 session-log 共享模块同层）：给定会话
   目录 → 按**数值**比较世代取最高；缺日志/坏压缩/无法判定世代 → fail loud（不静默回退旧世代）；
   明文 `.jsonl` 与 zstd 双形态保持现有兼容口径。
2. **五处调用点全迁 helper**（含 journal-audit 字典序对齐数值比较）。
3. **fixture 覆盖**（keyless，红→绿先行——测试宪法）：v3+v4 并存（取 v4）、仅 v3、缺失、坏压缩、
   世代号跨两位数（v4+v10 数值序）。

## 输掉的方案（留尸）

- **各脚本各自修**：第四处就是这么冒出来的——同类逻辑分散必然再漂。
- **静默回退旧世代**：fail-loud 是 DSH 全局不变量；审计工具更不能吞错。
- **改写侧强制单世代**：会话写入机制归 vendor，本仓不越界。

## 验收

- fixture 红→绿反证记录进实施 Note（现行实现先红、helper 后绿）。
- 五调用点全迁；同一 v3+v4 并存 fixture 下，导出、snapshot capture、deliverables/authorship/journal
  audit 读到同一权威世代。
- `pnpm test`（keyless focused）+ `pnpm verify` 绿；不新增真模型/浏览器档。
