---
topic: 仓库卫生
intent: "notes/ 分诊的收据索引：21 篇无持久决定的演练/批次/状态记录，各自证明了什么、现行 owner 在哪、删除后靠什么复核。用于获授权后替换原文（原文归 git 历史）。"
---

# notes 收据 digest · 2026-10-30

> 性质：**证据索引**，不是决定。按 [notes/README §五](../../../../notes/README.md) 的 `receipt` 处置：
> 21 篇原文已 `git mv` 到 `notes/archived/receipts/`（保留正文，不进 `archived/` 否决层）；本文件是唯一索引。
> 机械面基线：`pnpm notes:audit` 报 9 篇收据候选；语义面另判 R3/R4 批次 10 篇、证据簇 2 篇，
> 并排除 2 篇误报（见末节）。

## 一、真实入口/演练证据（11 篇）

| 原文（现 `notes/archived/receipts/`） | 证明了什么 | 现行 owner / 可复核处 |
|---|---|---|
| `2026-10-16-closeout-quality-check` | 真 CEO 会话补收口，撞出 BUG-020（converge 崩在半态） | BUG-020 卡 + `2026-10-16-converge-resume` |
| `2026-10-16-real-motion-verification` | 首次真模型五角色完整动议（role-boundary-diagnosis-2026）自洽 | demo 合同 + `deliverables-check`/`journal-audit` |
| `2026-10-17-material-gate-and-question-channel` | 事实阻塞闸门被真压到；撞出 BUG-021（问询无脚本化应答） | BUG-021 卡 + `2026-10-18-bug021-timed-user-question` |
| `2026-10-17-motion5-question-avoidance` | 问询规避设计成立；其闸门④“逐 T 号锚”结论已被 10-19 推翻 | `2026-10-19-gate4-anchor-granularity`（唯一判据家） |
| `2026-10-17-signoff-chain-drill` | `request_signoff` 双签/双线独立命中首次真压 | 公司手册签字线 + `signoff` 测试 |
| `2026-10-23-entry-probe-baseline` | entry-probe 13/13 机器面基线；240s 时延抖动观察 | `entry-probe-smoke` 头注 + snapshots/probes |
| `2026-10-23-residual-verification` | C 项残差：`/i` 大小写、不追同义词（已进 probe-smoke） | `probes/.../probe-smoke` 代码注释 |
| `2026-10-25-closeout-receipt` | 0.3.3 六卡结清、三 RFC 毕业的批次回执 | 各 RFC/合同；版本历史 = CHANGELOG |
| `2026-10-26-second-machine-simulation` | 冷 store 离线安装 + 浏览器走查 + 0.3.7→0.3.8 迁移 | `release-smoke`/`lifecycle-smoke`；手册已吸收 pnpm 11/12 |
| `2026-10-26-install-risk-register` | 安装/升级“已证/没数”账；部分条目已被后续版本关闭 | `packages/company-pack/README.md` Data/Backup + 各 smoke |
| `2026-10-20-company-panel-batch-close` | 公司面板批次句号（47 件/8 收敛/1 真红） | D44 + 10-19 两篇决定 Note；数字以生成器为准 |

## 二、R3/R4 批次流水（10 篇）

这 10 篇的“决定”都已落进代码/门禁/docs；留下的是进度、行数与一次性的红绿收据。

| 原文（现 `notes/archived/receipts/`） | 批次做了什么 | 现行 owner |
|---|---|---|
| `2026-10-27-r3-batch-a-truth` | 回放/文档/页签计数等真实性止血 | docs + `nav-count-claims`/`pin` 门禁 |
| `2026-10-27-r3-c-first-half-regression` | 回归网与模块抽取 | tests + `src/README` |
| `2026-10-28-r4-batch-a-truth` | 门牌/导航/计数/预算措辞修复 | 各 owner 文档 + 门禁 |
| `2026-10-28-r4-batch-d-tests` | 测试补盲 + 一个真 bug | tests/README + 代码 |
| `2026-10-28-r4-batch-e1-helpers` | 小工具收家 + src-layering 盲区 | `lib/guards.ts`/`lib/text.ts` + gate |
| `2026-10-28-r4-batch-e2-handler` | cultivation handler 首刀 | 代码（后续 r4-p3 已完成） |
| `2026-10-28-r4-batch-e3-host-apply` | host apply 首刀 | 代码 |
| `2026-10-28-r4-batch-e4-board` | board 首刀 | 代码（后续 r4-p3 已完成） |
| `2026-10-28-r4-batch-e5-disclosure` | 三份 README 的“什么时候读” | 三份 README 原文 |
| `2026-10-28-r4-p3-followup` | 四个“以后做”收口 | 代码/tests |

## 三、不删（机械误报或仍有现行判据）

- `2026-10-18-cultivation-firsttimer-audit`：四条的 UX 规则仍现行（破坏性后果在按钮前、字段常驻标签、
  回执用按钮名、不重复摘要）——保留。
- `2026-10-18-cultivation-scenario-audit`：折叠 10/5/5、不搜索/分组、不催 persona 等判据仍现行；
  仅“公司页第四子页”壳体过期（已加 banner）——保留。

## 四、复核方式

- 决定/否决：看各现行 owner（上表右列）与 `notes/archived/`。
- 真跑证据：看 `checks/` 的 smoke/audit 与 `snapshots/` 的合成资产；历史原文 = `git log --all -- <path>`。
- 下次分诊：`pnpm notes:audit` + [notes-consistency-audit](../../../../.agents/skills/notes-consistency-audit/SKILL.md)。
- 失效/重复时再删（git 留历史）；不因“曾经被引用”而续命。
