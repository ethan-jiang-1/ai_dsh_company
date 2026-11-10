---
topic: 仓库卫生
intent: "D4 高腐化面的 notes 分诊（2026-11-03）：A- 收口/客户端错误/v3/CompanyView 的 claim 对账、分类与已执行处方。"
---

# notes 分诊 · 2026-11-03 · D4 高腐化面（A- 收口 / 客户端错误 / v3 / CompanyView）

> 性质：分诊报告（不是 Note）。规则唯一家 = [notes/README](../../../../notes/README.md)；
> 次序与判据 = [notes-consistency-audit skill](../../../../.agents/skills/notes-consistency-audit/SKILL.md)。
> 范围 = 本轮 fresh 复评 D4 命中与 2026-11-03 发布/重构批次；**不是全量 115 篇**。

命令：`node tools/notes-audit.mjs --json`、`pnpm verify`（2026-11-03 10:5x +08）。

## 现行真值（对账用）

| 机制 | 现行 owner |
|---|---|
| 七维评分 | [round5 卡](../../settled_issues/2026-11-03-repo-hygiene-round5.md) 的 fresh 复评（D4 B-，不是全 A-） |
| 页面错误→host 日志 | [D6 断链修复](../../../../notes/archived/2026-11-03-d6-client-error-chain-fix.md) + `checks/smoke/client-error-chain-smoke.mjs` |
| v3 公司盘 / 内容 | [v3 native entry](../../../../notes/implemented/2026-11-01-plugin-as-product-v3-native-entry.md)、`packages/company-pack/content/README.md` |
| CompanyView | 已删；[D2 removal Note](../../../../notes/archived/2026-11-03-d2-companyview-removal.md) |
| 发布 READY | [release.md](../../../../docs/contracts/release.md) §版本纪律（点态） |

## 分类与执行

| Note | 类 | 证据 | 处方 | 目标 owner |
|---|---|---|---|---|
| `2026-11-03-a-minus-closeout`（receipts） | **CONFLICT** | 标题“七维全部 A-” vs fresh 复评 D4 B- / D7 B | 已移 `archived/receipts/` + banner（digest 增补） | round5 卡 |
| `2026-11-03-client-error-durability` | **CONFLICT（部分）** | 只讲落点/持久化；reporter 链当时断 | 已加 banner 指向 D6 修复 | D6 Note |
| `2026-11-03-d6-client-error-chain-fix` | **KEEP** | 有决定/根因/验证/余项 | 补 `## 决定`（audit 的 noDecision 清零） | 自身 |
| `2026-11-03-review-integrity-fixes` | **KEEP** | 两轴 review 修补清单 | 补 `## 决定` | 自身 |
| `2026-10-24-run-bundle-install-unit` | **FIX-FACTS** | 旧 `runtime/rehearsal-workspace/AGENTS.md` 已随 v3 删除 | 已改为“排练场根 AGENTS.md（旧形状，v3 已删）” | v3 Note |
| `2026-10-13-agent-cultivation-loop` / `2026-10-17-cultivation-gui-actions` | **FIX-FACTS** | 仍把 `CompanyView` 当现行入口 | 已就地标“2026-11-03 已删；现行 = 培养页/右栏” | D2 removal Note |
| `2026-10-13-first-run-bootstrap` / `skeleton-shipped` / `2026-10-26-faq24-alignment` | **SUPERSEDED（部分）** | `workspace/**`/符号链接/`<DSH_HOME>/company-workspace` 旧形状 | 已在 Phase 1 加 v3 banner | v3 Note |

## 硬矛盾（已消解）

- 旧：`notes/archived/receipts/2026-11-03-a-minus-closeout.md:1` “七维全部达到 A-”。
  新：`_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md:14` fresh 复评 D1 B+ / D2 B+ / D3 B+ / D4 B- / D5 B+ / D6 A- / D7 B。
  判：**fresh 复评赢**；A- 文只作历史收口，已 banner。

## 机械基线（修后）

```text
noDecision: 0
deadPaths: 0
missingBacklinks: 0
orphans: 70（未分类；见下）
```

## 残余与为什么不一次清完

- **70 篇零入链**：含大量 release 收据（0.7.x/0.8.x）、批次流水、单点实现记录。按 notes/README，
  “目录树 + 全文检索就是清单”，零入链本身不是删除判据；全量分诊需逐篇抽 claim，独立轮做。
- **release 收据**（0.8.0–0.8.4 等）：是否迁 `notes/archived/receipts/` 需用户点头后才能批量移动；
  本轮只固定“发布 Note 保留 READY 行 + tag”的事实落点。
- **v3 之前的机制长文**：决定正文冻结，不改写；只改路径/符号这类事实落点（D38）。

## 防复发

- 同一类“A- 自评被后续复评推翻”第二次出现 → 建议把「发布/收口 Note 必须引用现行复评读数」
  写进 `close-out-definition` 的人审清单；本轮先以 banner + 报告兜。
