---
status: 调查中
severity: P2
opened: 2026-10-12
---

# BUG-016：converge 自述三处失真——幽灵旗标 --plan、plan 文案、完成 TODO

> 严重级别：P2（次要）｜发现：2026-10-12（f8bc123...HEAD 双轴代码评审，两轴独立命中②）｜状态：调查中

## 症状

1. **幽灵旗标 `--plan`**：[dev-loop §12](../../docs/guides/dev-loop.md)、[checks/README](../../checks/README.md)、
   归档卡都教 `node tools/converge.mjs --plan`；工具头注（:6-10）只定义无参计划模式 + `--slug`/
   `--dry-run`/`--charter-backfill`。传 `--plan` 被静默忽略（「碰巧能跑」），未知旗标一律不报错。
2. **plan 文案与实行两张皮**：plan/dry-run 打印「证据副本…（交付物整目录 + N 篇 journal）」（:131），
   而缺陷 1 修复后 copyEvidence **只拷 journal**（:81-93 及同函数 ⚠ 注释）——双份存储修复改了行为没改文案。
3. **完成 TODO 过时**：converge 完成提示仍打「CHARTER 历史纪要…CLI 不代写」（:135/:196），
   与归档卡 L74 已裁「书写者 = 维护者 CLI（--charter-backfill）」相左——该子命令已落地，提示没跟上。

## 根因（假设→已证）

行为修复轮（缺陷 1、backfill 落地）没跟自述——「修行为不改文案」三连；`--plan` 是文档侧发明的
旗标，违「触发/参数唯一源 = 脚本头注，复述必漂」纪律（根 AGENTS.md 命令表节 + testing.md §1.1）。

## 暴露的失败类

工具自述漂移类。横切排查：本 diff 面内唯一新脚本已扫尽；run-gates 的头注自述检查只覆盖 checks/
脚本，tools/ 不在其列——本卡不扩门禁（三处失真一次修完即可），留意即可。

## 复现

```sh
node tools/converge.mjs --plan --dry-run   # 「证据副本」行含「交付物整目录」（与实行相左）
node tools/converge.mjs --no-such-flag     # 静默按计划模式跑（应报未知旗标）
```

## 修复关联

修法选定：**参数唯一源 = 工具头注**——`--plan` 收编为真旗标或三处文档改无参形式（取其一，一处事实
一个家）+ 未知旗标 fail-loud；:131 文案对齐 journal-only；:135/:196 改指 `--charter-backfill`。
归档卡内的 `--plan` 字样**不追改**（历史稿不追改先例），只改 dev-loop 与 checks/README 两处活文档。

## 已修判定

- 两条复现命令输出反转为预期（plan 行不含「交付物整目录」；未知旗标非零退出）；
- dev-loop:319 与 checks/README:121 的调用式与工具头注逐字一致；
- `pnpm verify` 全绿。
