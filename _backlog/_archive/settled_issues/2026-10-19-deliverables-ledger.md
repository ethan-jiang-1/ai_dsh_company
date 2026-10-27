---
status: 已结
opened: 2026-10-19
---

# 推敲：成品台账——要不要把「公司产出」列成可核对的目录

> 立卡：2026-10-19 ｜ 状态：已结（2026-10-19 用户拍「现在做」；派生索引 + 只读「成品」页签已落地）｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是

## 当前结论（只写 now）

**做了，按派生视图 + 只读页签落地**：

- **数据面**：盘上 `deliverables/` + `deliverables-archive/` 的 `final.md` + `meta.md` ⇒ 纯形状 `tools/lib/deliverables-catalog.mjs` ⇒ 生成器 `tools/deliverables-index.mjs` ⇒ `company-workspace/kb/deliverables-index.json`。当前 **47 份**（**活跃 0 / 归档 47 / 台账外 1** / **present 46 / 未 present 1 / present 未核 0**）。2026-10-20 已收敛 v2 / v3 / lingang / role-kit / private-deploy / token-account-pool / hefeng / kid-ai 八件；private-deploy 先由真 CEO 会话 `session-a87b177b…` 补 `present` 再收敛；hefeng 收口为「判不了」、kid-ai 收口为「已采纳」；light 按用户轻量纪律处置为「已废弃/无 final」，不入目录；唯一未 present/未入台账 = recon-pack（归档 legacy）。`present` 状态由 `deliverables-check --json` 提供（单一判据；不可得时 `presented=null`，面板显示「present 未核」）。
- **页签**：右栏第 9 个公司页签「成品」（guide entry 同步）。统计（含 present / 未 present）→ 全部/活跃/归档/台账外四档筛选 → 按月分组；每行 `结果 tag + slug + 归档/台账外 + 日期·类型 + 一句话结论（2 行 + 全文） + 打开`；「打开」用 `dsh-resource://file/session/...` 在右栏预览 `final.md`。
- **静态索引说真话**：页签头「静态索引 · 生成于 …」+「重读」；不轮询；缺索引/坏 schema 明确提示跑生成器。
- **并列不替代**：动议台账答「决定了什么」，成品目录答「交出了哪些 final」；`present` 背书/审计仍归 [`deliverables-check`](../../../checks/audit/deliverables-check.mjs)。
- **规模事实**：旧卡的「993」是 `deliverables*` 文件数；成品 final 只有 47；动议台账 **47 行/46 ✅** 覆盖 46/47，只剩 1 份台账外（recon-pack；本目录标出来）。

**剩余/触发**：
- 生成索引已接进 `converge`（正常收敛/`--resume` 后自动重建，也可 `node tools/converge.mjs --rebuild-index`）。
- `present` 状态已接入 `deliverables-check --json`；`presented=null` 时显示「present 未核」，不冒充。
- 实时订阅仍未做；需求变强再升 host read model/Remote。

**下一脚**：本卡已收口；索引在收敛后自动重建，新增/归档成品后也可手动 `node tools/deliverables-index.mjs`。

## 本轮实施（2026-10-19）

- **纯逻辑**：`tools/lib/deliverables-catalog.mjs`（只收 final；按 kickoff 倒序；活跃/归档/台账外计数；slug 从 meta 或目录回落）。
- **生成器**：`tools/deliverables-index.mjs`（扫两棵树 + 解析 meta/台账 slug + 跑 `deliverables-check --json` 取 present，写 JSON；无参）。
- **自动重建**：`tools/converge.mjs` 收敛/续跑后自动调用生成器；`--rebuild-index` 可单独跑；纯命令形状在 `converge-rules` spec 钉住。
- **页签**：[`DeliverablesTab.tsx`](../../../packages/company-pack/src/client/DeliverablesTab.tsx) + `company-tab-registration` 第 9 项 + `tab-icons` 的产出箱 glyph；`readCatalog` 走 `remote.workspaceFiles.read('kb/deliverables-index.json')`；`openFinal` 走 `sessionFileAddress` + `sidebarRight.openResource`。
- **UX 顺手修**：页签头标题/按钮 `nowrap` + 新鲜度文案省略号（窄栏不再把「重读/浮出」挤成竖排）；看板标题/guide 的旧「5 秒自动刷新」改「投影更新」。
- **测试**：`tests/harness/deliverables-catalog-tools.spec.ts`（5）+ `tests/client/deliverables-catalog.spec.ts`（8）+ `client-face` 数据面（1）；注册/组合测试同步 9 页签。
- **探针**：[`deliverables-catalog-probe.mjs`](../../../probes/browser-visual/deliverables-catalog-probe.mjs)（真 web；44 行 = 索引；四档筛选；44 个打开；点第一行后 final 正文出现；窄栏可见；`--fixture` 落图）。
- **Note**：[2026-10-19-deliverables-catalog](../../../notes/implemented/2026-10-19-deliverables-catalog.md)｜批次句号：[2026-10-20-company-panel-batch-close](../../../notes/implemented/2026-10-20-company-panel-batch-close.md)。

## 事实与证据（本轮实跑）

| 项 | 结果 | 命令/产物 |
|---|---|---|
| 生成索引 | 47 份 / 活跃 0 / 归档 47 / 台账外 1 / present 46 / 未 present 1 / 未核 0 | `node tools/deliverables-index.mjs`；[deliverables-index.json](../../../company-workspace/kb/deliverables-index.json) |
| present 判据 | 真 CEO present 后 `presented` 43；audit 违规 **0** | `source run/env.sh && node checks/audit/deliverables-check.mjs --json` |
| present 真红清除 | 真 CEO 会话 `session-a87b177b…` 调 `present`（绝对路径）；修 `parseSessionLog` 按 cwd 归一后审计可见 | 会话日志 `deliverables/presented`；新增 audit spec |
| 自动重建 | 收敛/续跑后自动；`--rebuild-index` 单独跑成功 | `node tools/converge.mjs --rebuild-index`；`converge-rules.spec` |
| 纯逻辑红/绿 | 去掉 final 过滤 ⇒ 3 failed / 2 passed；还原 ⇒ 5 passed | `npx vitest run tests/harness/deliverables-catalog-tools.spec.ts` |
| 全量 keyless | 70 files / 695 tests passed | `pnpm test` |
| 结构门禁 | ALL PASS | `pnpm verify` |
| 真挂载 | 零挂载失败 + 品牌在场 | `client-load-smoke`（重建 `lib/` 后） |
| 真 app 目录 | 44 行 = 索引；统计/四档筛选/44 个「打开」；点开 final 正文出现 | `deliverables-catalog-probe --fixture`（ALL PASS） |
| 视觉夹具 | [desktop.png](../../../snapshots/visual/deliverables-catalog/desktop.png) / [narrow.png](../../../snapshots/visual/deliverables-catalog/narrow.png) | `snapshots/visual/deliverables-catalog/` |
| 台账外 | 1 份（recon-pack，归档 legacy）在目录里带「台账外」tag | 同上 |
| 清理收敛 | v2 / v3 / lingang / role-kit / private-deploy / token-account-pool / hefeng / kid-ai 八件收敛；台账 47 行/46 ✅；索引自动重建（活跃 5→0） | `node tools/converge.mjs --slug …`；`--charter-backfill`；`deliverables-check --json` |

## 范围与排除项

- **范围内**：公司级成品目录的产品选择、数据面、与动议台账关系、只读页签、生成器、真 app 证据。
- **范围外**：不改动议台账面板；不新增/重写交付物审计判据；不重写 `present`；不升 vendor；不做编辑/删除/实时订阅；`present` 只显示审计结果，不在此重判。

## 验收标准（本轮已执行）

- [x] **生成器**：只收有 `final.md` 的目录；44 条、活跃/归档/台账外计数正确；坏 meta 不崩（slug 回落/空串）。
- [x] **页签**：行数 = 索引 entries；统计/四档筛选/按月分组/「打开」在场；空态/缺索引/坏 schema 有明确提示。
- [x] **静态索引**：页签头显示生成时间；「重读」不轮询；不假装实时。
- [x] **打开 final**：真 app 点击后正文出现（不是 footer 字样）；地址段级编码。
- [x] **并列不替代**：台账与成品目录各自入口；`present` 审计仍归 `deliverables-check`。
- [x] **注册面**：第 9 个页签/guide/title + 组合测试 9 项；`client-load` 绿。
- [x] 门禁 + `pnpm test` + 探针绿；Note/索引/视觉夹具同步。
- [x] **present 状态**：由 `deliverables-check --json` 提供；不可得显示「present 未核」；真 CEO present 后 43/44（recon-pack 归档 legacy）。
- [x] **自动重建**：接进 `converge`/`--resume`；`--rebuild-index` 单独跑成功；四件真收敛各自触发重建（活跃 5→1）；纯命令形状有 spec。
- [x] **清理收敛**：v2 / v3 / lingang / role-kit / private-deploy / token-account-pool 已入归档家 + 台账行 + CHARTER 纪要；role-kit 类型修为「生产」；审计 0 违规（private-deploy 已真 present；recon-pack 仅 legacy 观察项）。

## 修订史（只追加）

- rev 1 2026-10-19：从已结公司面优先级卡拆出；当时只有「要不要成品台账」的产品问题。
- rev 2 2026-10-19：查清「993 是文件数、final 44、台账已覆盖 39/44」；建议以后做，触发 >60 或多成品成常态。
- rev 3 2026-10-19：用户拍「现在做」；定为派生索引 + 只读页签，不新建 Remote/store。
- rev 4 2026-10-19：落地生成器 + 第 9 页签 + 测试/探针/Note；本卡收口。
- rev 5 2026-10-20：补 `present` 状态（deliverables-check --json 单一判据）与 `converge` 自动重建；本卡事实更新。
- rev 6 2026-10-20：收敛 v2/v3/lingang/role-kit；台账 43 行/42 ✅；活跃 5→1、台账外 5→2；private-deploy present 真红保留。
- rev 7 2026-10-20：真 CEO 会话补 private-deploy 的 present；修 `parseSessionLog` 绝对路径归一；present 43/44、audit 0 违规；recon-pack 仍 legacy。
- rev 8 2026-10-20：private-deploy 收敛入归档；目录活跃 0/归档 44/台账外 1；台账 44/43。
- rev 9 2026-10-20：token-account-pool 收敛入归档（新交付物未 tracked 导致 `git add -A -- from to` fatal；修为按 tracked 选参并补 resume）；目录 45/0/45/1，台账 45/44。
- rev 10 2026-10-20：hefeng 收口（判不了）与 kid-ai 收口（已采纳）后收敛；light 处置已废弃/无 final；目录 47/0/47/1，台账 47/46。

## Review 指南（给 review 的人/Agent）

- **要证伪的假设**：①「993 份成品」——是文件数，final 44；②「目录该实时」——首版是静态索引 + 重读，实时是后续升级；③「台账已够」——台账按动议、目录按 final，且目录把 2 份台账外标出来。
- **口径**：成品 = 有 `final.md`；`present` 背书不由此目录判定，仍看 `deliverables-check`。
- **别做**：不要手改 `kb/deliverables-index.json`（跑生成器）；不要把 `present` 状态塞进首版冒充审计。
