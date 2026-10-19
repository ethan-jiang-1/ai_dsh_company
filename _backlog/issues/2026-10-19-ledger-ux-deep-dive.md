---
status: 等人拍板
opened: 2026-10-19
---

# 推敲：台账面板的 UX 深挖（真数据可读性 → 修/立卡 → 判据）

> 立卡：2026-10-19 ｜ 状态：等人拍板 🔒 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否

## 当前结论（只写 now）

台账面板读 **`kb/motion-ledger.md` 的动议表**（当前 40 行），**不是** 993 份成品；「993」是 `deliverables*` 的文件数（[BUG-025](../_archive/fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md)）。

**真问题**是「**行太长**」，不是「行太多」：最长单行摘要 663 字，超过 120 字（`FULL_TEXT_HINT`）的有 16/40 行。面板本身没有代码缺陷，**本轮实测**：

- 行数：`parseMotionLedger(真文件)` = **40**；面板 1440/390 两档都读到 **40**（`--expected-rows 40` 通过）。
- 全文入口：被两行钳制裁切的行 = 16（1440）/ 27（390），入口数同；无「裁切却无入口」；键盘/鼠标/触屏都能展开/收起。
- 行高：两档 `maxLines=2`，稳定。
- 刷新：台账页签读到「每 30 秒自动刷新」（[看板卡](../_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)统一修掉了 `PanelFrame` 默认 5 秒的错标）。
- 结论：面板的机械面**已经够用**；唯一剩下的是「人读一遍 663 字摘要是否看得完/看错」——这是本卡最后一个人工项。

**未决问题（需要你拍）**：663 字摘要 + 两行钳制 + 全文入口，是否已经够用？
- 你读一行（`role-boundary-diagnosis-2026`，摘要 525 字，约 1 分钟），记步数/秒数；
- 或你同意标「未执行」，本卡带缺口收口（后续真有人读再补）。
- 台账要不要按日期分组/筛选：本轮不做；实测后另开卡。

**下一步：** 你选「我来读」或「标未执行」；然后本卡收口（做/以后做/不做），成品台账归 [新卡](2026-10-19-deliverables-ledger.md)。

## 当前事实（带样本/层）

| 事实 | 数值 | 样本/层 | 取法 |
|---|---|---|---|
| 面板真实数据面 | `kb/motion-ledger.md`（动议表） | 代码接线 | [`index.ts:205`](../../packages/company-pack/src/index.ts#L205) + [`ledger.ts`](../../packages/company-pack/src/lib/ledger.ts) |
| 面板实渲染行数 | **40** = `parseMotionLedger(真文件)` | 真文件 + 真浏览器 | `npx tsx` 解析 + `ledger-summary-probe --expected-rows 40` |
| 单行摘要最长 | **663 字**；超过 120 字的 **16/40** 行 | 真文件实跑 | [调研 §二](../research/company-panels-ux/2026-10-19-panel-truth-audit.md) |
| 行长度已受控 | 是：`-webkit-line-clamp: 2` + 量溢出给「全文」 | 代码 + 真浏览器探针 | [`styles.ts:179-184`](../../packages/company-pack/src/client/styles.ts#L179-L184) + `ledger-summary-probe` |
| 折叠/筛选/搜索/按日期分组 | 无 | 读码 | 面板源码 grep |
| 刷新间隔 | **30 秒**；页签显示「每 30 秒自动刷新」 | 代码 + 真 app 探针 | [`LedgerTab.tsx:28`](../../packages/company-pack/src/client/LedgerTab.tsx#L28) / `ledger-summary-probe` label |
| 公司视图顶部「每 5 秒刷新」 | 已修：推送面显示「投影更新」 | 看板卡 | [`CompanyView.tsx:102`](../../packages/company-pack/src/client/CompanyView.tsx#L102) |
| 「成品」列的 ✅ | 文本代理，不是 D20 的 `present` 机器判据 | 代码 | [`ledger.ts:61`](../../packages/company-pack/src/lib/ledger.ts#L61) |

## 范围与排除项

- **范围内**：动议台账面板的可读性（行数/全文入口/人读计时）；刷新文案的显示结果（owner = 看板卡）。
- **范围外**：**不做成品台账**（已拆 [成品台账](2026-10-19-deliverables-ledger.md)）；不改动议表的信息架构（日期分组/合并列）；不动 `meta.md` 与归档流程；不把 ✅ 文本代理改造成 `present` 判据。

## 验证计划（按现有证据 owner）

0. 前置：`source run/env.sh`；用隔离 web（不另起用户观察窗）跑探针；读探针头注。
1. **行数**：`npx tsx` 读真文件 `parseMotionLedger` 得 N（当前 40）；探针 `--expected-rows N` 断言面板 `metrics.length === N`。**不硬写 40**。
2. **全文入口**：复用 [`ledger-summary-probe --fixture`](../../probes/browser-visual/ledger-summary-probe.mjs)：两行稳定、被裁必有入口、键盘/鼠标/触屏取全文；产物落 `snapshots/visual/ledger-summary`。
3. **人读计时**：从动议表挑一行（如 `role-boundary-diagnosis-2026`，摘要 525 字），读完全文、一句话复述，记步数/秒数。这是本卡唯一人工项；未做就写「未执行」，不冒充绿。
4. **刷新**：台账页签显示「每 30 秒自动刷新」（探针 label 断言）。
5. **收口**：`pnpm verify` + `pnpm test` + 探针复跑（`set -o pipefail`）；结论回填本卡与调研。

## 验收标准（本轮已执行；人读一项待判）

- [x] **行数**：面板行数 = `parseMotionLedger(真文件)` 的输出行数（当前样本 40）；1440/390 两档都一致。
- [x] **全文入口**：被两行钳制裁切的行都有「全文」入口；宽/窄视口行高稳定；键盘/鼠标/触屏都能取到全文（复用探针）。
- [ ] **人读**：「读清一场动议」有步数/秒数记录，结论写明 663 字摘要会不会看不完/看错；未执行则标「未执行」。
- [x] **刷新**：台账页签显示「每 30 秒自动刷新」（owner = 看板卡）。
- [x] **成品口径**：本卡不把 ✅ 文本代理写成 D20 的 present 判据；成品台账归新卡。
- [x] 门禁 + `pnpm test` + 探针复跑绿；记录/索引同步。

## 修订史（只追加）

- rev 1 2026-10-19：立卡；前提 = 台账是「993 条成品、数据最大、成本最低」，据此排 Top 1。
- rev 2 2026-10-19：该前提作废——面板读 40 行动议表（[BUG-025](../_archive/fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md)）；真问题是 663 字单行摘要，不是 993 行平铺。旧「缺折叠/筛选」判据撤回。
- rev 3 2026-10-19 A 收口：当前路径重写为 now；行数判据改动态；补 `PanelFrame` 默认 5 秒的错标事实；成品台账拆出 [新卡](2026-10-19-deliverables-ledger.md)。
- rev 4 2026-10-19：真浏览器探针 1440/390 两档行数 = 40、全文入口 16/27、键盘/鼠标/触屏 PASS、label=30s；看板卡已修默认 5 秒；剩人读计时待用户判。

## Review 指南（给 review 的人/Agent）

- **先证伪「993」**：`find company-workspace/deliverables* -type f | wc -l` 得 993，`parseMotionLedger(kb/motion-ledger.md)` 得 40——两个数都对，问题在旧卡把前者写在后者名下。
- **要证伪的假设（新版）**：①「40 行不多所以没问题」——663 字的单行摘要本身就是问题；②「两行钳制已经够」——机械面已过，剩下的是人读；③「`PanelFrame` 已经说真话」——旧版是假的，现已由看板卡修为 30s。
- **已被证伪、不要再证**：旧版「993 行平铺 / 缺折叠」——行长度已受控、数据不是 993。
- **别看结论看证据**：本卡的「预期」是假设；只有实测数字、探针输出与人读记录算证据。
